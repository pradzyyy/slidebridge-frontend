import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import { ShieldAlert, Trash2, Users, FileText, Lock, Unlock, Activity, ServerCrash, ExternalLink, AlertTriangle } from 'lucide-react';
import { CreditPill } from '../App';

const adminCss = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');

    @keyframes adHeaderIn  { from{opacity:0;transform:translateY(-18px)} to{opacity:1;transform:translateY(0)} }
    @keyframes adCardIn    { from{opacity:0;transform:translateY(16px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes adStatIn    { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
    @keyframes adBtnIn     { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    @keyframes adEmptyIn   { from{opacity:0;transform:scale(.96)} to{opacity:.3;transform:scale(1)} }
    @keyframes adPulse     { 0%,100%{opacity:1} 50%{opacity:.3} }
    @keyframes adModalIn   { from{opacity:0;transform:scale(.94) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
    @keyframes adFadeIn    { from{opacity:0} to{opacity:1} }
    @keyframes adCodeIn    { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
    @keyframes adLockBounce { 0%{transform:scale(1)} 40%{transform:scale(.85)} 70%{transform:scale(1.1)} 100%{transform:scale(1)} }

    .ad-card { transition: border-color .2s, box-shadow .2s; }
    .ad-card:hover { box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.4); }
    .ad-lock-btn:active { animation: adLockBounce .22s ease both; }
`;

const Admin = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [activeSessions, setActiveSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [roomToDestroy, setRoomToDestroy] = useState(null);
    const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isMaintenance, setIsMaintenance] = useState(false);

    const MASTER_PASSWORD = "pradzy";

    useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

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

        const unsubSettings = onSnapshot(doc(db, "settings", "system"), (docSnap) => {
            if (docSnap.exists()) {
                setIsMaintenance(docSnap.data().maintenanceMode || false);
            }
        });

        return () => {
            unsubscribe();
            unsubSettings();
        };
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

    const toggleMaintenance = async () => {
        try {
            await setDoc(doc(db, "settings", "system"), { maintenanceMode: !isMaintenance }, { merge: true });
        } catch (err) {
            console.error("Failed to toggle maintenance mode:", err);
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
            <div
                className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 font-sans selection:bg-indigo-500/30"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
                <style>{adminCss}</style>
                <style>{`
                    @keyframes adLoginIn  { from{opacity:0;transform:translateY(28px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
                    @keyframes adIconSpin { 0%{transform:rotate(-8deg) scale(.9);opacity:0} 100%{transform:rotate(0deg) scale(1);opacity:1} }
                    @keyframes adTitleIn  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
                    @keyframes adInputIn  { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
                    @keyframes adBtnIn    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
                    @keyframes adGlowPulse { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0)} 50%{box-shadow:0 0 40px 4px rgba(99,102,241,0.09)} }
                `}</style>

                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#050505] to-[#050505] pointer-events-none" />

                <div
                    className="z-10 w-full max-w-sm bg-[#111] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center"
                    style={{ animation: 'adLoginIn .6s cubic-bezier(.16,1,.3,1) .1s both, adGlowPulse 5s ease-in-out 1s infinite' }}
                >
                    <div
                        className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 border border-indigo-500/20"
                        style={{ animation: 'adIconSpin .6s cubic-bezier(.16,1,.3,1) .35s both' }}
                    >
                        <ShieldAlert size={36} className="text-indigo-400" />
                    </div>

                    <h2
                        className="text-3xl font-black text-white mb-2 tracking-tighter"
                        style={{ animation: 'adTitleIn .5s cubic-bezier(.16,1,.3,1) .45s both', opacity: 0 }}
                    >
                        Command Center
                    </h2>
                    <p
                        className="text-sm text-neutral-500 font-medium text-center mb-8"
                        style={{ animation: 'adTitleIn .5s cubic-bezier(.16,1,.3,1) .52s both', opacity: 0 }}
                    >
                        Enter master override sequence.
                    </p>

                    <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
                        <input
                            type="password"
                            placeholder="PASSWORD"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                            className="w-full bg-[#0a0a0a] border border-white/5 text-white placeholder-neutral-600 text-center font-bold tracking-widest uppercase py-4 rounded-2xl focus:outline-none focus:border-indigo-500/50 transition-all"
                            style={{ animation: 'adInputIn .5s cubic-bezier(.16,1,.3,1) .6s both', opacity: 0 }}
                        />
                        <button
                            type="submit"
                            className="w-full bg-white text-[#050505] hover:bg-indigo-400 hover:text-white font-bold py-4 rounded-2xl transition-all shadow-lg active:scale-95 tracking-widest uppercase text-xs"
                            style={{ animation: 'adBtnIn .5s cubic-bezier(.16,1,.3,1) .68s both', opacity: 0 }}
                        >
                            Authenticate
                        </button>
                    </form>
                </div>

                <CreditPill position="bottom-center" />
            </div>
        );
    }

    const emptyRoomCount = activeSessions.filter(s => !s.files || s.files.length === 0).length;

    return (
        <div className="min-h-screen bg-[#050505] text-white p-8 font-sans selection:bg-indigo-500/30">
            <style>{adminCss}</style>

            {roomToDestroy && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md" style={{ animation: 'adFadeIn .2s ease both' }}>
                    <div className="w-full max-w-sm bg-[#111] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center" style={{ animation: 'adModalIn .35s cubic-bezier(.16,1,.3,1) both' }}>
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                            <AlertTriangle size={28} className="text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Destroy Room?</h3>
                        <p className="text-sm text-neutral-400 text-center mb-8 px-2 leading-relaxed">
                            Are you sure you want to terminate room <span className="text-white font-bold">{roomToDestroy.id}</span>? All hosted files will be permanently deleted from the cloud.
                        </p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setRoomToDestroy(null)} className="flex-1 bg-[#1a1a1a] active:scale-95 text-white font-bold py-4 rounded-2xl transition-all border border-white/5 text-sm">Cancel</button>
                            <button onClick={confirmDestroyRoom} className="flex-1 bg-red-600 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-600/20 text-sm">Terminate</button>
                        </div>
                    </div>
                </div>
            )}

            {isCleanModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md" style={{ animation: 'adFadeIn .2s ease both' }}>
                    <div className="w-full max-w-sm bg-[#111] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center" style={{ animation: 'adModalIn .35s cubic-bezier(.16,1,.3,1) both' }}>
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 border border-indigo-500/20">
                            <Trash2 size={28} className="text-indigo-400" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Purge Empty Rooms?</h3>
                        <p className="text-sm text-neutral-400 text-center mb-8 px-2 leading-relaxed">
                            This will instantly destroy <span className="text-white font-bold">{emptyRoomCount}</span> inactive rooms that have no uploaded files.
                        </p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setIsCleanModalOpen(false)} className="flex-1 bg-[#1a1a1a] active:scale-95 text-white font-bold py-4 rounded-2xl transition-all border border-white/5 text-sm">Cancel</button>
                            <button onClick={cleanEmptyRooms} className="flex-1 bg-indigo-600 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 text-sm">Purge All</button>
                        </div>
                    </div>
                </div>
            )}

            <header
                className="flex justify-between items-center mb-10 border-b border-white/5 pb-6"
                style={{ animation: 'adHeaderIn .55s cubic-bezier(.16,1,.3,1) both' }}
            >
                <div className="flex items-center gap-4">
                    <div
                        className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                        style={{ animation: 'adHeaderIn .55s cubic-bezier(.16,1,.3,1) .06s both' }}
                    >
                        <Activity size={24} className="text-indigo-400" />
                    </div>
                    <div style={{ animation: 'adHeaderIn .55s cubic-bezier(.16,1,.3,1) .1s both' }}>
                        <h1 className="text-3xl font-black tracking-tighter">System Overview</h1>
                        <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" style={{ animation: 'adPulse 2s ease-in-out infinite' }} />
                            {activeSessions.length} Active Sessions
                        </span>
                    </div>
                </div>
                <div className="flex gap-3" style={{ animation: 'adHeaderIn .55s cubic-bezier(.16,1,.3,1) .18s both' }}>
                    <button
                        onClick={toggleMaintenance}
                        className={`border px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${isMaintenance ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20' : 'bg-[#111] border-white/5 hover:border-white/10 text-neutral-400 hover:text-white'}`}
                    >
                        Maintenance: {isMaintenance ? 'ON' : 'OFF'}
                    </button>

                    {emptyRoomCount > 0 && (
                        <button
                            onClick={() => setIsCleanModalOpen(true)}
                            className="bg-[#111] hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/30 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-indigo-400 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Trash2 size={14} /> Purge Empty ({emptyRoomCount})
                        </button>
                    )}
                    <button
                        onClick={() => setIsAuthenticated(false)}
                        className="bg-[#111] hover:bg-[#1a1a1a] border border-white/5 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-all active:scale-95"
                    >
                        Lock Terminal
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <Activity size={48} className="text-indigo-500 mb-4" style={{ animation: 'adPulse 1.4s ease-in-out infinite' }} />
                    <span className="text-xs font-bold tracking-widest uppercase text-indigo-400">Scanning Servers...</span>
                </div>

            ) : activeSessions.length === 0 ? (
                <div
                    className="flex flex-col items-center justify-center py-32 border border-dashed border-white/10 rounded-[2rem] bg-[#0a0a0a]"
                    style={{ animation: 'adEmptyIn .6s cubic-bezier(.16,1,.3,1) .2s both' }}
                >
                    <ServerCrash size={64} className="mb-6 text-neutral-500" />
                    <h2 className="text-xl font-bold tracking-widest uppercase text-neutral-500">No Active Rooms</h2>
                    <p className="text-sm text-neutral-600 mt-2">All SlideBridge servers are currently idle.</p>
                </div>

            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeSessions.map((session, idx) => (
                        <div
                            key={session.id}
                            className="ad-card bg-[#111] border border-white/5 rounded-[2rem] p-6 flex flex-col relative overflow-hidden group hover:border-white/10 shadow-2xl"
                            style={{ animation: `adCardIn .4s cubic-bezier(.16,1,.3,1) both` }}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div style={{ animation: `adCodeIn .4s cubic-bezier(.16,1,.3,1) both` }}>
                                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.2em] mb-1 block">Room Code</span>
                                    <h3 className="text-3xl font-black font-mono tracking-widest">{session.id}</h3>
                                </div>
                                <button
                                    onClick={() => toggleRoomLock(session.id, session.isLocked)}
                                    title={session.isLocked ? "Click to Unlock Room" : "Click to Lock Room"}
                                    className={`ad-lock-btn px-3 py-1.5 rounded-full flex items-center gap-1.5 border transition-all cursor-pointer hover:opacity-80 ${session.isLocked ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}
                                    style={{ animation: `adCodeIn .4s cubic-bezier(.16,1,.3,1) both` }}
                                >
                                    {session.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                                    <span className="text-[9px] font-bold uppercase tracking-widest">{session.isLocked ? 'Locked' : 'Open'}</span>
                                </button>
                            </div>

                            <div className="flex flex-col gap-3 mb-8 flex-1">
                                {[
                                    { icon: <Users size={16} />, label: 'Remotes', value: session.connectedUsers?.length || 0 },
                                    { icon: <FileText size={16} />, label: 'Files Hosted', value: session.files?.length || 0 },
                                ].map(({ icon, label, value }) => (
                                    <div
                                        key={label}
                                        className="bg-[#0a0a0a] rounded-xl p-3 flex items-center justify-between border border-white/5"
                                        style={{ animation: `adStatIn .4s cubic-bezier(.16,1,.3,1) both` }}
                                    >
                                        <div className="flex items-center gap-3 text-neutral-400">
                                            {icon}
                                            <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
                                        </div>
                                        <span className="text-sm font-bold">{value}</span>
                                    </div>
                                ))}

                                {session.connectedUsers?.length > 0 && (
                                    <div className="mt-2" style={{ animation: `adStatIn .4s cubic-bezier(.16,1,.3,1) both` }}>
                                        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest mb-2 block">Connected Users:</span>
                                        <div className="flex flex-wrap gap-2">
                                            {session.connectedUsers.map((user, i) => (
                                                <span key={i} className="text-[10px] font-bold bg-white/5 px-2.5 py-1 rounded-md text-neutral-300 border border-white/5">{user}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {session.files?.length > 0 && (
                                    <div className="mt-4 border-t border-white/5 pt-4" style={{ animation: `adStatIn .4s cubic-bezier(.16,1,.3,1) both` }}>
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

                            <button
                                onClick={() => setRoomToDestroy(session)}
                                className="w-full bg-[#0a0a0a] hover:bg-red-600 border border-red-500/20 text-red-500 hover:text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-widest group/btn"
                                style={{ animation: `adBtnIn .4s cubic-bezier(.16,1,.3,1) both` }}
                            >
                                <Trash2 size={16} className="group-hover/btn:animate-pulse" />
                                Force Terminate
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <CreditPill position="bottom-center" />
        </div>
    );
};

export default Admin;