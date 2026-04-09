import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { MonitorPlay, Loader2, KeyRound, Lock, Users } from "lucide-react";
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

    useEffect(() => {
        const sessionRef = doc(db, "sessions", sessionId);
        setDoc(sessionRef, { createdAt: Date.now(), status: 'waiting', isLocked: false, connectedUsers: [] }, { merge: true });

        const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
            if (docSnap.exists()) setSessionData(docSnap.data());
        });
        return () => unsubscribe();
    }, [sessionId]);

    useEffect(() => {
        if (sessionData?.activeFile?.type.includes('pdf') && sessionData?.activePage) {
            const pageId = `page-${sessionData.activePage}`;
            const element = document.getElementById(pageId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }, [sessionData?.activePage, sessionData?.activeFile?.url]);

    // THE NUCLEAR OPTION: Guaranteed highly visible pure CSS background
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
                <div className="bg-red-500/10 border border-red-500/30 backdrop-blur-2xl px-5 py-2.5 rounded-full flex items-center gap-2.5 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                    <Lock size={14} />
                    <span className="text-[10px] font-black tracking-widest uppercase">Room Locked</span>
                </div>
            )}

            {sessionData?.connectedUsers?.length > 0 && (
                <div className="bg-[#111]/80 border border-white/10 backdrop-blur-2xl px-6 py-5 rounded-3xl flex flex-col gap-3 min-w-[200px] shadow-2xl">
                    <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-3">
                        <Users size={16} className="text-indigo-400" />
                        <span className="text-[10px] font-black text-neutral-500 tracking-widest uppercase">Remotes</span>
                    </div>
                    {sessionData.connectedUsers.map((user, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse"></div>
                            <span className="text-sm font-bold text-white tracking-wide">{user}</span>
                        </div>
                    ))}
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
                        {/* Shimmer effect across the QR container */}
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
                {sessionData.activeFile.type.includes('image') && (
                    <img src={sessionData.activeFile.url} className="max-w-full max-h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-10" />
                )}

                {sessionData.activeFile.type.includes('video') && (
                    <video src={sessionData.activeFile.url} autoPlay controls className="w-full h-full object-contain p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]" />
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