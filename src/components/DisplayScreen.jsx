import React, { useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayRemove } from "firebase/firestore";
import { QRCodeSVG } from "qrcode.react";
import { MonitorPlay, Loader2, KeyRound, Lock, Unlock, Users, X } from "lucide-react";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

const ParticleField = () => {
    const ref = useRef(null);
    useEffect(() => {
        const canvas = ref.current; if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let id;
        let W = canvas.width = window.innerWidth;
        let H = canvas.height = window.innerHeight;
        const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize);
        const pts = Array.from({ length: 60 }, () => ({
            x: Math.random() * W, y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
            r: Math.random() * 1.2 + 0.3, a: Math.random() * 0.3 + 0.08,
        }));
        const tick = () => {
            ctx.clearRect(0, 0, W, H);
            for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
                const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < 140) { ctx.beginPath(); ctx.strokeStyle = `rgba(160,160,220,${0.055 * (1 - d / 140)})`; ctx.lineWidth = 0.5; ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke(); }
            }
            pts.forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(190,190,255,${p.a})`; ctx.fill();
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
                if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
            });
            id = requestAnimationFrame(tick);
        };
        tick();
        return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize); };
    }, []);
    return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.65 }} />;
};

const BreathingRings = () => (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', zIndex: 0 }}>
        {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
                position: 'absolute', borderRadius: '50%',
                width: `${340 + i * 80}px`, height: `${340 + i * 80}px`,
                top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                border: '1px solid rgba(160,160,255,0.07)',
                animation: `dsRingPulse 3.2s ease-out ${i * 0.55}s infinite`,
            }} />
        ))}
    </div>
);

// ── THE NEW MINIMAL TEXT CREDIT ──
const MinimalCredit = () => {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <a
            href="https://www.linkedin.com/in/pradyumnpandhurnekar/"
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '11px',
                fontWeight: 600,
                color: isHovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)',
                textDecoration: 'none',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.3s ease',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}
        >
            <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '13px',
                fontStyle: 'italic',
                fontWeight: 700,
                color: isHovered ? 'rgba(140,140,255,0.8)' : 'rgba(140,140,255,0.3)',
                textTransform: 'none',
                transition: 'color 0.3s ease'
            }}>/p</span>
            <span style={{ marginTop: '1px' }}>built by pradzyyy</span>
        </a>
    );
};

const DisplayScreen = ({ sessionId }) => {
    const [sessionData, setSessionData] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [mounted, setMounted] = useState(false);
    const [fileTransition, setFileTransition] = useState(false);
    const prevUrlRef = useRef(null);
    const videoRef = useRef(null);
    const lastCmdRef = useRef(null);

    const controllerUrl = `${window.location.origin}?sid=${sessionId}&mode=mobile`;

    useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

    useEffect(() => {
        const sessionRef = doc(db, "sessions", sessionId);
        setDoc(sessionRef, { createdAt: Date.now(), status: 'waiting', isLocked: false, connectedUsers: [] }, { merge: true });
        const unsub = onSnapshot(sessionRef, snap => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.activeFile?.url !== prevUrlRef.current) {
                    setFileTransition(true);
                    setTimeout(() => setFileTransition(false), 700);
                    prevUrlRef.current = data.activeFile?.url || null;
                }
                setSessionData(data);
            } else { window.location.href = '/'; }
        });
        return () => unsub();
    }, [sessionId]);

    useEffect(() => {
        if (sessionData?.activeFile?.type.includes('pdf') && sessionData?.activePage) {
            document.getElementById(`page-${sessionData.activePage}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [sessionData?.activePage, sessionData?.activeFile?.url]);

    useEffect(() => {
        if (!videoRef.current) return;
        if (sessionData?.isPlaying) videoRef.current.play().catch(() => { });
        else videoRef.current.pause();
    }, [sessionData?.isPlaying, sessionData?.activeFile]);

    useEffect(() => {
        if (videoRef.current && sessionData?.videoCommand) {
            const { type, amount, id } = sessionData.videoCommand;
            if (type === 'seek' && id !== lastCmdRef.current) {
                videoRef.current.currentTime += amount;
                lastCmdRef.current = id;
            }
        }
    }, [sessionData?.videoCommand]);

    const forceUnlockRoom = async () => {
        try { await updateDoc(doc(db, "sessions", sessionId), { isLocked: false }); } catch (e) { }
    };

    const kickUser = async (userToKick) => {
        try {
            await updateDoc(doc(db, "sessions", sessionId), {
                connectedUsers: arrayRemove(userToKick)
            });
        } catch (err) {
            console.error("Failed to kick user:", err);
        }
    };

    const css = `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&family=Poppins:ital,wght@0,400;0,700;0,800;1,700;1,800&display=swap');
        *{box-sizing:border-box;}
        @keyframes dsScan { 0%{top:-2px;opacity:0} 3%{opacity:1} 97%{opacity:1} 100%{top:100%;opacity:0} }
        @keyframes dsOrb1 { 0%{transform:translate(0,0) scale(1)} 100%{transform:translate(55px,-45px) scale(1.06)} }
        @keyframes dsOrb2 { 0%{transform:translate(0,0) scale(1)} 100%{transform:translate(-40px,35px) scale(1.04)} }
        @keyframes dsFadeUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dsLetterDrop { from{opacity:0;transform:translateY(-16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dsTagline { from{opacity:0;letter-spacing:.4em} to{opacity:1;letter-spacing:.2em} }
        @keyframes dsPulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes dsSpin { to{transform:rotate(360deg)} }
        @keyframes dsRingPulse { 0%{transform:translate(-50%,-50%) scale(.85);opacity:.5} 70%{opacity:.06} 100%{transform:translate(-50%,-50%) scale(1.3);opacity:0} }
        @keyframes dsCornerGlow { 0%,100%{border-color:rgba(255,255,255,.14)} 50%{border-color:rgba(180,180,255,.5)} }
        @keyframes dsQrFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes dsFlash { 0%{opacity:0} 15%{opacity:1} 100%{opacity:0} }
        @keyframes dsCounterPop { from{opacity:0;transform:translateY(5px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes dsDotBlink { 0%,100%{opacity:.2} 50%{opacity:.7} }
        .sb-display{font-family:'DM Sans',sans-serif;}
        .no-scrollbar::-webkit-scrollbar{display:none;}
        .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none;}

        .ds-roster-wrap {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }
        .ds-roster-pill {
            cursor: pointer;
            display: flex;
            align-items: center;
            background: rgba(14,14,18,0.85);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 100px;
            backdrop-filter: blur(20px);
            height: 36px;
            padding: 0 14px;
            gap: 0;
            transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
            position: relative;
            z-index: 2;
        }
        .ds-roster-wrap:hover .ds-roster-pill {
            background: rgba(30,30,40,0.95);
            border-color: rgba(255,255,255,0.15);
            padding: 0 20px;
            gap: 10px; 
        }
        .ds-roster-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #4ade80;
            animation: dsPulse 2s ease-in-out infinite;
            flex-shrink: 0;
        }
        .ds-roster-text {
            display: flex;
            align-items: center;
            gap: 8px;
            max-width: 0;
            opacity: 0;
            overflow: hidden;
            white-space: nowrap;
            transition: max-width 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s;
        }
        .ds-roster-wrap:hover .ds-roster-text {
            max-width: 120px;
            opacity: 1;
        }
        
        .ds-roster-dropdown-wrap {
            position: absolute;
            top: 100%;
            right: 0;
            padding-top: 8px; 
            opacity: 0;
            pointer-events: none;
            transform: translateY(-10px);
            transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
            z-index: 3;
        }
        .ds-roster-wrap:hover .ds-roster-dropdown-wrap {
            opacity: 1;
            pointer-events: auto;
            transform: translateY(0);
        }
        .ds-roster-dropdown {
            background: rgba(14,14,18,0.95);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 16px;
            padding: 8px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            width: max-content;
            min-width: 180px;
            backdrop-filter: blur(20px);
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        .ds-roster-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            border-radius: 10px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.03);
            transition: all 0.2s;
        }
        .ds-roster-item:hover {
            background: rgba(255,255,255,0.06);
            border-color: rgba(255,255,255,0.1);
        }
        .ds-kick-btn {
            background: transparent;
            border: none;
            color: rgba(255,255,255,0.3);
            cursor: pointer;
            padding: 4px;
            border-radius: 6px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .ds-kick-btn:hover {
            background: rgba(239,68,68,0.15);
            color: #ef4444;
        }
    `;

    const Background = () => (
        <>
            <style>{css}</style>
            <div style={{ position: 'fixed', inset: 0, background: '#080808', zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', width: '70vw', height: '70vw', top: '-15%', left: '-10%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(100,100,210,.07) 0%,transparent 65%)', animation: 'dsOrb1 20s ease-in-out infinite alternate' }} />
                <div style={{ position: 'absolute', width: '60vw', height: '60vw', bottom: '-15%', right: '-5%', borderRadius: '50%', background: 'radial-gradient(circle,rgba(120,60,200,.05) 0%,transparent 65%)', animation: 'dsOrb2 26s ease-in-out infinite alternate-reverse' }} />
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.016) 1px,transparent 1px)', backgroundSize: '80px 80px' }} />
            </div>
            <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,rgba(140,140,255,.11),transparent)', animation: 'dsScan 10s linear infinite' }} />
            </div>
        </>
    );

    const Roster = () => (
        <div style={{ position: 'absolute', top: 32, right: 32, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
            {sessionData?.isLocked && (
                <button onClick={forceUnlockRoom} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(200,50,50,.08)', border: '1px solid rgba(200,50,50,.2)', padding: '10px 20px', borderRadius: 100, color: '#e05555', fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', cursor: 'pointer', backdropFilter: 'blur(20px)', animation: 'dsFadeUp .4s ease both' }}>
                    <Lock size={13} /> Room locked — click to unlock
                </button>
            )}

            {sessionData?.connectedUsers?.length > 0 && (
                <div className="ds-roster-wrap" style={{ animation: 'dsFadeUp .4s .1s ease both' }}>

                    <div className="ds-roster-pill">
                        <div className="ds-roster-dot" />
                        <div className="ds-roster-text">
                            <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,.4)' }}>Remotes</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{sessionData.connectedUsers.length}</span>
                        </div>
                    </div>

                    <div className="ds-roster-dropdown-wrap">
                        <div className="ds-roster-dropdown">
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.3)', letterSpacing: '.15em', textTransform: 'uppercase', padding: '4px 8px 8px' }}>Connected Devices</span>
                            {sessionData.connectedUsers.map((user, i) => (
                                <div key={i} className="ds-roster-item">
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{user}</span>
                                    <button onClick={() => kickUser(user)} className="ds-kick-btn" title="Kick user">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );

    const letters = 'SlideBridge'.split('');

    if (!sessionData?.activeFile) {
        return (
            <div className="sb-display" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#080808', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                <Background />
                <ParticleField />
                <Roster />

                <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,.25)', marginBottom: 44, animation: 'dsTagline 1s cubic-bezier(.16,1,.3,1) .8s both' }}>
                        Wireless Presentation System
                    </p>

                    <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 'clamp(52px,8vw,92px)', fontWeight: 800, fontStyle: 'italic', letterSpacing: '-.04em', color: '#fff', marginBottom: 8, display: 'flex', alignItems: 'baseline' }}>
                        {letters.map((l, i) => (
                            <span key={i} style={{ display: 'inline-block', animation: `dsLetterDrop .55s cubic-bezier(.16,1,.3,1) ${i * .045}s both` }}>{l}</span>
                        ))}
                        <span style={{ display: 'inline-block', color: 'rgba(255,255,255,.2)', animation: `dsLetterDrop .55s cubic-bezier(.16,1,.3,1) ${letters.length * .045}s both` }}>.</span>
                    </h1>

                    <div style={{ position: 'relative', animation: 'dsQrFloat 6s ease-in-out infinite', zIndex: 1 }}>
                        <BreathingRings />
                        <div style={{
                            position: 'relative', background: 'rgba(12,12,16,.92)',
                            border: `1px solid ${sessionData?.isLocked ? 'rgba(200,50,50,.25)' : 'rgba(255,255,255,.08)'}`,
                            borderRadius: 32, padding: 28, backdropFilter: 'blur(40px)',
                            opacity: sessionData?.isLocked ? 0.4 : 1,
                            animation: 'dsFadeUp .8s cubic-bezier(.16,1,.3,1) .55s both',
                            transition: 'all .5s',
                        }}>
                            {[['tl', '2px 0 0 2px', '8px 0 0 0'], ['tr', '2px 2px 0 0', '0 8px 0 0'], ['bl', '0 0 2px 2px', '0 0 0 8px'], ['br', '0 2px 2px 0', '0 0 8px 0']].map(([k, bw, br], i) => (
                                <div key={k} style={{
                                    position: 'absolute', width: 22, height: 22,
                                    borderStyle: 'solid', borderWidth: bw, borderRadius: br,
                                    borderColor: 'rgba(255,255,255,.18)',
                                    ...(k === 'tl' ? { top: -1, left: -1 } : k === 'tr' ? { top: -1, right: -1 } : k === 'bl' ? { bottom: -1, left: -1 } : { bottom: -1, right: -1 }),
                                    animation: `dsCornerGlow 3s ease-in-out ${i * .75}s infinite`,
                                }} />
                            ))}
                            <div style={{ background: '#fff', borderRadius: 16, padding: 20 }}>
                                <QRCodeSVG value={controllerUrl} size={260} level="H" />
                            </div>
                        </div>
                    </div>

                    <p style={{ marginTop: 32, fontSize: 15, fontWeight: 400, color: 'rgba(255,255,255,.35)', letterSpacing: '.03em', animation: 'dsFadeUp .7s cubic-bezier(.16,1,.3,1) 1.2s both' }}>
                        {sessionData?.isLocked ? 'Room is currently locked' : 'Scan with your phone to take control'}
                    </p>

                    <div style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 14, background: 'rgba(12,12,16,.8)', border: '1px solid rgba(255,255,255,.06)', padding: '14px 28px', borderRadius: 100, backdropFilter: 'blur(20px)', animation: 'dsFadeUp .7s cubic-bezier(.16,1,.3,1) 1.4s both' }}>
                        {sessionData?.isLocked ? (
                            <><Lock size={14} style={{ color: 'rgba(255,255,255,.2)' }} /><span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.22)', letterSpacing: '.2em', textTransform: 'uppercase' }}>Locked</span></>
                        ) : (
                            <><KeyRound size={14} style={{ color: 'rgba(255,255,255,.2)' }} />
                                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.22)', letterSpacing: '.2em', textTransform: 'uppercase' }}>Room code</span>
                                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 500, color: '#fff', letterSpacing: '.15em' }}>
                                    {sessionId.split('').map((c, i) => (
                                        <span key={i} style={{ display: 'inline-block', animation: `dsLetterDrop .4s cubic-bezier(.16,1,.3,1) ${1.5 + i * .07}s both` }}>{c}</span>
                                    ))}
                                </span></>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginTop: 44, animation: 'dsFadeUp .7s cubic-bezier(.16,1,.3,1) 1.6s both' }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,.15)', animation: `dsDotBlink 2s ease-in-out ${i * .35}s infinite` }} />
                        ))}
                    </div>
                </div>

                <MinimalCredit />
            </div>
        );
    }

    return (
        <div className="sb-display" style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', background: '#080808' }}>
            <style>{css}</style>
            <Background />
            <ParticleField />
            <Roster />

            {fileTransition && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'none', background: 'rgba(180,180,255,.06)', animation: 'dsFlash .7s ease forwards' }} />
            )}

            <div key={sessionData.activeFile.url} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, animation: 'dsFadeUp .55s cubic-bezier(.16,1,.3,1) both' }}>

                {sessionData.activeFile.type.includes('image') && (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src={sessionData.activeFile.url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: 48, transition: 'transform .6s cubic-bezier(.16,1,.3,1)', transform: `scale(${sessionData.zoomLevel || 1})` }} />
                    </div>
                )}

                {sessionData.activeFile.type.includes('video') && (
                    <video ref={videoRef} src={sessionData.activeFile.url} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 48 }} />
                )}

                {sessionData.activeFile.type.includes('pdf') && (
                    <div className="no-scrollbar" style={{ height: '100vh', width: '100%', overflowY: 'auto', scrollBehavior: 'smooth', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40, paddingBottom: 120 }}>
                        <Document
                            file={sessionData.activeFile.url}
                            onLoadSuccess={({ numPages }) => {
                                setNumPages(numPages);
                                if (sessionData.totalPages !== numPages)
                                    setDoc(doc(db, "sessions", sessionId), { totalPages: numPages }, { merge: true });
                            }}
                            loading={
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, marginTop: 200, background: 'rgba(12,12,16,.92)', backdropFilter: 'blur(40px)', padding: '48px 56px', borderRadius: 32, border: '1px solid rgba(255,255,255,.06)' }}>
                                    <Loader2 size={36} style={{ animation: 'dsSpin 1s linear infinite', color: 'rgba(160,160,255,.5)' }} />
                                    <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.2)', letterSpacing: '.25em', textTransform: 'uppercase', margin: 0 }}>Rendering document</p>
                                </div>
                            }
                        >
                            {Array.from(new Array(numPages || 1), (_, i) => (
                                <div key={`page-${i + 1}`} id={`page-${i + 1}`} style={{ marginBottom: 32, border: '1px solid rgba(255,255,255,.06)', borderRadius: 12, overflow: 'hidden', animation: `dsFadeUp .5s cubic-bezier(.16,1,.3,1) ${i * .06}s both` }}>
                                    <Page pageNumber={i + 1} height={window.innerHeight * .90} renderAnnotationLayer={false} renderTextLayer={false} />
                                </div>
                            ))}
                        </Document>
                    </div>
                )}
            </div>

            <div key={`${sessionData.activePage}-${sessionData.totalPages}`} style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 50, background: 'rgba(10,10,14,.8)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 100, padding: '8px 20px', backdropFilter: 'blur(20px)', animation: 'dsCounterPop .35s cubic-bezier(.16,1,.3,1) both' }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,.4)', letterSpacing: '.05em' }}>
                    {sessionData.activePage || 1}<span style={{ color: 'rgba(255,255,255,.15)' }}> / {sessionData.totalPages || '—'}</span>
                </span>
            </div>

            <MinimalCredit />
        </div>
    );
};

export default DisplayScreen;