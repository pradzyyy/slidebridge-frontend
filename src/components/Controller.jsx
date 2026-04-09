import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, onSnapshot, arrayRemove, arrayUnion } from "firebase/firestore";
import { Upload, ChevronLeft, ChevronRight, Loader2, FileText, PlayCircle, Trash2, MonitorOff } from 'lucide-react';

const Controller = ({ sessionId }) => {
    const [session, setSession] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState("");

    const CLOUD_NAME = "dhkeim8bf";
    const UPLOAD_PRESET = "jpdqcfpp";

    useEffect(() => {
        if (!sessionId) return;
        const unsub = onSnapshot(doc(db, "sessions", sessionId), (docSnap) => {
            if (docSnap.exists()) setSession(docSnap.data());
        });
        return () => unsub();
    }, [sessionId]);

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

                const convertRes = await fetch(`http://${window.location.hostname}:5000/convert`, {
                    method: 'POST',
                    body: convertFormData
                });

                if (!convertRes.ok) throw new Error("Local conversion failed");

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

            const fileData = {
                name: finalFileName,
                url: cloudData.secure_url,
                type: isPdf ? 'application/pdf' : (file.type || 'unknown'),
                id: Date.now()
            };

            await updateDoc(doc(db, "sessions", sessionId), {
                files: arrayUnion(fileData)
            });

            setUploading(false);
            setStatus("");
        } catch (error) {
            console.error("Upload error:", error);
            setUploading(false);
            setStatus("Error");
            setTimeout(() => setStatus(""), 2000);
        }
    };

    const stopDisplay = async () => {
        await updateDoc(doc(db, "sessions", sessionId), { activeFile: null });
    };

    const deleteFile = async (e, file) => {
        e.stopPropagation();
        if (!window.confirm(`Delete ${file.name}?`)) return;
        try {
            await updateDoc(doc(db, "sessions", sessionId), {
                files: arrayRemove(file)
            });
        } catch (err) { console.error(err); }
    };

    const presentFile = async (file) => {
        await updateDoc(doc(db, "sessions", sessionId), {
            activeFile: file,
            activePage: 1,
            totalPages: null
        });
    };

    const changePage = async (dir) => {
        const currentPage = session?.activePage || 1;
        let newPage = Math.max(1, currentPage + dir);

        if (session?.totalPages) {
            newPage = Math.min(newPage, session.totalPages);
        }

        if (newPage !== currentPage) {
            await updateDoc(doc(db, "sessions", sessionId), {
                activePage: newPage
            });
        }
    };

    const getPreviewUrl = (file, page) => {
        if (!file) return "";
        if (file.type.includes('image')) return file.url;

        return file.url
            .replace('/upload/', `/upload/w_600,pg_${page || 1}/`)
            .replace('.pdf', '.jpg');
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-6 flex flex-col font-sans overflow-x-hidden selection:bg-indigo-500/30">
            {uploading && (
                <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] bg-indigo-500/90 backdrop-blur-xl border border-indigo-400/30 px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl shadow-indigo-500/20 transition-all">
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">{status}</span>
                </div>
            )}

            <header className="flex justify-between items-center py-4 mb-4">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">SB.</h1>
                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Remote Control</span>
                </div>
                <div className="flex gap-3">
                    <button onClick={stopDisplay} className="bg-neutral-900 border border-white/5 w-12 h-12 rounded-full flex items-center justify-center active:scale-90 active:bg-red-500/20 transition-all shadow-lg">
                        <MonitorOff size={18} className="text-neutral-400" />
                    </button>
                    <label className="bg-indigo-600 border border-indigo-500 w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-indigo-600/20 cursor-pointer">
                        <Upload size={18} className="text-white" />
                        <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.ppt,.pptx,image/*,video/*" />
                    </label>
                </div>
            </header>

            {session?.activeFile && (
                <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="relative w-full aspect-[4/3] bg-neutral-900 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-transparent pointer-events-none"></div>

                        {session.activeFile.type.includes('image') ? (
                            <img src={session.activeFile.url} className="w-full h-full object-contain p-4 drop-shadow-2xl" alt="Preview" />
                        ) : session.activeFile.type.includes('pdf') ? (
                            <img src={getPreviewUrl(session.activeFile, session.activePage)} className="w-full h-full object-contain p-4 drop-shadow-2xl transition-opacity duration-300" alt="Preview" />
                        ) : (
                            <div className="flex flex-col items-center gap-3 opacity-50">
                                <FileText size={48} className="text-indigo-500" />
                                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Active Document</span>
                            </div>
                        )}

                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            <span className="text-[9px] font-bold text-white tracking-widest uppercase">Live</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto pb-48 scrollbar-hide">
                <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] mb-4 ml-2">Media Library</h3>
                <div className="grid grid-cols-2 gap-4">
                    {session?.files?.map((file) => (
                        <div
                            key={file.id}
                            onClick={() => presentFile(file)}
                            className={`relative aspect-square rounded-[2rem] overflow-hidden border transition-all duration-300 active:scale-95 cursor-pointer ${session?.activeFile?.id === file.id
                                    ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-500/20'
                                    : 'border-white/5 bg-neutral-900 shadow-xl hover:border-white/10'
                                }`}
                        >
                            <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                {file.type.includes('image') ? <img src={file.url} className="w-full h-full object-cover" /> :
                                    file.type.includes('pdf') ? <FileText size={32} className="text-neutral-400" /> : <PlayCircle size={32} className="text-neutral-400" />}
                            </div>

                            <button onClick={(e) => deleteFile(e, file)} className="absolute top-3 right-3 p-2.5 bg-black/40 hover:bg-red-500/80 rounded-full backdrop-blur-md transition-colors z-10">
                                <Trash2 size={14} className="text-white" />
                            </button>

                            <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black via-black/80 to-transparent">
                                <p className="text-[11px] font-medium text-white truncate tracking-wide">{file.name}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {session?.activeFile && (
                <div className="fixed bottom-8 left-0 right-0 px-6 flex justify-center z-50">
                    <div className="w-full max-w-[340px] bg-neutral-900/80 backdrop-blur-2xl border border-white/10 p-2.5 rounded-[3rem] flex items-center justify-between shadow-2xl shadow-black">
                        <button onClick={() => changePage(-1)} className="w-16 h-16 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center active:scale-90 transition-all">
                            <ChevronLeft size={28} className="text-white" />
                        </button>

                        <div className="flex flex-col items-center justify-center w-24">
                            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-[0.3em] mb-1">Slide</span>
                            <span className="text-2xl font-black text-white tracking-tighter">
                                {session.activePage || 1}
                                {session.totalPages && <span className="text-neutral-600 text-lg ml-1 font-semibold">/ {session.totalPages}</span>}
                            </span>
                        </div>

                        <button onClick={() => changePage(1)} className="w-16 h-16 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-indigo-600/30">
                            <ChevronRight size={28} className="text-white" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Controller;