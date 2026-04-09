import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
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

    // ANIMATED BACKGROUND COMPONENT
    const AnimatedBackground = () => (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#050505]">
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.15, 0.25, 0.15],
                    x: [0, 50, 0],
                    y: [0, -50, 0]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-indigo-600 blur-[150px]"
            />
            <motion.div
                animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.1, 0.2, 0.1],
                    x: [0, -50, 0],
                    y: [0, 50, 0]
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[40%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-violet-600 blur-[150px]"
            />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        </div>
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
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
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

                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: "easeOut" }} className="z-10 flex flex-col items-center">
                    <div className="bg-indigo-500/10 p-5 rounded-full mb-8 border border-indigo-500/20 backdrop-blur-2xl shadow-[0_0_40px_rgba(99,102,241,0.2)]">
                        <MonitorPlay size={48} className="text-indigo-400" />
                    </div>

                    <h1 className="text-7xl font-black mb-12 tracking-tighter text-white drop-shadow-2xl">SlideBridge.</h1>

                    <div className={`bg-[#111]/60 backdrop-blur-3xl p-8 rounded-[3rem] shadow-2xl border transition-all duration-700 ${sessionData?.isLocked ? 'border-red-500/30 opacity-50 shadow-[0_0_50px_rgba(239,68,68,0.1)]' : 'border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.5)]'}`}>
                        <div className="bg-white p-4 rounded-[2rem]">
                            <QRCodeSVG value={controllerUrl} size={300} level="H" className="rounded-xl" />
                        </div>
                    </div>

                    <p className="mt-10 text-xl text-neutral-400 font-medium tracking-wide">
                        {sessionData?.isLocked ? 'Room is currently locked' : 'Scan to take control'}
                    </p>

                    <div className="mt-8 group relative cursor-pointer">
                        <div className={`bg-[#111]/80 border h-16 rounded-full backdrop-blur-2xl transition-all duration-500 flex items-center justify-center min-w-[280px] px-8 shadow-2xl ${sessionData?.isLocked ? 'border-red-500/20 text-red-500/50' : 'border-white/5 hover:bg-[#1a1a1a] hover:border-white/20'}`}>
                            <span className="text-sm font-bold tracking-widest uppercase group-hover:hidden flex items-center gap-3 text-neutral-400">
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
                </motion.div>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen flex items-center justify-center overflow-hidden selection:bg-indigo-500/30 relative font-sans">
            <AnimatedBackground />
            <Roster />

            <AnimatePresence mode="wait">
                <motion.div key={sessionData.activeFile.url} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.7, ease: "easeOut" }} className="w-full h-full flex items-center justify-center z-10">
                    {sessionData.activeFile.type.includes('image') && (
                        <img src={sessionData.activeFile.url} className="max-w-full max-h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-10" />
                    )}

                    {sessionData.activeFile.type.includes('video') && (
                        <video src={sessionData.activeFile.url} autoPlay controls className="w-full h-full object-contain p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]" />
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
                                    <div className="flex flex-col items-center gap-6 mt-60 bg-[#111]/80 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 shadow-2xl">
                                        <Loader2 className="animate-spin text-indigo-500" size={56} />
                                        <p className="text-neutral-400 font-bold tracking-[0.2em] text-xs uppercase">Rendering Document</p>
                                    </div>
                                }
                            >
                                {Array.from(new Array(numPages || 1), (el, index) => (
                                    <div key={`page-${index + 1}`} id={`page-${index + 1}`} className="mb-12 shadow-[0_30px_60px_rgba(0,0,0,0.6)] transition-all duration-700 ease-in-out border border-white/5 rounded-lg overflow-hidden relative">
                                        <Page pageNumber={index + 1} height={window.innerHeight * 0.90} renderAnnotationLayer={false} renderTextLayer={false} className="bg-white" />
                                    </div>
                                ))}
                            </Document>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            <div className="fixed bottom-6 right-6 z-50 group cursor-pointer opacity-20 hover:opacity-100 transition-opacity duration-500">
                <div className="bg-[#111]/80 border border-white/10 rounded-full backdrop-blur-2xl px-6 py-3 flex items-center justify-center shadow-2xl">
                    <span className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase group-hover:hidden">Room Code</span>
                    <span className="text-sm font-black tracking-[0.2em] text-white hidden group-hover:block">{sessionId}</span>
                </div>
            </div>
        </div>
    );
};

export default DisplayScreen;