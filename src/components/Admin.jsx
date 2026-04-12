import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { ShieldAlert, Trash2, Users, FileText, Lock, Unlock, Activity, ServerCrash, ExternalLink, AlertTriangle } from 'lucide-react';

const Admin = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [activeSessions, setActiveSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [roomToDestroy, setRoomToDestroy] = useState(null);
    const [isCleanModalOpen, setIsCleanModalOpen] = useState(false); // NEW: State for bulk cleanup modal

    const MASTER_PASSWORD = "pradzy";

    useEffect(() => {
        if (!isAuthenticated) return;

        const unsubscribe = onSnapshot(collection(db, "sessions"), (snapshot) => {
            const sessionsData = [];
            snapshot.forEach((doc) => {
                sessionsData.push({ id: doc.id, ...doc.data() });
            });

            sessionsData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setActiveSessions(sessionsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isAuthenticated]);

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === MASTER_PASSWORD) {
            setIsAuthenticated(true);
        } else {
            alert("Access Denied.");
            setPassword("");
        }
    };

    const toggleRoomLock = async (sessionId, currentStatus) => {
        try {
            await updateDoc(doc(db, "sessions", sessionId), { isLocked: !currentStatus });
        } catch (err) {
            console.error("Failed to toggle room lock:", err);
        }
    };

    const confirmDestroyRoom = async () => {
        if (!roomToDestroy) return;
        const sessionToDestroy = roomToDestroy;

        try {
            if (sessionToDestroy.files && sessionToDestroy.files.length > 0) {
                for (const file of sessionToDestroy.files) {
                    if (file.public_id) {
                        await fetch('https://slidebridge-backend.onrender.com/delete-file', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ public_id: file.public_id })
                        }).catch(e => console.error("Cloud wipe failed:", e));
                    }
                }
            }

            await deleteDoc(doc(db, "sessions", sessionToDestroy.id));
            setRoomToDestroy(null);
        } catch (err) {
            console.error("Failed to destroy room:", err);
        }
    };

    // NEW: Function to delete all rooms that have 0 files
    const cleanEmptyRooms = async () => {
        const emptyRooms = activeSessions.filter(session => !session.files || session.files.length === 0);

        for (const room of emptyRooms) {
            try {
                await deleteDoc(doc(db, "sessions", room.id));
            } catch (err) {
                console.error("Failed to delete empty room:", room.id, err);
            }
        }
        setIsCleanModalOpen(false);
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 font-sans selection:bg-indigo-500/30">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#050505] to-[#050505] pointer-events-none"></div>
                <div className="z-10 w-full max-w-sm bg-[#111] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center">
                    <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 border border-indigo-500/20">
                        <ShieldAlert size={36} className="text-indigo-400" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">Command Center</h2>
                    <p className="text-sm text-neutral-500 font-medium text-center mb-8">Enter master override sequence.</p>

                    <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
                        <input
                            type="password"
                            placeholder="PASSWORD"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                            className="w-full bg-[#0a0a0a] border border-white/5 text-white placeholder-neutral-600 text-center font-bold tracking-widest uppercase py-4 rounded-2xl focus:outline-none focus:border-indigo-500/50 transition-all"
                        />
                        <button type="submit" className="w-full bg-white text-[#050505] hover:bg-indigo-400 hover:text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95 tracking-widest uppercase text-xs">
                            Authenticate
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const emptyRoomCount = activeSessions.filter(s => !s.files || s.files.length === 0).length;

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8 font-sans selection:bg-indigo-500/30">

            {/* UPDATED: Translucent Single Destroy Modal */}
            {roomToDestroy && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-[#111] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                            <AlertTriangle size={28} className="text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Destroy Room?</h3>
                        <p className="text-sm text-neutral-400 text-center mb-8 px-2 leading-relaxed">
                            Are you sure you want to terminate room <span className="text-white font-bold">{roomToDestroy.id}</span>? All hosted files will be permanently deleted from the cloud.
                        </p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setRoomToDestroy(null)} className="flex-1 bg-[#1a1a1a] active:scale-95 text-white font-bold py-4 rounded-2xl transition-all border border-white/5 text-sm">
                                Cancel
                            </button>
                            <button onClick={confirmDestroyRoom} className="flex-1 bg-red-600 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-600/20 text-sm">
                                Terminate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW: Translucent Bulk Clean Modal */}
            {isCleanModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-[#111] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 border border-indigo-500/20">
                            <Trash2 size={28} className="text-indigo-400" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Purge Empty Rooms?</h3>
                        <p className="text-sm text-neutral-400 text-center mb-8 px-2 leading-relaxed">
                            This will instantly destroy <span className="text-white font-bold">{emptyRoomCount}</span> inactive rooms that have no uploaded files.
                        </p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setIsCleanModalOpen(false)} className="flex-1 bg-[#1a1a1a] active:scale-95 text-white font-bold py-4 rounded-2xl transition-all border border-white/5 text-sm">
                                Cancel
                            </button>
                            <button onClick={cleanEmptyRooms} className="flex-1 bg-indigo-600 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 text-sm">
                                Purge All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <header className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                        <Activity size={24} className="text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter">System Overview</h1>
                        <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                            {activeSessions.length} Active Sessions
                        </span>
                    </div>
                </div>
                <div className="flex gap-3">
                    {emptyRoomCount > 0 && (
                        <button onClick={() => setIsCleanModalOpen(true)} className="bg-[#111] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/30 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-indigo-400 transition-all active:scale-95 flex items-center gap-2">
                            <Trash2 size={14} /> Purge Empty ({emptyRoomCount})
                        </button>
                    )}
                    <button onClick={() => setIsAuthenticated(false)} className="bg-[#111] hover:bg-[#1a1a1a] border border-white/5 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-all active:scale-95">
                        Lock Terminal
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <Activity size={48} className="animate-pulse text-indigo-500 mb-4" />
                    <span className="text-xs font-bold tracking-widest uppercase text-indigo-400">Scanning Servers...</span>
                </div>
            ) : activeSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 opacity-30 border border-dashed border-white/10 rounded-[2rem] bg-[#0a0a0a]">
                    <ServerCrash size={64} className="mb-6 text-neutral-500" />
                    <h2 className="text-xl font-bold tracking-widest uppercase text-neutral-500">No Active Rooms</h2>
                    <p className="text-sm text-neutral-600 mt-2">All SlideBridge servers are currently idle.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeSessions.map((session) => (
                        <div key={session.id} className="bg-[#111] border border-white/5 rounded-[2rem] p-6 flex flex-col relative overflow-hidden group hover:border-white/10 transition-colors shadow-2xl">

                            {/* Room Header with Interactive Lock Toggle */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em] mb-1 block">Room Code</span>
                                    <h3 className="text-3xl font-black font-mono tracking-widest">{session.id}</h3>
                                </div>
                                <button
                                    onClick={() => toggleRoomLock(session.id, session.isLocked)}
                                    title={session.isLocked ? "Click to Unlock Room" : "Click to Lock Room"}
                                    className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 border transition-all active:scale-95 cursor-pointer hover:opacity-80 ${session.isLocked ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}
                                >
                                    {session.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                                    <span className="text-[9px] font-bold uppercase tracking-widest">{session.isLocked ? 'Locked' : 'Open'}</span>
                                </button>
                            </div>

                            {/* Room Stats */}
                            <div className="flex flex-col gap-3 mb-8 flex-1">
                                <div className="bg-[#0a0a0a] rounded-xl p-3 flex items-center justify-between border border-white/5">
                                    <div className="flex items-center gap-3 text-neutral-400">
                                        <Users size={16} />
                                        <span className="text-xs font-bold uppercase tracking-widest">Remotes</span>
                                    </div>
                                    <span className="text-sm font-bold">{session.connectedUsers?.length || 0}</span>
                                </div>
                                <div className="bg-[#0a0a0a] rounded-xl p-3 flex items-center justify-between border border-white/5">
                                    <div className="flex items-center gap-3 text-neutral-400">
                                        <FileText size={16} />
                                        <span className="text-xs font-bold uppercase tracking-widest">Files Hosted</span>
                                    </div>
                                    <span className="text-sm font-bold">{session.files?.length || 0}</span>
                                </div>

                                {/* User List */}
                                {session.connectedUsers?.length > 0 && (
                                    <div className="mt-2">
                                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Connected Users:</span>
                                        <div className="flex flex-wrap gap-2">
                                            {session.connectedUsers.map((user, i) => (
                                                <span key={i} className="text-[10px] font-bold bg-white/5 px-2.5 py-1 rounded-md text-neutral-300 border border-white/5">{user}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Hosted Files Manifest */}
                                {session.files?.length > 0 && (
                                    <div className="mt-4 border-t border-white/5 pt-4">
                                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Hosted Files:</span>
                                        <div className="flex flex-col gap-2 max-h-32 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                                            {session.files.map((file, i) => (
                                                <a
                                                    key={i}
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-between text-[10px] font-bold bg-[#0a0a0a] hover:bg-white/5 px-3 py-2 rounded-lg text-neutral-300 border border-white/5 transition-colors group/file"
                                                >
                                                    <span className="truncate pr-2">{file.name}</span>
                                                    <ExternalLink size={12} className="text-neutral-500 group-hover/file:text-indigo-400 shrink-0" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Destroy Button */}
                            <button
                                onClick={() => setRoomToDestroy(session)}
                                className="w-full bg-[#0a0a0a] hover:bg-red-600 border border-red-500/20 text-red-500 hover:text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-widest group/btn"
                            >
                                <Trash2 size={16} className="group-hover/btn:animate-pulse" />
                                Force Terminate
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Admin;