import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, onSnapshot, arrayRemove, arrayUnion, deleteDoc } from "firebase/firestore";
import { Upload, ChevronLeft, ChevronRight, Loader2, FileText, PlayCircle, Trash2, MonitorOff, Lock, Unlock, Users, User, AlertTriangle, Power, Play, Pause, ZoomIn, ZoomOut, Rewind, FastForward } from 'lucide-react';

const Controller = ({ sessionId }) => {
    const [session, setSession] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState("");

    const urlName = new URLSearchParams(window.location.search).get('name');
    const storedName = sessionStorage.getItem(`sb_name_${sessionId}`);
    const initialName = urlName || storedName || "";

    const [userName, setUserName] = useState(initialName);
    const [isNameConfirmed, setIsNameConfirmed] = useState(!!initialName);
    const [isLockedOut, setIsLockedOut] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);
    const [isEndingSession, setIsEndingSession] = useState(false);

    const hasJoined = useRef(false);
    const CLOUD_NAME = "dhkeim8bf";
    const UPLOAD_PRESET = "jpdqcfpp";

    useEffect(() => {
        if (isNameConfirmed && userName) {
            sessionStorage.setItem(`sb_name_${sessionId}`, userName);
        }
    }, [isNameConfirmed, userName, sessionId]);

    useEffect(() => {
        if (!sessionId) return;
        const sessionRef = doc(db, "sessions", sessionId);

        const unsub = onSnapshot(sessionRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();

                const hasVipPass = sessionStorage.getItem(`sb_joined_${sessionId}`) === 'true';

                if (data.isLocked && !hasVipPass && !hasJoined.current) {
                    setIsLockedOut(true);
                    return;
                }

                setSession(data);

                if (isNameConfirmed) {
                    if (!hasJoined.current) {
                        hasJoined.current = true;
                        sessionStorage.setItem(`sb_joined_${sessionId}`, 'true');
                    }
                    updateDoc(sessionRef, { connectedUsers: arrayUnion(userName) }).catch(() => { });
                }
            } else {
                window.location.href = '/';
            }
        });

        return () => {
            if (hasJoined.current && userName) {
                updateDoc(sessionRef, { connectedUsers: arrayRemove(userName) }).catch(() => console.log("Cleanup skipped"));
            }
            unsub();
        };
    }, [sessionId, isNameConfirmed, userName]);

    const toggleLock = async () => {
        await updateDoc(doc(db, "sessions", sessionId), { isLocked: !session?.isLocked });
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);

        try {
            let fileToUploadToCloudinary = file;
            let finalFileName = file.name;
            const isOffice = file.name.match(/\.(docx|pptx|xlsx|ppt|doc)$/i);

            if (isOffice) {
                setStatus("Forging PDF...");
                const convertFormData = new FormData();
                convertFormData.append('file', file);

                const convertRes = await fetch(`https://slidebridge-backend.onrender.com/convert`, {
                    method: 'POST',
                    body: convertFormData
                });

                if (!convertRes.ok) throw new Error("Cloud conversion failed");

                const pdfBlob = await convertRes.blob();
                finalFileName = file.name.replace(/\.[^/.]+$/, ".pdf");
                fileToUploadToCloudinary = new File([pdfBlob], finalFileName, { type: 'application/pdf' });
            }

            setStatus("Syncing to Cloud...");
            const cloudFormData = new FormData();
            cloudFormData.append("file", fileToUploadToCloudinary);
            cloudFormData.append("upload_preset", UPLOAD_PRESET);

            const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, {
                method: "POST",
                body: cloudFormData,
            });
            const cloudData = await cloudRes.json();

            const isPdf = finalFileName.endsWith('.pdf');
            const fileData = { name: finalFileName, url: cloudData.secure_url, type: isPdf ? 'application/pdf' : (file.type || 'unknown'), id: Date.now() };

            await updateDoc(doc(db, "sessions", sessionId), { files: arrayUnion(fileData) });
            setUploading(false);
            setStatus("");
        } catch (error) {
            setUploading(false);
            setStatus("Error");
            setTimeout(() => setStatus(""), 2000);
        }
    };

    const stopDisplay = async () => { await updateDoc(doc(db, "sessions", sessionId), { activeFile: null }); };

    const promptDelete = (e, file) => {
        e.stopPropagation();
        setFileToDelete(file);
    };

    const confirmDelete = async () => {
        if (!fileToDelete) return;
        try {
            const updates = { files: arrayRemove(fileToDelete) };
            if (session?.activeFile?.id === fileToDelete.id) {
                updates.activeFile = null;
            }
            await updateDoc(doc(db, "sessions", sessionId), updates);
            setFileToDelete(null);
        } catch (err) { console.error(err); }
    };

    const confirmEndSession = async () => {
        try {
            await deleteDoc(doc(db, "sessions", sessionId));
        } catch (err) {
            console.error("Failed to end session:", err);
        }
    };

    const presentFile = async (file) => {
        await updateDoc(doc(db, "sessions", sessionId), {
            activeFile: file,
            activePage: 1,
            totalPages: null,
            isPlaying: true,
            zoomLevel: 1,
            videoCommand: null // Reset commands
        });
    };

    const changePage = async (dir) => {
        const currentPage = session?.activePage || 1;
        let newPage = Math.max(1, currentPage + dir);
        if (session?.totalPages) newPage = Math.min(newPage, session.totalPages);
        if (newPage !== currentPage) { await updateDoc(doc(db, "sessions", sessionId), { activePage: newPage }); }
    };

    const togglePlayPause = async () => {
        await updateDoc(doc(db, "sessions", sessionId), { isPlaying: !session?.isPlaying });
    };

    // NEW: Fire a seek command to the database
    const seekVideo = async (amount) => {
        await updateDoc(doc(db, "sessions", sessionId), {
            videoCommand: { type: 'seek', amount: amount, id: Date.now() }
        });
    };

    const changeZoom = async (amount) => {
        const currentZoom = session?.zoomLevel || 1;
        let newZoom = currentZoom + amount;
        if (newZoom < 0.5) newZoom = 0.5;
        if (newZoom > 5) newZoom = 5;
        await updateDoc(doc(db, "sessions", sessionId), { zoomLevel: newZoom });
    };

    const getPreviewUrl = (file, page) => {
        if (!file) return "";
        if (file.type.includes('image')) return file.url;
        return file.url.replace('/upload/', `/upload/w_600,pg_${page || 1}/`).replace('.pdf', '.jpg');
    };

    if (isLockedOut) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-[#050505] to-[#050505] pointer-events-none"></div>
                <div className="z-10 w-full max-w-sm bg-[#111] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                        <Lock size={36} className="text-red-500" />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-3 tracking-tighter">Room Locked</h2>
                    <p className="text-sm text-neutral-400 font-medium text-center mb-10 leading-relaxed">The host has secured this session. No new remotes can connect.</p>
                    <button onClick={() => window.location.href = '/'} className="w-full bg-[#1a1a1a] hover:bg-[#222] active:scale-95 text-white font-bold py-4 rounded-2xl transition-all border border-white/5 tracking-widest text-xs uppercase">
                        Return to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans overflow-x-hidden pb-40">

            {isEndingSession && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-[#111] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                            <Power size={28} className="text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">End Presentation?</h3>
                        <p className="text-sm text-neutral-400 text-center mb-8 px-2 leading-relaxed">
                            This will destroy the room and disconnect all remotes and displays immediately.
                        </p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setIsEndingSession(false)} className="flex-1 bg-[#1a1a1a] active:scale-95 text-white font-bold py-4 rounded-2xl transition-all border border-white/5 text-sm">
                                Cancel
                            </button>
                            <button onClick={confirmEndSession} className="flex-1 bg-red-600 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-600/20 text-sm">
                                End Session
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {fileToDelete && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-[#111] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                            <AlertTriangle size={28} className="text-red-500" />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Delete File?</h3>
                        <p className="text-sm text-neutral-400 text-center mb-8 px-2 leading-relaxed">
                            Are you sure you want to remove <span className="text-white font-bold">{fileToDelete.name}</span>?
                        </p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setFileToDelete(null)} className="flex-1 bg-[#1a1a1a] active:scale-95 text-white font-bold py-4 rounded-2xl transition-all border border-white/5 text-sm">
                                Cancel
                            </button>
                            <button onClick={confirmDelete} className="flex-1 bg-red-600 active:scale-95 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-red-600/20 text-sm">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!isNameConfirmed && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl">
                    <div className="w-full max-w-sm bg-[#111] border border-white/10 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                            <User size={36} className="text-indigo-400" />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tighter">Who's controlling?</h2>
                        <p className="text-sm text-neutral-400 font-medium text-center mb-10">Enter your name to take the remote.</p>
                        <form onSubmit={(e) => { e.preventDefault(); if (userName.trim()) setIsNameConfirmed(true); }} className="w-full flex flex-col gap-4">
                            <input type="text" placeholder="YOUR NAME" value={userName} onChange={(e) => setUserName(e.target.value)} maxLength={15} autoFocus required className="w-full bg-[#0a0a0a] border border-white/5 text-white placeholder-neutral-600 text-center font-bold tracking-widest uppercase py-5 rounded-2xl focus:outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all" />
                            <button type="submit" disabled={!userName.trim()} className="w-full bg-indigo-600 disabled:bg-[#1a1a1a] disabled:text-neutral-600 text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 disabled:shadow-none active:scale-95 tracking-widest uppercase text-xs">
                                Join Room
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className={`flex flex-col flex-1 transition-all duration-700 ${(!isNameConfirmed || fileToDelete || isEndingSession) ? 'opacity-20 blur-xl pointer-events-none' : 'opacity-100'}`}>

                {uploading && (
                    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-[#1a1a1a]/90 backdrop-blur-2xl border border-white/10 px-5 py-3 rounded-full flex items-center gap-3 shadow-2xl animate-in slide-in-from-top-4">
                        <Loader2 size={16} className="animate-spin text-indigo-400" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">{status}</span>
                    </div>
                )}

                <header className="px-6 pt-8 pb-6 flex justify-between items-center sticky top-0 bg-[#050505]/80 backdrop-blur-xl z-40 border-b border-white/5">
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black tracking-tighter text-white">SB.</h1>
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 mt-1">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                            {session?.connectedUsers?.length || 1} Connected
                        </span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsEndingSession(true)} className="bg-[#111] border border-white/5 w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 active:bg-red-500/20 active:text-red-500 transition-all text-neutral-400 hover:text-red-500">
                            <Power size={18} />
                        </button>
                        <button onClick={toggleLock} className={`w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition-all border ${session?.isLocked ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-[#111] border-white/5 text-neutral-400 hover:text-white'}`}>
                            {session?.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                        </button>
                        <button onClick={stopDisplay} className="bg-[#111] border border-white/5 w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 active:bg-red-500/20 active:text-red-500 transition-all text-neutral-400 hover:text-white">
                            <MonitorOff size={18} />
                        </button>
                        <label className="bg-indigo-600 w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-indigo-600/20 cursor-pointer">
                            <Upload size={18} className="text-white" />
                            <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.ppt,.pptx,image/*,video/*" />
                        </label>
                    </div>
                </header>

                {session?.activeFile && (
                    <div className="px-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-500 mt-4">
                        <div className="relative w-full aspect-[4/3] bg-[#0a0a0a] rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] flex items-center justify-center group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent pointer-events-none opacity-50"></div>

                            {session.activeFile.type.includes('image') ? (
                                <img src={session.activeFile.url} className="w-full h-full object-contain p-2 drop-shadow-2xl" alt="Preview" />
                            ) : session.activeFile.type.includes('pdf') ? (
                                <img src={getPreviewUrl(session.activeFile, session.activePage)} className="w-full h-full object-contain p-2 drop-shadow-2xl transition-opacity duration-300" alt="Preview" />
                            ) : (
                                <div className="flex flex-col items-center gap-4 opacity-40">
                                    <FileText size={56} className="text-indigo-400" />
                                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Active Document</span>
                                </div>
                            )}

                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/10 shadow-xl">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                <span className="text-[9px] font-bold text-white tracking-widest uppercase">Live View</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="px-6 flex-1">
                    <h3 className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.2em] mb-4 ml-1">Deck Library</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {session?.files?.map((file) => (
                            <div key={file.id} onClick={() => presentFile(file)} className={`relative aspect-square rounded-[1.5rem] overflow-hidden border transition-all duration-300 active:scale-95 cursor-pointer flex flex-col ${session?.activeFile?.id === file.id ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)]' : 'border-white/5 bg-[#111] hover:bg-[#151515]'}`}>
                                <div className="flex-1 flex items-center justify-center opacity-40">
                                    {file.type.includes('image') ? <img src={file.url} className="w-full h-full object-cover" /> : file.type.includes('pdf') ? <FileText size={32} className="text-neutral-400" /> : <PlayCircle size={32} className="text-neutral-400" />}
                                </div>
                                <button onClick={(e) => promptDelete(e, file)} className="absolute top-3 right-3 p-2.5 bg-black/50 hover:bg-red-500 rounded-full backdrop-blur-md transition-all z-10 text-neutral-400 hover:text-white">
                                    <Trash2 size={14} />
                                </button>
                                <div className="p-4 bg-gradient-to-t from-[#050505] to-transparent pt-8">
                                    <p className="text-[10px] font-bold text-white truncate tracking-wide">{file.name}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* THE SHAPE-SHIFTING REMOTE */}
                {session?.activeFile && (
                    <div className="fixed bottom-8 left-0 right-0 px-6 flex justify-center z-50 pointer-events-none">
                        <div className="w-full max-w-[340px] bg-[#111]/90 backdrop-blur-3xl border border-white/10 p-2 rounded-full flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto">

                            {/* PDF CONTROLS */}
                            {session.activeFile.type.includes('pdf') && (
                                <>
                                    <button onClick={() => changePage(-1)} className="w-16 h-16 bg-[#1a1a1a] hover:bg-[#222] rounded-full flex items-center justify-center active:scale-90 transition-all">
                                        <ChevronLeft size={28} className="text-white" />
                                    </button>
                                    <div className="flex flex-col items-center justify-center w-24">
                                        <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-[0.3em] mb-1">Slide</span>
                                        <span className="text-2xl font-black text-white tracking-tighter tabular-nums">
                                            {session.activePage || 1}
                                            {session.totalPages && <span className="text-neutral-600 text-lg ml-0.5 font-semibold">/{session.totalPages}</span>}
                                        </span>
                                    </div>
                                    <button onClick={() => changePage(1)} className="w-16 h-16 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-indigo-600/30">
                                        <ChevronRight size={28} className="text-white" />
                                    </button>
                                </>
                            )}

                            {/* VIDEO CONTROLS WITH 5s SEEK */}
                            {session.activeFile.type.includes('video') && (
                                <>
                                    <button onClick={() => seekVideo(-5)} className="w-16 h-16 bg-[#1a1a1a] hover:bg-[#222] rounded-full flex flex-col items-center justify-center active:scale-90 transition-all group">
                                        <Rewind size={20} className="text-white mb-0.5 group-active:-translate-x-1 transition-transform" />
                                        <span className="text-[9px] font-bold text-neutral-400">-5s</span>
                                    </button>
                                    <div className="flex-1 flex justify-center px-3">
                                        <button onClick={togglePlayPause} className={`w-full h-16 rounded-full flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg ${session.isPlaying ? 'bg-[#1a1a1a] hover:bg-[#222] text-white border border-white/5' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'}`}>
                                            {session.isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                                        </button>
                                    </div>
                                    <button onClick={() => seekVideo(5)} className="w-16 h-16 bg-[#1a1a1a] hover:bg-[#222] rounded-full flex flex-col items-center justify-center active:scale-90 transition-all group">
                                        <FastForward size={20} className="text-white mb-0.5 group-active:translate-x-1 transition-transform" />
                                        <span className="text-[9px] font-bold text-neutral-400">+5s</span>
                                    </button>
                                </>
                            )}

                            {/* IMAGE CONTROLS */}
                            {session.activeFile.type.includes('image') && (
                                <>
                                    <button onClick={() => changeZoom(-0.5)} className="w-16 h-16 bg-[#1a1a1a] hover:bg-[#222] rounded-full flex items-center justify-center active:scale-90 transition-all">
                                        <ZoomOut size={24} className="text-white" />
                                    </button>
                                    <div className="flex flex-col items-center justify-center w-24">
                                        <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-[0.3em] mb-1">Zoom</span>
                                        <span className="text-2xl font-black text-white tracking-tighter tabular-nums">
                                            {Math.round((session.zoomLevel || 1) * 100)}<span className="text-neutral-600 text-lg ml-0.5 font-semibold">%</span>
                                        </span>
                                    </div>
                                    <button onClick={() => changeZoom(0.5)} className="w-16 h-16 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-indigo-600/30">
                                        <ZoomIn size={24} className="text-white" />
                                    </button>
                                </>
                            )}

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Controller;