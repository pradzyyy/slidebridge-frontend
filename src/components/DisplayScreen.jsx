import React, { useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { MonitorPlay, Loader2, KeyRound, Lock, Unlock, Users } from "lucide-react";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

const DisplayScreen = ({ sessionId }) => {
    const [sessionData, setSessionData] = useState(null);
    const [numPages, setNumPages] = useState(null);

    const controllerUrl = `${window.location.origin}?sid=${sessionId}&mode=mobile`;
    const videoRef = useRef(null); // NEW: Reference to control the video player

    useEffect(() => {
        const sessionRef = doc(db, "sessions", sessionId);
        setDoc(sessionRef, { createdAt: Date.now(), status: 'waiting', isLocked: false, connectedUsers: [] }, { merge: true });

        const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
            if (docSnap.exists()) {
                setSessionData(docSnap.data());
            } else {
                window.location.href = '/';
            }
        });
        return () => unsubscribe();
    }, [sessionId]);

    // PDF Scroll Logic
    useEffect(() => {
        if (sessionData?.activeFile?.type.includes('pdf') && sessionData?.activePage) {
            const pageId = `page-${sessionData.activePage}`;
            const element = document.getElementById(pageId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, [sessionData?.activePage, sessionData?.activeFile?.url]);

    // NEW: Video Play/Pause Listener
    useEffect(() => {
        if (videoRef.current) {
            if (sessionData?.isPlaying) {
                videoRef.current.play().catch(e => console.log("Auto-play prevented by browser", e));
            } else {
                videoRef.current.pause();
            }
        }
    }, [sessionData?.isPlaying, sessionData?.activeFile]);

    const forceUnlockRoom = async () => {
        try {
            await updateDoc(doc(db, "sessions", sessionId), { isLocked: false });
        } catch (err) {
            console.error("Failed to unlock room:", err);
        }
    };

    const AnimatedBackground = () => (
        <>
            <style>{`
                .cyber-bg {
                    position: fixed;
                    inset: 0;
                    background-color: #030303;
                    z-index: 0;
                    overflow: hidden;
                    pointer-events: none;
                }
                .glow-orb-1 {
                    position: absolute;
                    top: 10%; left: 15%;
                    width: 50vw; height: 50vw;
                    background: radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 60%);
                    border-radius: 50%;
                    animation: floatOrb 12s ease-in-out infinite alternate;
                }
                .glow-orb-2 {
                    position: absolute;
                    bottom: 0%; right: 10%;
                    width: 60vw; height: 60vw;
                    background: radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 60%);
                    border-radius: 50%;
                    animation: floatOrb 15s ease-in-out infinite alternate-reverse;
                }
                .moving-grid {
                    position: absolute;
                    width: 200vw; height: 200vh;
                    top: 20%; left: -50%;
                    background-image: 
                        linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
                    background-size: 50px 50px;
                    transform: perspective(600px) rotateX(75deg);
                    animation: gridMove 10s linear infinite;
                }
                @keyframes gridMove {
                    0% { background-position: 0 0; }
                    100% { background-position: 0 50px; }
                }
                @keyframes floatOrb {
                    0% { transform: translate(0, 0) scale(1); }
                    100% { transform: translate(80px, -80px) scale(1.1); }
                }
            `}</style>
            <div className="cyber-bg">
                <div className="glow-orb-1"></div>
                <div className="glow-orb-2"></div>
                <div className="moving-grid"></div>
            </div>
        </>
    );

    const Roster = () => (
        <div className="absolute top-8 right-8 flex flex-col items-end gap-3 z-50">
            {sessionData?.isLocked && (
                <button
                    onClick={forceUnlockRoom}
                    className="bg-red-500/10 border border-red-500/30 backdrop-blur-2xl px-5 py-2.5 rounded-full flex items-center gap-2.5 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:bg-red-500/20 hover:border-red-500/50 transition-all cursor-pointer group/lock active:scale-95"
                    title="Click to force unlock"
                >
                    <Lock size={14} className="group-hover/lock:hidden" />
                    <Unlock size={14} className="hidden group-hover/lock:block" />
                    <span className="text-[10px] font-black tracking-widest uppercase group-hover/lock:hidden">Room Locked</span>
                    <span className="text-[10px] font-black tracking-widest uppercase hidden group-hover/lock:block">Unlock Room</span>
                </button>
            )}

            {sessionData?.connectedUsers?.length > 0 && (
                <div className="group relative flex flex-col items-end">
                    <div className="bg-[#111]/80 border border-white/10 backdrop-blur-2xl rounded-full group-hover:rounded-3xl transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col max-h-14 group-hover:max-h-[400px] w-14 group-hover:w-56 cursor-default">

                        <div className="flex items-center gap-4 p-4 border-b border-transparent group-hover:border-white/5 transition-colors w-56">
                            <Users size={24} className="text-indigo-400 shrink-0" />
                            <span className="text-[10px] font-black text-neutral-500 tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                Remotes
                            </span>
                        </div>

                        <div className="flex flex-col gap-4 px-6 pb-6 pt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 w-56">
                            {sessionData.connectedUsers.map((user, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse shrink-0"></div>
                                    <span className="text-sm font-bold text-white tracking-wide truncate">{user}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-indigo-500 rounded-full border-2 border-[#050505] group-hover:scale-0 transition-transform duration-300 pointer-events-none"></div>
                </div>
            )}
        </div>
    );

    if (!sessionData?.activeFile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white relative overflow-hidden font-sans">
                <AnimatedBackground />
                <Roster />

                <div className="z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <div className="bg-indigo-500/10 p-5 rounded-full mb-8 border border-indigo-500/20 backdrop-blur-2xl shadow-[0_0_40px_rgba(99,102,241,0.3)]">
                        <MonitorPlay size={48} className="text-indigo-400" />
                    </div>

                    <h1 className="text-7xl font-black mb-12 tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">SlideBridge.</h1>

                    <div className={`bg-[#0a0a0a]/80 backdrop-blur-3xl p-8 rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.8)] border transition-all duration-700 relative overflow-hidden ${sessionData?.isLocked ? 'border-red-500/30 opacity-50 shadow-[0_0_50px_rgba(239,68,68,0.2)]' : 'border-white/10'}`}>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]"></div>
                        <div className="bg-white p-4 rounded-[2rem] relative z-10">
                            <QRCodeSVG value={controllerUrl} size={300} level="H" className="rounded-xl" />
                        </div>
                    </div>

                    <p className="mt-10 text-xl text-neutral-400 font-medium tracking-wide">
                        {sessionData?.isLocked ? 'Room is currently locked' : 'Scan to take control'}
                    </p>

                    <div className="mt-8 group relative cursor-pointer">
                        <div className={`bg-[#050505]/80 border h-16 rounded-full backdrop-blur-2xl transition-all duration-500 flex items-center justify-center min-w-[280px] px-8 shadow-2xl ${sessionData?.isLocked ? 'border-red-500/20 text-red-500/50' : 'border-indigo-500/30 hover:bg-[#111] hover:border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.1)]'}`}>
                            <span className="text-sm font-bold tracking-widest uppercase group-hover:hidden flex items-center gap-3 text-indigo-400">
                                <KeyRound size={18} /> {sessionData?.isLocked ? 'Locked' : 'Hover for Room Code'}
                            </span>
                            {!sessionData?.isLocked && (
                                <div className="hidden group-hover:flex items-center gap-4">
                                    <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Code:</span>
                                    <span className="text-3xl font-black tracking-[0.2em] text-white">{sessionId}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen flex items-center justify-center overflow-hidden selection:bg-indigo-500/30 relative font-sans">
            <AnimatedBackground />
            <Roster />

            <div key={sessionData.activeFile.url} className="w-full h-full flex items-center justify-center z-10 animate-in fade-in zoom-in-95 duration-700">

                {/* NEW: Image Zoom Wrapper */}
                {sessionData.activeFile.type.includes('image') && (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        <img
                            src={sessionData.activeFile.url}
                            className="max-w-full max-h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-10 transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
                            style={{ transform: `scale(${sessionData.zoomLevel || 1})` }}
                        />
                    </div>
                )}

                {/* NEW: Video Player with Ref and hidden default controls */}
                {sessionData.activeFile.type.includes('video') && (
                    <video
                        ref={videoRef}
                        src={sessionData.activeFile.url}
                        className="w-full h-full object-contain p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                    />
                )}

                {sessionData.activeFile.type.includes('pdf') && (
                    <div className="h-screen w-full overflow-y-auto no-scrollbar scroll-smooth flex flex-col items-center pt-10 pb-40">
                        <Document
                            file={sessionData.activeFile.url}
                            onLoadSuccess={({ numPages }) => {
                                setNumPages(numPages);
                                if (sessionData.totalPages !== numPages) setDoc(doc(db, "sessions", sessionId), { totalPages: numPages }, { merge: true });
                            }}
                            loading={
                                <div className="flex flex-col items-center gap-6 mt-60 bg-[#0a0a0a]/90 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                    <Loader2 className="animate-spin text-indigo-500" size={56} />
                                    <p className="text-neutral-400 font-bold tracking-[0.2em] text-xs uppercase">Rendering Document</p>
                                </div>
                            }
                        >
                            {Array.from(new Array(numPages || 1), (el, index) => (
                                <div key={`page-${index + 1}`} id={`page-${index + 1}`} className="mb-12 shadow-[0_40px_80px_rgba(0,0,0,0.8)] transition-all duration-700 ease-in-out border border-white/10 rounded-lg overflow-hidden relative">
                                    <Page pageNumber={index + 1} height={window.innerHeight * 0.90} renderAnnotationLayer={false} renderTextLayer={false} className="bg-white" />
                                </div>
                            ))}
                        </Document>
                    </div>
                )}
            </div>

            <div className="fixed bottom-6 right-6 z-50 group cursor-pointer opacity-30 hover:opacity-100 transition-all duration-500 hover:scale-105">
                <div className="bg-[#111]/90 border border-white/10 rounded-full backdrop-blur-2xl px-6 py-3 flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                    <span className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase group-hover:hidden">Room Code</span>
                    <span className="text-sm font-black tracking-[0.2em] text-indigo-400 hidden group-hover:block">{sessionId}</span>
                </div>
            </div>
        </div>
    );
};

export default DisplayScreen;