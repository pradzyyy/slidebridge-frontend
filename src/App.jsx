import React, { useState, useEffect, useRef } from 'react';
import Controller from './components/Controller';
import DisplayScreen from './components/DisplayScreen';
import { MonitorPlay, Smartphone, ArrowRight, User } from 'lucide-react';
import { db } from './firebase';
import { doc, getDoc } from "firebase/firestore";

// ── Animated particle field ───────────────────────────────────────────────────
const ParticleField = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const NUM = 55;
    const particles = Array.from({ length: NUM }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.4 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(160,160,220,${0.07 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      // Draw dots
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,180,255,${p.alpha})`;
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.6 }}
    />
  );
};

// ── Animated scan line sweep ──────────────────────────────────────────────────
const ScanLine = () => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none', overflow: 'hidden',
  }}>
    <div style={{
      position: 'absolute', left: 0, right: 0, height: '1px',
      background: 'linear-gradient(90deg, transparent, rgba(140,140,255,0.15), transparent)',
      animation: 'scanSweep 8s linear infinite',
    }} />
    <style>{`
      @keyframes scanSweep {
        0%   { top: -2px; opacity: 0; }
        5%   { opacity: 1; }
        95%  { opacity: 1; }
        100% { top: 100%; opacity: 0; }
      }
    `}</style>
  </div>
);

// ── Glowing orbs background ───────────────────────────────────────────────────
const GlowOrbs = () => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
    <div style={{
      position: 'absolute', borderRadius: '50%',
      width: '60vw', height: '60vw',
      top: '-15%', left: '-10%',
      background: 'radial-gradient(circle, rgba(80,80,200,0.07) 0%, transparent 65%)',
      animation: 'orbFloat1 18s ease-in-out infinite alternate',
    }} />
    <div style={{
      position: 'absolute', borderRadius: '50%',
      width: '50vw', height: '50vw',
      bottom: '-10%', right: '-5%',
      background: 'radial-gradient(circle, rgba(120,60,200,0.06) 0%, transparent 65%)',
      animation: 'orbFloat2 24s ease-in-out infinite alternate-reverse',
    }} />
    <style>{`
      @keyframes orbFloat1 { 0%{transform:translate(0,0) scale(1)} 100%{transform:translate(60px,-40px) scale(1.05)} }
      @keyframes orbFloat2 { 0%{transform:translate(0,0) scale(1)} 100%{transform:translate(-50px,30px) scale(1.08)} }
    `}</style>
  </div>
);

// ── Grid overlay ──────────────────────────────────────────────────────────────
const Grid = () => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
    backgroundSize: '72px 72px',
    maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
  }} />
);

// ── Animated wordmark letters ─────────────────────────────────────────────────
const AnimatedWordmark = () => {
  const letters = 'SlideBridge'.split('');
  return (
    <h1 style={{
      fontFamily: "'Poppins', sans-serif",
      fontSize: 'clamp(40px, 8vw, 72px)',
      fontWeight: 800,
      fontStyle: 'italic',
      letterSpacing: '-0.04em',
      color: '#fff',
      marginBottom: '6px',
      display: 'flex', alignItems: 'baseline',
    }}>
      {letters.map((l, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            animation: `letterDrop 0.6s cubic-bezier(0.16,1,0.3,1) both`,
            animationDelay: `${i * 0.04}s`,
          }}
        >{l}</span>
      ))}
      <span style={{
        color: 'rgba(255,255,255,0.2)',
        animation: 'letterDrop 0.6s cubic-bezier(0.16,1,0.3,1) 0.6s both',
        display: 'inline-block',
      }}>.</span>
    </h1>
  );
};

// ── Pulsing ring ──────────────────────────────────────────────────────────────
const PulsingRing = () => (
  <div style={{ position: 'relative', marginBottom: '28px' }}>
    {[1, 2, 3].map(i => (
      <div key={i} style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: `${52 + i * 22}px`, height: `${52 + i * 22}px`,
        borderRadius: '50%',
        border: '1px solid rgba(140,140,255,0.12)',
        animation: `ringPulse 2.4s ease-out ${i * 0.4}s infinite`,
      }} />
    ))}
    <div style={{
      width: '56px', height: '56px', borderRadius: '50%',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(10px)',
      position: 'relative', zIndex: 1,
    }}>
      <MonitorPlay size={26} color="rgba(180,180,255,0.8)" />
    </div>
  </div>
);

// ── Main App ──────────────────────────────────────────────────────────────────
const App = () => {
  const [mode, setMode] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [userName, setUserName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [btnHover, setBtnHover] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sid')) setSessionId(params.get('sid'));
    if (params.get('mode')) setMode(params.get('mode'));
    if (params.get('scan')) setJoinCode(params.get('scan'));
    // Stagger mount animation
    setTimeout(() => setMounted(true), 80);
  }, []);

  const createScreen = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    window.location.href = `?sid=${code}&mode=display`;
  };

  const joinScreen = async (e) => {
    e.preventDefault();
    setJoinError("");
    const code = joinCode.trim().toUpperCase();
    const name = userName.trim();
    if (code.length === 6 && name.length > 0) {
      try {
        const docRef = doc(db, "sessions", code);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) { setJoinError("Room does not exist"); return; }
        if (docSnap.data().isLocked) { setJoinError("Room is locked by host"); return; }
        window.location.href = `?sid=${code}&mode=mobile&name=${encodeURIComponent(name)}`;
      } catch (err) {
        setJoinError("Connection error");
      }
    }
  };

  if (sessionId && mode === 'display') return <DisplayScreen sessionId={sessionId} />;
  if (sessionId && mode === 'mobile') return <Controller sessionId={sessionId} />;

  const canJoin = joinCode.length === 6 && userName.trim().length > 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080808',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      fontFamily: "'DM Sans', sans-serif",
      color: '#fff',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&family=Poppins:ital,wght@0,400;0,700;0,800;1,700;1,800&display=swap');

        @keyframes letterDrop {
          from { opacity: 0; transform: translateY(-20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ringPulse {
          0%   { transform: translate(-50%,-50%) scale(0.85); opacity: 0.6; }
          60%  { opacity: 0.1; }
          100% { transform: translate(-50%,-50%) scale(1.6); opacity: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmerSlide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes errorShake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-6px); }
          40%     { transform: translateX(6px); }
          60%     { transform: translateX(-4px); }
          80%     { transform: translateX(4px); }
        }
        @keyframes dotBlink {
          0%,100% { opacity: 1; } 50% { opacity: 0.2; }
        }
        .sb-launch-btn {
          transition: transform 0.18s cubic-bezier(0.16,1,0.3,1), background 0.15s;
        }
        .sb-launch-btn:hover { transform: scale(1.015); }
        .sb-launch-btn:active { transform: scale(0.97); }
        .sb-input:focus { outline: none; }
        .sb-input:focus { border-color: rgba(180,180,255,0.25) !important; background: rgba(140,140,220,0.04) !important; }
        .sb-join-btn { transition: all 0.2s cubic-bezier(0.16,1,0.3,1); }
        .sb-join-btn:hover { transform: scale(1.04); }
        .sb-join-btn:active { transform: scale(0.95); }
      `}</style>

      {/* Backgrounds */}
      <GlowOrbs />
      <Grid />
      <ParticleField />
      <ScanLine />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: '420px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateY(16px)',
        transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)',
      }}>

        {/* Icon with rings */}
        <PulsingRing />

        {/* Wordmark */}
        <AnimatedWordmark />

        {/* Tagline */}
        <p style={{
          fontSize: '12px', fontWeight: 500,
          color: 'rgba(255,255,255,0.2)',
          letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: '48px',
          animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.55s both',
        }}>
          Wireless presentation control
        </p>

        {/* Launch button */}
        <button
          onClick={createScreen}
          onMouseEnter={() => setBtnHover(true)}
          onMouseLeave={() => setBtnHover(false)}
          className="sb-launch-btn"
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.92)',
            border: 'none',
            borderRadius: '18px',
            padding: '18px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', marginBottom: '28px',
            position: 'relative', overflow: 'hidden',
            animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.65s both',
          }}
        >
          {/* Shimmer */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.6) 50%, transparent 60%)',
            animation: btnHover ? 'shimmerSlide 0.6s ease forwards' : 'none',
            pointerEvents: 'none',
          }} />
          <span style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            fontSize: '16px', fontWeight: 600, color: '#080808',
            letterSpacing: '-0.01em',
          }}>
            <MonitorPlay size={20} color="#080808" />
            Launch big screen
          </span>
          <ArrowRight
            size={20}
            color="#080808"
            style={{
              transition: 'transform 0.2s cubic-bezier(0.16,1,0.3,1)',
              transform: btnHover ? 'translateX(4px)' : 'none',
            }}
          />
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          width: '100%', marginBottom: '20px',
          animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.75s both',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
          <span style={{
            fontSize: '10px', fontWeight: 600,
            color: 'rgba(255,255,255,0.18)',
            letterSpacing: '0.2em', textTransform: 'uppercase',
          }}>or join a room</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
        </div>

        {/* Join form */}
        <form
          onSubmit={joinScreen}
          style={{
            width: '100%', display: 'flex', flexDirection: 'column', gap: '10px',
            animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.85s both',
          }}
        >
          {/* Name input */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <User size={16} color="rgba(255,255,255,0.2)" />
            </div>
            <input
              type="text"
              placeholder="Your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              maxLength={15}
              required
              className="sb-input"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px',
                color: '#fff',
                fontSize: '14px', fontWeight: 500,
                padding: '15px 16px 15px 42px',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'border-color 0.2s, background 0.2s',
              }}
            />
          </div>

          {/* Code input + join button */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <Smartphone size={16} color="rgba(255,255,255,0.2)" />
            </div>
            <input
              type="text"
              placeholder="6-digit room code"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
              maxLength={6}
              required
              className="sb-input"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: joinError ? 'rgba(200,50,50,0.06)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${joinError ? 'rgba(200,50,50,0.25)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '14px',
                color: '#fff',
                fontSize: '18px', fontWeight: 500,
                fontFamily: "'DM Mono', monospace",
                letterSpacing: '0.2em',
                padding: '15px 100px 15px 42px',
                transition: 'border-color 0.2s, background 0.2s',
                animation: joinError ? 'errorShake 0.4s ease' : 'none',
              }}
            />
            {/* Inline join button */}
            <button
              type="submit"
              className="sb-join-btn"
              style={{
                position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                background: canJoin ? 'rgba(255,255,255,0.9)' : 'transparent',
                border: 'none',
                color: canJoin ? '#080808' : 'transparent',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '10px 18px', borderRadius: '10px',
                cursor: canJoin ? 'pointer' : 'default',
                pointerEvents: canJoin ? 'auto' : 'none',
              }}
            >
              Join
            </button>

            {/* Error */}
            {joinError && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
                textAlign: 'center',
                animation: 'fadeUp 0.25s ease both',
              }}>
                <span style={{
                  fontSize: '10px', fontWeight: 700,
                  color: '#e05555',
                  letterSpacing: '0.15em', textTransform: 'uppercase',
                }}>{joinError}</span>
              </div>
            )}
          </div>
        </form>

        {/* Footer dots */}
        <div style={{
          marginTop: '52px', display: 'flex', gap: '6px', alignItems: 'center',
          animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 1s both',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: '3px', height: '3px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              animation: `dotBlink 2s ease-in-out ${i * 0.3}s infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;