import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, onSnapshot, arrayRemove, arrayUnion, deleteDoc } from "firebase/firestore";
import {
    Upload, ChevronLeft, ChevronRight, Loader2, FileText, PlayCircle, Trash2,
    MonitorOff, Lock, Unlock, Users, User, AlertTriangle, Power,
    Play, Pause, ZoomIn, ZoomOut, Rewind, FastForward
} from 'lucide-react';

const Controller = ({ sessionId }) => {
    const [session, setSession] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState("");
    const [mounted, setMounted] = useState(false);

    const urlName = new URLSearchParams(window.location.search).get('name');
    const storedName = sessionStorage.getItem(`sb_name_${sessionId}`);
    const initialName = urlName || storedName || "";

    const [userName, setUserName] = useState(initialName);
    const [isNameConfirmed, setIsNameConfirmed] = useState(!!initialName);
    const [isLockedOut, setIsLockedOut] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);
    const [isEndingSession, setIsEndingSession] = useState(false);
    const [pressedBtn, setPressedBtn] = useState(null); // for spring feedback

    const hasJoined = useRef(false);
    const CLOUD_NAME = "dhkeim8bf";
    const UPLOAD_PRESET = "jpdqcfpp";

    useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

    useEffect(() => {
        if (isNameConfirmed && userName)
            sessionStorage.setItem(`sb_name_${sessionId}`, userName);
    }, [isNameConfirmed, userName, sessionId]);

    useEffect(() => {
        if (!sessionId) return;
        const sessionRef = doc(db, "sessions", sessionId);
        const unsub = onSnapshot(sessionRef, snap => {
            if (snap.exists()) {
                const data = snap.data();
                const hasPass = sessionStorage.getItem(`sb_joined_${sessionId}`) === 'true';
                if (data.isLocked && !hasPass && !hasJoined.current) { setIsLockedOut(true); return; }
                setSession(data);
                if (isNameConfirmed) {
                    if (!hasJoined.current) { hasJoined.current = true; sessionStorage.setItem(`sb_joined_${sessionId}`, 'true'); }
                    updateDoc(sessionRef, { connectedUsers: arrayUnion(userName) }).catch(() => { });
                }
            } else { window.location.href = '/'; }
        });
        return () => {
            if (hasJoined.current && userName)
                updateDoc(sessionRef, { connectedUsers: arrayRemove(userName) }).catch(() => { });
            unsub();
        };
    }, [sessionId, isNameConfirmed, userName]);

    const toggleLock = async () => { await updateDoc(doc(db, "sessions", sessionId), { isLocked: !session?.isLocked }); };

    const handleUpload = async e => {
        const file = e.target.files[0]; if (!file) return;
        setUploading(true);
        try {
            let upload = file, name = file.name;
            const isOffice = file.name.match(/\.(docx|pptx|xlsx|ppt|doc)$/i);
            if (isOffice) {
                setStatus("Forging PDF...");
                const fd = new FormData(); fd.append('file', file);
                const res = await fetch(`https://slidebridge-backend.onrender.com/convert`, { method: 'POST', body: fd });
                if (!res.ok) throw new Error("Conversion failed");
                const blob = await res.blob();
                name = file.name.replace(/\.[^/.]+$/, ".pdf");
                upload = new File([blob], name, { type: 'application/pdf' });
            }
            setStatus("Syncing to cloud...");
            const fd2 = new FormData(); fd2.append("file", upload); fd2.append("upload_preset", UPLOAD_PRESET);
            const res2 = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: "POST", body: fd2 });
            const cloud = await res2.json();
            const isPdf = name.endsWith('.pdf');
            await updateDoc(doc(db, "sessions", sessionId), { files: arrayUnion({ name, url: cloud.secure_url, type: isPdf ? 'application/pdf' : (file.type || 'unknown'), id: Date.now() }) });
            setUploading(false); setStatus("");
        } catch {
            setUploading(false); setStatus("Error"); setTimeout(() => setStatus(""), 2000);
        }
    };

    const stopDisplay = async () => { await updateDoc(doc(db, "sessions", sessionId), { activeFile: null }); };
    const promptDelete = (e, file) => { e.stopPropagation(); setFileToDelete(file); };
    const confirmDelete = async () => {
        if (!fileToDelete) return;
        const updates = { files: arrayRemove(fileToDelete) };
        if (session?.activeFile?.id === fileToDelete.id) updates.activeFile = null;
        await updateDoc(doc(db, "sessions", sessionId), updates);
        setFileToDelete(null);
    };
    const confirmEndSession = async () => { try { await deleteDoc(doc(db, "sessions", sessionId)); } catch (e) { } };

    const presentFile = async file => {
        await updateDoc(doc(db, "sessions", sessionId), { activeFile: file, activePage: 1, totalPages: null, isPlaying: true, zoomLevel: 1, videoCommand: null });
    };
    const changePage = async dir => {
        const cur = session?.activePage || 1;
        let p = Math.max(1, cur + dir);
        if (session?.totalPages) p = Math.min(p, session.totalPages);
        if (p !== cur) await updateDoc(doc(db, "sessions", sessionId), { activePage: p });
    };
    const togglePlayPause = async () => { await updateDoc(doc(db, "sessions", sessionId), { isPlaying: !session?.isPlaying }); };
    const seekVideo = async amount => { await updateDoc(doc(db, "sessions", sessionId), { videoCommand: { type: 'seek', amount, id: Date.now() } }); };
    const changeZoom = async amount => {
        const z = Math.min(5, Math.max(0.5, (session?.zoomLevel || 1) + amount));
        await updateDoc(doc(db, "sessions", sessionId), { zoomLevel: z });
    };
    const getPreviewUrl = (file, page) => {
        if (!file) return "";
        if (file.type.includes('image')) return file.url;
        return file.url.replace('/upload/', `/upload/w_600,pg_${page || 1}/`).replace('.pdf', '.jpg');
    };

    const springPress = (key, fn) => {
        setPressedBtn(key);
        fn();
        setTimeout(() => setPressedBtn(null), 180);
    };

    const css = `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes ctFadeUp    { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ctFadeIn    { from{opacity:0} to{opacity:1} }
        @keyframes ctSlideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ctSheetIn   { from{opacity:0;transform:scale(.94) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes ctPulse     { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes ctSpin      { to{transform:rotate(360deg)} }
        @keyframes ctSpring    { 0%{transform:scale(1)} 40%{transform:scale(.88)} 70%{transform:scale(1.06)} 100%{transform:scale(1)} }
        @keyframes ctBarIn     { from{opacity:0;transform:translateX(-50%) translateY(20px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes ctUploadPop { 0%{opacity:0;transform:translateX(-50%) translateY(-12px) scale(.95)} 100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} }
        @keyframes ctCardIn    { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes ctDotBlink  { 0%,100%{opacity:.2} 50%{opacity:.7} }
        @keyframes ctPreviewIn { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
        @keyframes ctCounterPop{ from{opacity:0;transform:scale(.9)} to{opacity:1;transform:scale(1)} }
    `;

    // ── Locked out ────────────────────────────────────────────────────────────
    if (isLockedOut) return (
        <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Sans',sans-serif" }}>
            <style>{css}</style>
            <div style={{ width: '100%', maxWidth: 320, background: '#0e0e12', border: '1px solid rgba(255,255,255,.07)', borderRadius: 28, padding: '36px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'ctSheetIn .5s cubic-bezier(.16,1,.3,1) both' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(200,50,50,.08)', border: '1px solid rgba(200,50,50,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    <Lock size={28} color="#e05555" />
                </div>
                <p style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.03em', color: '#fff', marginBottom: 8 }}>Room locked</p>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,.35)', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>The host has secured this session. No new controllers can join.</p>
                <button onClick={() => window.location.href = '/'} style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.07)', color: 'rgba(255,255,255,.6)', fontWeight: 600, padding: 14, borderRadius: 16, cursor: 'pointer', fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>Return home</button>
            </div>
        </div>
    );

    // ── Modal sheet helper ────────────────────────────────────────────────────
    const Modal = ({ show, icon, iconColor, title, body, onCancel, onConfirm, confirmLabel }) => !show ? null : (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(24px)', animation: 'ctFadeIn .2s ease both' }}>
            <div style={{ width: '100%', maxWidth: 360, background: '#0e0e12', border: '1px solid rgba(255,255,255,.07)', borderRadius: 28, padding: '36px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'ctSheetIn .35s cubic-bezier(.16,1,.3,1) both' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: `rgba(${iconColor},.08)`, border: `1px solid rgba(${iconColor},.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                    {icon}
                </div>
                <p style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.03em', color: '#fff', marginBottom: 8, textAlign: 'center' }}>{title}</p>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,.35)', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>{body}</p>
                <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                    <button onClick={onCancel} style={{ flex: 1, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', color: 'rgba(255,255,255,.6)', fontWeight: 600, padding: 14, borderRadius: 16, cursor: 'pointer', fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
                    <button onClick={onConfirm} style={{ flex: 1, background: '#c0392b', border: 'none', color: '#fff', fontWeight: 600, padding: 14, borderRadius: 16, cursor: 'pointer', fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#080808', color: '#fff', fontFamily: "'DM Sans',sans-serif", overflowX: 'hidden', paddingBottom: 120 }}>
            <style>{css}</style>

            {/* Modals */}
            <Modal show={isEndingSession} icon={<Power size={26} color="#e05555" />} iconColor="200,50,50" title="End presentation?" body="This destroys the room and disconnects all remotes and displays immediately." onCancel={() => setIsEndingSession(false)} onConfirm={confirmEndSession} confirmLabel="End session" />
            <Modal show={!!fileToDelete} icon={<AlertTriangle size={26} color="#e05555" />} iconColor="200,50,50" title="Delete file?" body={<>Remove <strong style={{ color: 'rgba(255,255,255,.6)' }}>{fileToDelete?.name}</strong> from this session?</>} onCancel={() => setFileToDelete(null)} onConfirm={confirmDelete} confirmLabel="Delete" />

            {/* Name entry modal */}
            {!isNameConfirmed && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(24px)', animation: 'ctFadeIn .25s ease both' }}>
                    <div style={{ width: '100%', maxWidth: 360, background: '#0e0e12', border: '1px solid rgba(255,255,255,.07)', borderRadius: 28, padding: '36px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', animation: 'ctSheetIn .4s cubic-bezier(.16,1,.3,1) both' }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(140,140,240,.08)', border: '1px solid rgba(140,140,240,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <User size={28} color="rgba(180,180,255,.8)" />
                        </div>
                        <p style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.03em', color: '#fff', marginBottom: 8 }}>Who's controlling?</p>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,.35)', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>Enter your name so the host knows who's in the room.</p>
                        <form onSubmit={e => { e.preventDefault(); if (userName.trim()) setIsNameConfirmed(true); }} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <input
                                type="text" placeholder="Your name" value={userName}
                                onChange={e => setUserName(e.target.value)} maxLength={15} autoFocus required
                                style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', color: '#fff', fontSize: 16, fontWeight: 500, textAlign: 'center', letterSpacing: '.05em', padding: 16, borderRadius: 16, outline: 'none', fontFamily: "'DM Sans',sans-serif", transition: 'border-color .2s' }}
                            />
                            <button type="submit" disabled={!userName.trim()} style={{ width: '100%', background: userName.trim() ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.06)', border: 'none', color: userName.trim() ? '#080808' : 'rgba(255,255,255,.2)', fontWeight: 600, padding: 16, borderRadius: 16, cursor: userName.trim() ? 'pointer' : 'default', fontSize: 14, fontFamily: "'DM Sans',sans-serif", transition: 'all .2s' }}>
                                Join room
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Main content — blurred when modal is open */}
            <div style={{ opacity: (!isNameConfirmed || fileToDelete || isEndingSession) ? 0.06 : 1, transition: 'opacity .3s', pointerEvents: (!isNameConfirmed || fileToDelete || isEndingSession) ? 'none' : 'auto' }}>

                {/* Upload toast */}
                {uploading && (
                    <div style={{ position: 'fixed', top: 24, left: '50%', zIndex: 100, background: 'rgba(14,14,18,.96)', border: '1px solid rgba(255,255,255,.08)', padding: '12px 20px', borderRadius: 100, display: 'flex', alignItems: 'center', gap: 10, backdropFilter: 'blur(20px)', animation: 'ctUploadPop .3s cubic-bezier(.16,1,.3,1) both' }}>
                        <Loader2 size={14} color="rgba(180,180,255,.7)" style={{ animation: 'ctSpin 1s linear infinite' }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.5)', letterSpacing: '.15em', textTransform: 'uppercase' }}>{status}</span>
                    </div>
                )}

                {/* Header */}
                <header style={{
                    position: 'sticky', top: 0, zIndex: 40,
                    padding: '20px 20px 16px',
                    background: 'rgba(8,8,8,.88)', backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(255,255,255,.04)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    animation: 'ctSlideDown .5s cubic-bezier(.16,1,.3,1) both',
                }}>
                    <div>
                        <div style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-.04em', color: '#fff' }}>SB<span style={{ opacity: .2 }}>.</span></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', animation: 'ctPulse 2s ease-in-out infinite' }} />
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.3)', letterSpacing: '.15em', textTransform: 'uppercase' }}>{session?.connectedUsers?.length || 1} connected</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {[
                            { key: 'end', icon: <Power size={16} />, action: () => setIsEndingSession(true), danger: false },
                            { key: 'lock', icon: session?.isLocked ? <Lock size={16} /> : <Unlock size={16} />, action: toggleLock, danger: session?.isLocked },
                            { key: 'stop', icon: <MonitorOff size={16} />, action: stopDisplay, danger: false },
                        ].map(({ key, icon, action, danger }) => (
                            <button key={key} onClick={() => springPress(key, action)} style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: danger ? 'rgba(200,50,50,.1)' : 'rgba(255,255,255,.04)', border: `1px solid ${danger ? 'rgba(200,50,50,.2)' : 'rgba(255,255,255,.06)'}`, color: danger ? '#e05555' : 'rgba(255,255,255,.4)', cursor: 'pointer', transition: 'all .15s', transform: pressedBtn === key ? 'scale(.88)' : 'scale(1)', animation: pressedBtn === key ? 'ctSpring .18s ease' : 'none' }}>
                                {icon}
                            </button>
                        ))}
                        <label style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.9)', border: 'none', cursor: 'pointer' }}>
                            <Upload size={16} color="#080808" />
                            <input type="file" style={{ display: 'none' }} onChange={handleUpload} accept=".pdf,.doc,.docx,.ppt,.pptx,image/*,video/*" />
                        </label>
                    </div>
                </header>

                {/* Live preview */}
                {session?.activeFile && (
                    <div style={{ margin: '20px 20px 0', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)', background: '#0a0a0f', aspectRatio: '16/9', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'ctPreviewIn .5s cubic-bezier(.16,1,.3,1) both' }} key={session.activeFile.url}>
                        {session.activeFile.type.includes('image')
                            ? <img src={session.activeFile.url} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} alt="Preview" />
                            : session.activeFile.type.includes('pdf')
                                ? <img src={getPreviewUrl(session.activeFile, session.activePage)} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8, transition: 'opacity .3s' }} alt="Preview" />
                                : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, opacity: .3 }}><FileText size={40} color="rgba(180,180,255,.6)" /><span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.15em', textTransform: 'uppercase', color: '#fff' }}>Active file</span></div>
                        }
                        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.08)', padding: '5px 12px', borderRadius: 100 }}>
                            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', animation: 'ctPulse 1.5s ease-in-out infinite' }} />
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.6)', letterSpacing: '.2em', textTransform: 'uppercase' }}>Live</span>
                        </div>
                    </div>
                )}

                {/* Library */}
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,.18)', letterSpacing: '.2em', textTransform: 'uppercase', padding: '20px 20px 10px' }}>Library</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 20px' }}>
                    {session?.files?.map((file, idx) => {
                        const active = session?.activeFile?.id === file.id;
                        return (
                            <div key={file.id} onClick={() => presentFile(file)} style={{ borderRadius: 18, overflow: 'hidden', border: `1px solid ${active ? 'rgba(180,180,255,.2)' : 'rgba(255,255,255,.05)'}`, background: active ? 'rgba(140,140,220,.08)' : '#0e0e12', cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column', aspectRatio: '1', transition: 'all .2s', animation: `ctCardIn .45s cubic-bezier(.16,1,.3,1) ${idx * .07}s both` }}>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: .35 }}>
                                    {file.type.includes('image') ? <img src={file.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={file.name} />
                                        : file.type.includes('pdf') ? <FileText size={36} color="rgba(180,180,255,.5)" />
                                            : <PlayCircle size={36} color="rgba(180,180,255,.5)" />}
                                </div>
                                <button onClick={e => promptDelete(e, file)} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,.4)', transition: 'all .15s' }}>
                                    <Trash2 size={12} />
                                </button>
                                <div style={{ padding: '10px 12px', background: 'linear-gradient(to top, rgba(0,0,0,.8), transparent)' }}>
                                    <p style={{ fontSize: 10, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '.03em' }}>{file.name}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Remote control bar */}
            {session?.activeFile && (
                <div style={{ position: 'fixed', bottom: 24, left: '50%', zIndex: 50, width: 'calc(100% - 40px)', maxWidth: 340, background: 'rgba(10,10,14,.93)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 100, padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'ctBarIn .5s cubic-bezier(.16,1,.3,1) both' }}>

                    {session.activeFile.type.includes('pdf') && (<>
                        <button onClick={() => springPress('prev', () => changePage(-1))} style={{ width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.7)', cursor: 'pointer', transition: 'transform .15s', transform: pressedBtn === 'prev' ? 'scale(.85)' : 'scale(1)' }}>
                            <ChevronLeft size={24} />
                        </button>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }} key={session.activePage}>
                            <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,.22)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 2, animation: 'ctCounterPop .3s ease both' }}>Slide</span>
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 26, fontWeight: 300, letterSpacing: '-.05em', color: '#fff', lineHeight: 1, animation: 'ctCounterPop .3s ease both' }}>
                                {session.activePage || 1}
                                {session.totalPages && <span style={{ color: 'rgba(255,255,255,.2)', fontSize: 16 }}>/{session.totalPages}</span>}
                            </span>
                        </div>
                        <button onClick={() => springPress('next', () => changePage(1))} style={{ width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.9)', border: 'none', color: '#080808', cursor: 'pointer', transition: 'transform .15s', transform: pressedBtn === 'next' ? 'scale(.85)' : 'scale(1)' }}>
                            <ChevronRight size={24} />
                        </button>
                    </>)}

                    {session.activeFile.type.includes('video') && (<>
                        <button onClick={() => springPress('rw', () => seekVideo(-5))} style={{ width: 60, height: 60, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.7)', cursor: 'pointer', transition: 'transform .15s', transform: pressedBtn === 'rw' ? 'scale(.85)' : 'scale(1)' }}>
                            <Rewind size={18} /><span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: '.05em' }}>−5s</span>
                        </button>
                        <button onClick={() => springPress('play', togglePlayPause)} style={{ flex: 1, height: 60, margin: '0 4px', borderRadius: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: session.isPlaying ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.9)', border: session.isPlaying ? '1px solid rgba(255,255,255,.06)' : 'none', color: session.isPlaying ? 'rgba(255,255,255,.7)' : '#080808', cursor: 'pointer', transition: 'all .2s', transform: pressedBtn === 'play' ? 'scale(.9)' : 'scale(1)' }}>
                            {session.isPlaying ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: 2 }} />}
                        </button>
                        <button onClick={() => springPress('ff', () => seekVideo(5))} style={{ width: 60, height: 60, borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.7)', cursor: 'pointer', transition: 'transform .15s', transform: pressedBtn === 'ff' ? 'scale(.85)' : 'scale(1)' }}>
                            <FastForward size={18} /><span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,.35)', letterSpacing: '.05em' }}>+5s</span>
                        </button>
                    </>)}

                    {session.activeFile.type.includes('image') && (<>
                        <button onClick={() => springPress('zo', () => changeZoom(-0.5))} style={{ width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.06)', color: 'rgba(255,255,255,.7)', cursor: 'pointer', transition: 'transform .15s', transform: pressedBtn === 'zo' ? 'scale(.85)' : 'scale(1)' }}>
                            <ZoomOut size={22} />
                        </button>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80 }} key={session.zoomLevel}>
                            <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,.22)', letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: 2, animation: 'ctCounterPop .3s ease both' }}>Zoom</span>
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 26, fontWeight: 300, letterSpacing: '-.05em', color: '#fff', lineHeight: 1, animation: 'ctCounterPop .3s ease both' }}>
                                {Math.round((session.zoomLevel || 1) * 100)}<span style={{ color: 'rgba(255,255,255,.2)', fontSize: 14 }}>%</span>
                            </span>
                        </div>
                        <button onClick={() => springPress('zi', () => changeZoom(0.5))} style={{ width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.9)', border: 'none', color: '#080808', cursor: 'pointer', transition: 'transform .15s', transform: pressedBtn === 'zi' ? 'scale(.85)' : 'scale(1)' }}>
                            <ZoomIn size={22} />
                        </button>
                    </>)}
                </div>
            )}
        </div>
    );
};

export default Controller;