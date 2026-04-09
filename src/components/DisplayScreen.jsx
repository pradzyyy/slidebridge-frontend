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

    const Roster = () => (
        <div className="absolute top-6 right-6 flex flex-col items-end gap-2 z-50">
            {sessionData?.isLocked && (
                <div className="bg-red-500/20 border border-red-500/50 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 text-red-500">
                    <Lock size={14} />
                    <span className="text-[10px] font-bold tracking-widest uppercase">Room Locked</span>
                </div>
            )}

            {sessionData?.connectedUsers?.length > 0 && (
                <div className="bg-black/40 border border-white/10 backdrop-blur-md px-4 py-3 rounded-2xl flex flex-col gap-2 min-w-[160px]">
                    <div className="flex items-center gap-2 mb-1 border-b border-white/10 pb-2">
                        <Users size={14} className="text-indigo-400" />
                        <span className="text-[9px] font-bold text-neutral-400 tracking-widest uppercase">Connected Remotes</span>
                    </div>
                    {sessionData.connectedUsers.map((user, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            <span className="text-xs font-bold text-white tracking-wide">{user}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    if (!sessionData?.activeFile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-neutral-950 to-neutral-950"></div>

                <Roster />

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="z-10 flex flex-col items-center">
                    <div className="bg-white/5 p-4 rounded-full mb-8 border border-white/10 backdrop-blur-md">
                        <MonitorPlay size={40} className="text-indigo-400" />
                    </div>

                    <h1 className="text-6xl font-black mb-12 tracking-tighter bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">SlideBridge.</h1>

                    <div className={`bg-white p-6 rounded-[2rem] shadow-2xl shadow-indigo-500/10 border-[8px] transition-all duration-500 ${sessionData?.isLocked ? 'border-red-500/50 opacity-50' : 'border-white/5'}`}>
                        <QRCodeSVG value={controllerUrl} size={280} level="H" className="rounded-xl" />
                    </div>

                    <p className="mt-8 text-xl text-neutral-400 font-medium tracking-wide">
                        {sessionData?.isLocked ? 'Room is currently locked' : 'Scan QR to connect remote'}
                    </p>

                    <div className="mt-6 group relative cursor-pointer">
                        <div className={`bg-white/5 border h-14 rounded-full backdrop-blur-md transition-all duration-300 flex items-center justify-center min-w-[240px] px-6 ${sessionData?.isLocked ? 'border-red-500/20 text-red-500/50' : 'border-white/10 group-hover:bg-indigo-500/20 group-hover:border-indigo-500/50'}`}>
                            <span className="text-sm font-bold tracking-widest uppercase group-hover:hidden flex items-center gap-2">
                                <KeyRound size={16} /> {sessionData?.isLocked ? 'Locked' : 'Hover for Room Code'}
                            </span>
                            {!sessionData?.isLocked && (
                                <div className="hidden group-hover:flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Code:</span>
                                    <span className="text-2xl font-black tracking-[0.2em] text-white">{sessionId}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="w-screen h-screen bg-neutral-950 flex items-center justify-center overflow-hidden selection:bg-indigo-500/30 relative">
            <Roster />

            <AnimatePresence mode="wait">
                <motion.div key={sessionData.activeFile.url} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.5, ease: "easeOut" }} className="w-full h-full flex items-center justify-center">
                    {sessionData.activeFile.type.includes('image') && (
                        <img src={sessionData.activeFile.url} className="max-w-full max-h-full object-contain drop-shadow-2xl" />
                    )}

                    {sessionData.activeFile.type.includes('video') && (
                        <video src={sessionData.activeFile.url} autoPlay controls className="w-full h-full object-contain" />
                    )}

                    {sessionData.activeFile.type.includes('pdf') && (
                        <div className="h-screen w-full overflow-y-auto no-scrollbar scroll-smooth flex flex-col items-center bg-neutral-950 pt-8 pb-40">
                            <Document
                                file={sessionData.activeFile.url}
                                onLoadSuccess={({ numPages }) => {
                                    setNumPages(numPages);
                                    if (sessionData.totalPages !== numPages) setDoc(doc(db, "sessions", sessionId), { totalPages: numPages }, { merge: true });
                                }}
                                loading={
                                    <div className="flex flex-col items-center gap-4 mt-40">
                                        <Loader2 className="animate-spin text-indigo-500" size={40} />
                                        <p className="text-neutral-500 font-medium tracking-widest text-sm uppercase">Rendering Document</p>
                                    </div>
                                }
                            >
                                {Array.from(new Array(numPages || 1), (el, index) => (
                                    <div key={`page-${index + 1}`} id={`page-${index + 1}`} className="mb-8 shadow-2xl shadow-black/50 transition-all duration-700 ease-in-out border border-white/5">
                                        <Page pageNumber={index + 1} height={window.innerHeight * 0.92} renderAnnotationLayer={false} renderTextLayer={false} className="bg-white" />
                                    </div>
                                ))}
                            </Document>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            <div className="fixed bottom-4 right-4 z-50 group cursor-pointer opacity-30 hover:opacity-100 transition-opacity duration-300">
                <div className="bg-black/60 border border-white/10 rounded-full backdrop-blur-md px-4 py-2 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase group-hover:hidden">Room Code</span>
                    <span className="text-xs font-black tracking-[0.2em] text-white hidden group-hover:block">{sessionId}</span>
                </div>
            </div>
        </div>
    );
};

export default DisplayScreen;