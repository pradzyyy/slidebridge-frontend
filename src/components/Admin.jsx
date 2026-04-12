import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import { ShieldAlert, Trash2, Users, FileText, Lock, Unlock, Activity, ServerCrash, ExternalLink, AlertTriangle } from 'lucide-react';
import { CreditPill } from '../App';

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

    const adminCss = `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap');
        
        @keyframes adLoginIn  { from{opacity:0;transform:translateY(28px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes adIconSpin { 0%{transform:rotate(-8deg) scale(.9);opacity:0} 100%{transform:rotate(0deg) scale(1);opacity:1} }
        @keyframes adTitleIn  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes adInputIn  { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes adBtnIn    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes adGlowPulse { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0)} 50%{box-shadow:0 0 40px 4px rgba(99,102,241,0.09)} }
        @keyframes adHeaderIn  { from{opacity:0;transform:translateY(-18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes adCardIn    { from{opacity:0;transform:translateY(16px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes adStatIn    { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes adEmptyIn   { from{opacity:0;transform:scale(.96)} to{opacity:.3;transform:scale(1)} }
        @keyframes adPulse     { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes adModalIn   { from{opacity:0;transform:scale(.94) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes adFadeIn    { from{opacity:0} to{opacity:1} }
        @keyframes adCodeIn    { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes adLockBounce { 0%{transform:scale(1)} 40%{transform:scale(.85)} 70%{transform:scale(1.1)} 100%{transform:scale(1)} }

        .ad-input:focus { outline: none; border-color: rgba(99,102,241,0.5) !important; }
        .ad-btn { transition: all 0.2s; }
        .ad-btn:hover { background: #818cf8 !important; color: #fff !important; }
        .ad-btn:active { transform: scale(0.95); }
        .ad-card { transition: border-color 0.2s, box-shadow 0.2s; }
        .ad-card:hover { border-color: rgba(255,255,255,0.1) !important; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
        .ad-lock-btn { transition: all 0.2s; cursor: pointer; }
        .ad-lock-btn:active { animation: adLockBounce 0.22s ease both; }
        .ad-hover-text { transition: color 0.2s; cursor: pointer; }
        .ad-hover-text:hover { color: #fff !important; }
        .ad-hover-text-indigo { transition: color 0.2s; cursor: pointer; }
        .ad-hover-text-indigo:hover { color: #818cf8 !important; }
        .ad-terminate-btn { transition: all 0.2s; cursor: pointer; }
        .ad-terminate-btn:hover { background: #dc2626 !important; color: #fff !important; }
        .ad-clean-btn { transition: all 0.2s; cursor: pointer; }
        .ad-clean-btn:active { transform: scale(0.95); }
        .ad-clean-btn:hover { background: rgba(79,70,229,0.2) !important; border-color: rgba(99,102,241,0.3) !important; color: #818cf8 !important; }
    `;

    if (!isAuthenticated) {
        return (
            <div style={{ minHeight: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'DM Sans', sans-serif" }}>
                <style>{adminCss}</style>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(49,46,129,0.1) 0%, #050505 70%, #050505 100%)', pointerEvents: 'none' }} />

                <div style={{ zIndex: 10, width: '100%', maxWidth: '380px', background: '#111', border: '1px solid rgba(255,255,255,0.05)', padding: '40px', borderRadius: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', animation: 'adLoginIn .6s cubic-bezier(.16,1,.3,1) .1s both, adGlowPulse 5s ease-in-out 1s infinite' }}>
                    <div style={{ width: '80px', height: '80px', background: 'rgba(99,102,241,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid rgba(99,102,241,0.2)', animation: 'adIconSpin .6s cubic-bezier(.16,1,.3,1) .35s both' }}>
                        <ShieldAlert size={36} color="#818cf8" />
                    </div>

                    <h2 style={{ fontSize: '30px', fontWeight: 900, color: '#fff', marginBottom: '8px', letterSpacing: '-0.05em', animation: 'adTitleIn .5s cubic-bezier(.16,1,.3,1) .45s both' }}>
                        Command Center
                    </h2>
                    <p style={{ fontSize: '14px', color: '#737373', fontWeight: 500, textAlign: 'center', marginBottom: '32px', animation: 'adTitleIn .5s cubic-bezier(.16,1,.3,1) .52s both' }}>
                        Enter master override sequence.
                    </p>

                    <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <input
                            type="password"
                            placeholder="PASSWORD"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                            className="ad-input"
                            style={{ width: '100%', boxSizing: 'border-box', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', color: '#fff', textAlign: 'center', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '16px', borderRadius: '16px', transition: 'all 0.2s', animation: 'adInputIn .5s cubic-bezier(.16,1,.3,1) .6s both' }}
                        />
                        <button
                            type="submit"
                            className="ad-btn"
                            style={{ width: '100%', background: '#fff', color: '#050505', border: 'none', fontWeight: 700, padding: '16px', borderRadius: '16px', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', animation: 'adBtnIn .5s cubic-bezier(.16,1,.3,1) .68s both' }}
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
        <div style={{ minHeight: '100vh', background: '#050505', color: '#fff', padding: '32px', fontFamily: "'DM Sans', sans-serif" }}>
            <style>{adminCss}</style>

            {roomToDestroy && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', animation: 'adFadeIn .2s ease both' }}>
                    <div style={{ width: '100%', maxWidth: '380px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', padding: '32px', borderRadius: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', animation: 'adModalIn .35s cubic-bezier(.16,1,.3,1) both' }}>
                        <div style={{ width: '64px', height: '64px', background: 'rgba(239,68,68,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <AlertTriangle size={28} color="#ef4444" />
                        </div>
                        <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '8px', letterSpacing: '-0.03em' }}>Destroy Room?</h3>
                        <p style={{ fontSize: '14px', color: '#a3a3a3', textAlign: 'center', marginBottom: '32px', lineHeight: 1.6 }}>
                            Are you sure you want to terminate room <span style={{ color: '#fff', fontWeight: 700 }}>{roomToDestroy.id}</span>? All hosted files will be permanently deleted from the cloud.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                            <button onClick={() => setRoomToDestroy(null)} className="ad-btn" style={{ flex: 1, background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.05)', fontWeight: 700, padding: '16px', borderRadius: '16px', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                            <button onClick={confirmDestroyRoom} className="ad-btn" style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', fontWeight: 700, padding: '16px', borderRadius: '16px', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 14px 0 rgba(220,38,38,0.39)' }}>Terminate</button>
                        </div>
                    </div>
                </div>
            )}

            {isCleanModalOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)', animation: 'adFadeIn .2s ease both' }}>
                    <div style={{ width: '100%', maxWidth: '380px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', padding: '32px', borderRadius: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', animation: 'adModalIn .35s cubic-bezier(.16,1,.3,1) both' }}>
                        <div style={{ width: '64px', height: '64px', background: 'rgba(99,102,241,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid rgba(99,102,241,0.2)' }}>
                            <Trash2 size={28} color="#818cf8" />
                        </div>
                        <h3 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '8px', letterSpacing: '-0.03em' }}>Purge Empty Rooms?</h3>
                        <p style={{ fontSize: '14px', color: '#a3a3a3', textAlign: 'center', marginBottom: '32px', lineHeight: 1.6 }}>
                            This will instantly destroy <span style={{ color: '#fff', fontWeight: 700 }}>{emptyRoomCount}</span> inactive rooms that have no uploaded files.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                            <button onClick={() => setIsCleanModalOpen(false)} className="ad-btn" style={{ flex: 1, background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.05)', fontWeight: 700, padding: '16px', borderRadius: '16px', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                            <button onClick={cleanEmptyRooms} className="ad-btn" style={{ flex: 1, background: '#4f46e5', color: '#fff', border: 'none', fontWeight: 700, padding: '16px', borderRadius: '16px', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 14px 0 rgba(79,70,229,0.39)' }}>Purge All</button>
                        </div>
                    </div>
                </div>
            )}

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '24px', animation: 'adHeaderIn .55s cubic-bezier(.16,1,.3,1) both' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(99,102,241,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 0 20px rgba(99,102,241,0.15)', animation: 'adHeaderIn .55s cubic-bezier(.16,1,.3,1) .06s both' }}>
                        <Activity size={24} color="#818cf8" />
                    </div>
                    <div style={{ animation: 'adHeaderIn .55s cubic-bezier(.16,1,.3,1) .1s both' }}>
                        <h1 style={{ fontSize: '30px', margin: 0, fontWeight: 900, letterSpacing: '-0.05em', color: '#fff' }}>System Overview</h1>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <div style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', animation: 'adPulse 2s ease-in-out infinite' }} />
                            {activeSessions.length} Active Sessions
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', animation: 'adHeaderIn .55s cubic-bezier(.16,1,.3,1) .18s both' }}>
                    <button
                        onClick={toggleMaintenance}
                        className="ad-clean-btn"
                        style={{ background: isMaintenance ? 'rgba(239,68,68,0.1)' : '#111', border: `1px solid ${isMaintenance ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.05)'}`, color: isMaintenance ? '#f87171' : '#a3a3a3', padding: '12px 24px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        Maintenance: {isMaintenance ? 'ON' : 'OFF'}
                    </button>

                    {emptyRoomCount > 0 && (
                        <button
                            onClick={() => setIsCleanModalOpen(true)}
                            className="ad-clean-btn"
                            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.05)', color: '#a3a3a3', padding: '12px 24px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Trash2 size={14} /> Purge Empty ({emptyRoomCount})
                        </button>
                    )}
                    <button
                        onClick={() => setIsAuthenticated(false)}
                        className="ad-hover-text"
                        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.05)', color: '#a3a3a3', padding: '12px 24px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}
                    >
                        Lock Terminal
                    </button>
                </div>
            </header>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', opacity: 0.5 }}>
                    <Activity size={48} color="#6366f1" style={{ marginBottom: '16px', animation: 'adPulse 1.4s ease-in-out infinite' }} />
                    <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#818cf8' }}>Scanning Servers...</span>
                </div>

            ) : activeSessions.length === 0 ? (
                <div
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '128px 0', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '32px', background: '#0a0a0a', animation: 'adEmptyIn .6s cubic-bezier(.16,1,.3,1) .2s both' }}
                >
                    <ServerCrash size={64} color="#737373" style={{ marginBottom: '24px' }} />
                    <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#737373', margin: '0 0 8px 0' }}>No Active Rooms</h2>
                    <p style={{ fontSize: '14px', color: '#525252', margin: 0 }}>All SlideBridge servers are currently idle.</p>
                </div>

            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                    {activeSessions.map((session, idx) => (
                        <div
                            key={session.id}
                            className="ad-card"
                            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '32px', padding: '24px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', animation: `adCardIn .5s cubic-bezier(.16,1,.3,1) ${0.1 + idx * 0.07}s both` }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                <div style={{ animation: `adCodeIn .4s cubic-bezier(.16,1,.3,1) ${0.22 + idx * 0.07}s both` }}>
                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '4px', display: 'block' }}>Room Code</span>
                                    <h3 style={{ fontSize: '30px', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.1em', margin: 0 }}>{session.id}</h3>
                                </div>
                                <button
                                    onClick={() => toggleRoomLock(session.id, session.isLocked)}
                                    title={session.isLocked ? "Click to Unlock Room" : "Click to Lock Room"}
                                    className="ad-lock-btn"
                                    style={{ padding: '6px 12px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '6px', border: `1px solid ${session.isLocked ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`, background: session.isLocked ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: session.isLocked ? '#ef4444' : '#22c55e', animation: `adCodeIn .4s cubic-bezier(.16,1,.3,1) ${0.28 + idx * 0.07}s both` }}
                                >
                                    {session.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                                    <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{session.isLocked ? 'Locked' : 'Open'}</span>
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', flex: 1 }}>
                                {[
                                    { icon: <Users size={16} />, label: 'Remotes', value: session.connectedUsers?.length || 0, delay: 0.32 + idx * 0.07 },
                                    { icon: <FileText size={16} />, label: 'Files Hosted', value: session.files?.length || 0, delay: 0.38 + idx * 0.07 },
                                ].map(({ icon, label, value, delay }) => (
                                    <div
                                        key={label}
                                        style={{ background: '#0a0a0a', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.05)', animation: `adStatIn .4s cubic-bezier(.16,1,.3,1) ${delay}s both` }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#a3a3a3' }}>
                                            {icon}
                                            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
                                        </div>
                                        <span style={{ fontSize: '14px', fontWeight: 700 }}>{value}</span>
                                    </div>
                                ))}

                                {session.connectedUsers?.length > 0 && (
                                    <div style={{ marginTop: '8px', animation: `adStatIn .4s cubic-bezier(.16,1,.3,1) ${0.44 + idx * 0.07}s both` }}>
                                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', display: 'block' }}>Connected Users:</span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {session.connectedUsers.map((user, i) => (
                                                <span key={i} style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px', color: '#d4d4d4', border: '1px solid rgba(255,255,255,0.05)' }}>{user}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {session.files?.length > 0 && (
                                    <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', animation: `adStatIn .4s cubic-bezier(.16,1,.3,1) ${0.5 + idx * 0.07}s both` }}>
                                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px', display: 'block' }}>Hosted Files:</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '128px', overflowY: 'auto' }}>
                                            {session.files.map((file, i) => (
                                                <a
                                                    key={i}
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="ad-hover-text-indigo"
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, background: '#0a0a0a', padding: '8px 12px', borderRadius: '8px', color: '#d4d4d4', border: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none' }}
                                                >
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '8px' }}>{file.name}</span>
                                                    <ExternalLink size={12} style={{ flexShrink: 0 }} />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setRoomToDestroy(session)}
                                className="ad-terminate-btn"
                                style={{ width: '100%', background: '#0a0a0a', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 700, padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', animation: `adBtnIn .4s cubic-bezier(.16,1,.3,1) ${0.56 + idx * 0.07}s both` }}
                            >
                                <Trash2 size={16} />
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