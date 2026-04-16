import React, { useState, useEffect, useRef } from 'react';
import Controller from './components/Controller';
import DisplayScreen from './components/DisplayScreen';
import Admin from './components/Admin';
import { MonitorPlay, Smartphone, ArrowRight, User, QrCode, X } from 'lucide-react';
import { db } from './firebase';
import { doc, getDoc, onSnapshot } from "firebase/firestore";

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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.6
      }}
    />
  );
};

const ScanLine = () => (
  <div style={{
    position: 'fixed',
    inset: 0,
    zIndex: 1,
    pointerEvents: 'none',
    overflow: 'hidden'
  }}>
    <div style={{
      position: 'absolute',
      left: 0,
      right: 0,
      height: '1px',
      background: 'linear-gradient(90deg, transparent, rgba(140,140,255,0.15), transparent)',
      animation: 'scanSweep 8s linear infinite',
    }} />
  </div>
);

const GlowOrbs = () => (
  <div style={{
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
    overflow: 'hidden'
  }}>
    <div style={{
      position: 'absolute',
      borderRadius: '50%',
      width: '60vw',
      height: '60vw',
      top: '-15%',
      left: '-10%',
      background: 'radial-gradient(circle, rgba(80,80,200,0.07) 0%, transparent 65%)',
      animation: 'orbFloat1 18s ease-in-out infinite alternate',
    }} />
    <div style={{
      position: 'absolute',
      borderRadius: '50%',
      width: '50vw',
      height: '50vw',
      bottom: '-10%',
      right: '-5%',
      background: 'radial-gradient(circle, rgba(120,60,200,0.06) 0%, transparent 65%)',
      animation: 'orbFloat2 24s ease-in-out infinite alternate-reverse',
    }} />
  </div>
);

const Grid = () => (
  <div style={{
    position: 'fixed',
    inset: 0,
    zIndex: 0,
    pointerEvents: 'none',
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
    backgroundSize: '72px 72px',
    maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
  }} />
);

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
      display: 'flex',
      alignItems: 'baseline',
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

const PulsingRing = () => (
  <div style={{
    position: 'relative',
    marginBottom: '28px'
  }}>
    {[1, 2, 3].map(i => (
      <div key={i} style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
        width: `${52 + i * 22}px`,
        height: `${52 + i * 22}px`,
        borderRadius: '50%',
        border: '1px solid rgba(140,140,255,0.12)',
        animation: `ringPulse 2.4s ease-out ${i * 0.4}s infinite`,
      }} />
    ))}
    <div style={{
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(10px)',
      position: 'relative',
      zIndex: 1,
    }}>
      <MonitorPlay size={26} color="rgba(180,180,255,0.8)" />
    </div>
  </div>
);

export const CreditPill = ({ position = 'bottom-center' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const handleDocClick = (e) => {
      if (!e.target.closest('.sb-pill-wrap')) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('touchstart', handleDocClick);
    return () => document.removeEventListener('touchstart', handleDocClick);
  }, []);

  const handleClick = (e) => {
    if (!isExpanded) {
      e.preventDefault();
      setIsExpanded(true);
    }
  };

  const posStyles = position === 'top-right'
    ? { top: '24px', right: '24px' }
    : { bottom: '32px', left: '50%', transform: 'translateX(-50%)' };

  return (
    <>
      <style>{`
            @property --sb-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
            @keyframes sbSpinBW { to { --sb-angle: 360deg; } }
            
            .sb-pill-wrap { 
                position: fixed; 
                z-index: 99999; 
                display: inline-block; 
                border-radius: 100px; 
                padding: 1.5px; 
                background: conic-gradient(from var(--sb-angle, 0deg), rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.5) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.5) 75%, rgba(255,255,255,0.1) 100%); 
                animation: sbSpinBW 4s linear infinite; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.5); 
                cursor: pointer; 
                -webkit-tap-highlight-color: transparent; 
            }
            
            .sb-pill-inner { 
                display: flex; 
                align-items: center; 
                background: #0a0a0a; 
                border-radius: 100px; 
                padding: 10px 14px; 
                text-decoration: none; 
                overflow: hidden; 
                transition: padding 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease; 
            }
            
            .sb-pill-wrap.is-expanded .sb-pill-inner { 
                padding: 10px 22px 10px 16px; 
                box-shadow: inset 0 0 20px rgba(140, 140, 255, 0.15); 
            }
            
            .sb-pill-divider { 
                width: 0; 
                height: 14px; 
                background: rgba(255,255,255,0.15); 
                flex-shrink: 0; 
                transition: width 0.4s cubic-bezier(0.16,1,0.3,1), margin 0.4s cubic-bezier(0.16,1,0.3,1); 
            }
            
            .sb-pill-wrap.is-expanded .sb-pill-divider { 
                width: 1px; 
                margin: 0 12px; 
            }
            
            .sb-pill-text { 
                font-size: 11px; 
                font-weight: 600; 
                color: rgba(255,255,255,0.45); 
                letter-spacing: 0.13em; 
                text-transform: uppercase; 
                white-space: nowrap; 
                max-width: 0; 
                opacity: 0; 
                transition: max-width 0.45s cubic-bezier(0.16,1,0.3,1), opacity 0.3s; 
                font-family: 'DM Sans', sans-serif; 
            }
            
            .sb-pill-wrap.is-expanded .sb-pill-text { 
                max-width: 160px; 
                opacity: 1; 
            }
            
            .sb-li-pill-logo { 
                font-family: 'DM Mono', monospace; 
                font-size: 16px; 
                font-style: italic; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                flex-shrink: 0; 
                line-height: 1; 
                padding-bottom: 2px; 
                width: 28px; 
            }
            
            .sb-slash { 
                color: rgba(255, 255, 255, 0.3); 
                font-weight: 300; 
                transition: color 0.4s ease, text-shadow 0.4s ease; 
            }
            
            .sb-p { 
                font-weight: 700; 
                margin-left: -1px; 
                background: linear-gradient(135deg, #ffffff 0%, #8a8a9a 100%); 
                -webkit-background-clip: text; 
                -webkit-text-fill-color: transparent; 
                transition: all 0.4s ease; 
                padding-right: 4px; 
            }
            
            .sb-pill-wrap.is-expanded .sb-slash { 
                color: rgba(140, 140, 255, 0.6); 
                text-shadow: 0 0 12px rgba(140, 140, 255, 0.5); 
            }
            
            .sb-pill-wrap.is-expanded .sb-p { 
                background: linear-gradient(135deg, #ffffff 0%, #8c8cff 100%); 
                -webkit-background-clip: text; 
                -webkit-text-fill-color: transparent; 
                filter: drop-shadow(0 2px 4px rgba(140, 140, 255, 0.4)); 
            }
        `}</style>

      <div
        className={`sb-pill-wrap ${isExpanded ? 'is-expanded' : ''}`}
        style={posStyles}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <a
          href="https://www.linkedin.com/in/pradyumnpandhurnekar/"
          target="_blank"
          rel="noopener noreferrer"
          className="sb-pill-inner"
          onClick={handleClick}
        >
          <div className="sb-li-pill-logo">
            <span className="sb-slash">/</span>
            <span className="sb-p">p</span>
          </div>
          <div className="sb-pill-divider" />
          <span className="sb-pill-text">
            built by <span style={{ color: 'rgba(255,255,255,0.85)' }}>pradzyyy</span>
          </span>
        </a>
      </div>
    </>
  );
};

const App = () => {
  const [mode, setMode] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [userName, setUserName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const [isMaintenance, setIsMaintenance] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sid')) setSessionId(params.get('sid'));
    if (params.get('mode')) setMode(params.get('mode'));
    if (params.get('scan')) setJoinCode(params.get('scan'));
    setTimeout(() => setMounted(true), 80);

    const unsubSettings = onSnapshot(doc(db, "settings", "system"), (docSnap) => {
      if (docSnap.exists()) {
        setIsMaintenance(docSnap.data().maintenanceMode || false);
      }
    });

    return () => unsubSettings();
  }, []);

  useEffect(() => {
    if (!isScanning) return;
    let stream = null;
    let animationFrameId;

    const startVideo = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", true);
          videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Camera access denied", err);
        alert("Camera access denied. Please enable camera permissions in your browser.");
        setIsScanning(false);
      }
    };

    const tick = () => {
      if (!isScanning) return;
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          canvas.height = videoRef.current.videoHeight;
          canvas.width = videoRef.current.videoWidth;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          if (window.jsQR) {
            const code = window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
            if (code) {
              handleScan(code.data);
              return;
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    if (!window.jsQR) {
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
      script.onload = startVideo;
      document.body.appendChild(script);
    } else {
      startVideo();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isScanning]);

  const handleScan = (data) => {
    setIsScanning(false);
    let foundCode = "";

    try {
      const url = new URL(data);
      const sid = url.searchParams.get('sid');
      if (sid) {
        foundCode = sid;
      } else if (data.length === 6) {
        foundCode = data;
      }
    } catch {
      if (data.trim().length === 6) {
        foundCode = data.trim().toUpperCase();
      }
    }

    if (foundCode) {
      setJoinCode(foundCode);
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 5000);
    }
  };

  const createScreen = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    window.location.href = `?sid=${code}&mode=display`;
  };

  const joinScreen = async (e) => {
    e.preventDefault();
    setJoinError("");
    const code = joinCode.trim().toUpperCase();
    const name = userName.trim();

    if (code === '040406') {
      window.location.href = '?mode=admin';
      return;
    }

    if (code.length === 6 && name.length > 0) {
      try {
        const docRef = doc(db, "sessions", code);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          setJoinError("Room does not exist");
          return;
        }
        if (docSnap.data().isLocked) {
          setJoinError("Room is locked by host");
          return;
        }
        window.location.href = `?sid=${code}&mode=mobile&name=${encodeURIComponent(name)}`;
      } catch (err) {
        setJoinError("Connection error");
      }
    }
  };

  if (sessionId && mode === 'display') return <DisplayScreen sessionId={sessionId} />;
  if (sessionId && mode === 'mobile') return <Controller sessionId={sessionId} />;
  if (mode === 'admin') return <Admin />;

  if (isMaintenance && mode !== 'admin') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#080808',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'DM Sans', sans-serif",
        color: '#fff',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <GlowOrbs />
        <Grid />
        <ParticleField />

        <div style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'rgba(12,12,16,0.8)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '32px',
          padding: '48px 32px',
          backdropFilter: 'blur(20px)',
          animation: 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both'
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(140,140,255,0.05)',
            border: '1px solid rgba(140,140,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24
          }}>
            <MonitorPlay size={28} color="rgba(140,140,255,0.6)" />
          </div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            System Offline
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.4)',
            textAlign: 'center',
            fontSize: '14px',
            lineHeight: 1.6,
            marginBottom: 0
          }}>
            SlideBridge is currently undergoing scheduled maintenance. We will be back online shortly.
          </p>
        </div>

        <CreditPill />
      </div>
    );
  }

  const canJoin = joinCode.length === 6 && userName.trim().length > 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080808',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: "'DM Sans', sans-serif",
      color: '#fff',
      overflowX: 'hidden',
      position: 'relative',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500;700&family=Poppins:ital,wght@0,400;0,700;0,800;1,700;1,800&display=swap');

        @keyframes letterDrop { 
            from { opacity: 0; transform: translateY(-20px); } 
            to { opacity: 1; transform: translateY(0); } 
        }
        @keyframes ringPulse { 
            0% { transform: translate(-50%,-50%) scale(0.85); opacity: 0.6; } 
            60% { opacity: 0.1; } 
            100% { transform: translate(-50%,-50%) scale(1.6); opacity: 0; } 
        }
        @keyframes fadeUp { 
            from { opacity: 0; transform: translateY(28px); } 
            to { opacity: 1; transform: translateY(0); } 
        }
        @keyframes shimmerSlide { 
            0% { transform: translateX(-100%); } 
            100% { transform: translateX(200%); } 
        }
        @keyframes errorShake { 
            0%,100% { transform: translateX(0); } 
            20% { transform: translateX(-6px); } 
            40% { transform: translateX(6px); } 
            60% { transform: translateX(-4px); } 
            80% { transform: translateX(4px); } 
        }
        @keyframes dotBlink { 
            0%,100% { opacity: 1; } 
            50% { opacity: 0.2; } 
        }
        @keyframes scanSweep { 
            0% { top: -2px; opacity: 0; } 
            5% { opacity: 1; } 
            95% { opacity: 1; } 
            100% { top: 100%; opacity: 0; } 
        }
        @keyframes qrLaser { 
            0% { top: 0; opacity: 0; } 
            10% { opacity: 1; } 
            90% { opacity: 1; } 
            100% { top: 100%; opacity: 0; } 
        }
        @keyframes toastDrop { 
            from { opacity: 0; transform: translate(-50%, -20px); } 
            to { opacity: 1; transform: translate(-50%, 0); } 
        }

        .sb-launch-btn { 
            transition: transform 0.18s cubic-bezier(0.16,1,0.3,1), background 0.15s; 
        }
        .sb-launch-btn:hover { 
            transform: scale(1.015); 
        }
        .sb-launch-btn:active { 
            transform: scale(0.97); 
        }
        
        .sb-input:focus { 
            outline: none; 
            border-color: rgba(180,180,255,0.25) !important; 
            background: rgba(140,140,220,0.04) !important; 
        }
        
        .sb-join-btn { 
            transition: all 0.2s cubic-bezier(0.16,1,0.3,1); 
        }
        .sb-join-btn:hover { 
            transform: scale(1.04); 
        }
        .sb-join-btn:active { 
            transform: scale(0.95); 
        }

        .mobile-only { 
            display: none !important; 
        }
        
        @media (max-width: 768px) { 
            .mobile-only { 
                display: flex !important; 
            } 
        }

        .sb-qr-btn {
            width: 100%; 
            background: rgba(140, 140, 255, 0.08); 
            border: 1px solid rgba(140, 140, 255, 0.15);
            border-radius: 14px; 
            color: rgba(180, 180, 255, 0.9); 
            font-size: 13px; 
            font-weight: 600;
            padding: 14px; 
            align-items: center; 
            justify-content: center; 
            gap: 8px;
            cursor: pointer; 
            font-family: 'DM Sans', sans-serif; 
            transition: all 0.2s;
        }
        
        .sb-qr-btn:active { 
            transform: scale(0.97); 
            background: rgba(140, 140, 255, 0.15); 
        }
      `}</style>

      {scanSuccess && (
        <div style={{
          position: 'fixed',
          top: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          background: 'rgba(74, 222, 128, 0.1)',
          border: '1px solid rgba(74, 222, 128, 0.2)',
          borderRadius: '16px',
          padding: '14px 24px',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          animation: 'toastDrop 0.4s cubic-bezier(0.16,1,0.3,1) both'
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#fff', letterSpacing: '0.02em' }}>
            Room code captured. <strong>Enter your name to join.</strong>
          </span>
        </div>
      )}

      {isScanning && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: '#000',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeUp 0.3s ease both'
        }}>
          <video
            ref={videoRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 1
            }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: 260,
              height: 260,
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: 24,
              position: 'relative',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)'
            }}>
              <div style={{ position: 'absolute', top: -2, left: -2, width: 30, height: 30, borderTop: '4px solid #818cf8', borderLeft: '4px solid #818cf8', borderTopLeftRadius: 24 }} />
              <div style={{ position: 'absolute', top: -2, right: -2, width: 30, height: 30, borderTop: '4px solid #818cf8', borderRight: '4px solid #818cf8', borderTopRightRadius: 24 }} />
              <div style={{ position: 'absolute', bottom: -2, left: -2, width: 30, height: 30, borderBottom: '4px solid #818cf8', borderLeft: '4px solid #818cf8', borderBottomLeftRadius: 24 }} />
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 30, height: 30, borderBottom: '4px solid #818cf8', borderRight: '4px solid #818cf8', borderBottomRightRadius: 24 }} />
              <div style={{ position: 'absolute', left: 0, right: 0, height: '2px', background: 'rgba(140,140,255,0.8)', boxShadow: '0 0 10px rgba(140,140,255,0.8)', animation: 'qrLaser 2s linear infinite' }} />
            </div>
          </div>

          <div style={{
            position: 'relative',
            zIndex: 3,
            padding: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)'
          }}>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>Scan Room QR</span>
            <button
              onClick={() => setIsScanning(false)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)'
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{
            position: 'absolute',
            bottom: 60,
            left: 0,
            right: 0,
            zIndex: 3,
            display: 'flex',
            justifyContent: 'center'
          }}>
            <span style={{
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(10px)',
              padding: '10px 20px',
              borderRadius: 100,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              Point camera at Display
            </span>
          </div>
        </div>
      )}

      <GlowOrbs />
      <Grid />
      <ParticleField />
      <ScanLine />

      <div style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        position: 'relative',
      }}>
        <div style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'none' : 'translateY(16px)',
          transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)',
        }}>

          <PulsingRing />
          <AnimatedWordmark />

          <p style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: '48px',
            animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.55s both',
          }}>
            Wireless presentation control
          </p>

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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              marginBottom: '28px',
              position: 'relative',
              overflow: 'hidden',
              animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.65s both',
            }}
          >
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.6) 50%, transparent 60%)',
              animation: btnHover ? 'shimmerSlide 0.6s ease forwards' : 'none',
              pointerEvents: 'none',
            }} />
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '16px',
              fontWeight: 600,
              color: '#080808',
              letterSpacing: '-0.01em'
            }}>
              <MonitorPlay size={20} color="#080808" /> Launch big screen
            </span>
            <ArrowRight
              size={20}
              color="#080808"
              style={{
                transition: 'transform 0.2s cubic-bezier(0.16,1,0.3,1)',
                transform: btnHover ? 'translateX(4px)' : 'none'
              }}
            />
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            width: '100%',
            marginBottom: '20px',
            animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.75s both'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
            <span style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.18)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase'
            }}>or join a room</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
          </div>

          <form onSubmit={joinScreen} style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.85s both'
          }}>

            <button type="button" className="mobile-only sb-qr-btn" onClick={(e) => { setIsScanning(true); }}>
              <QrCode size={18} />
              <span>Scan Room QR</span>
            </button>

            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none'
              }}>
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
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '14px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '15px 16px 15px 42px',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'border-color 0.2s, background 0.2s'
                }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none'
              }}>
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
                  width: '100%',
                  boxSizing: 'border-box',
                  background: joinError ? 'rgba(200,50,50,0.06)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${joinError ? 'rgba(200,50,50,0.25)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: '14px',
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: 500,
                  fontFamily: "'DM Mono', monospace",
                  letterSpacing: '0.2em',
                  padding: '15px 100px 15px 42px',
                  transition: 'border-color 0.2s, background 0.2s',
                  animation: joinError ? 'errorShake 0.4s ease' : 'none'
                }}
              />
              <button
                type="submit"
                className="sb-join-btn"
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: canJoin ? 'rgba(255,255,255,0.9)' : 'transparent',
                  border: 'none',
                  color: canJoin ? '#080808' : 'transparent',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  cursor: canJoin ? 'pointer' : 'default',
                  pointerEvents: canJoin ? 'auto' : 'none'
                }}
              >
                Join
              </button>
              {joinError && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  animation: 'fadeUp 0.25s ease both'
                }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#e05555',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase'
                  }}>{joinError}</span>
                </div>
              )}
            </div>
          </form>

          <div style={{
            marginTop: '52px',
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
            animation: 'fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 1s both'
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '3px',
                height: '3px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                animation: `dotBlink 2s ease-in-out ${i * 0.3}s infinite`
              }} />
            ))}
          </div>
        </div>
      </div>

      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        padding: '80px 24px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        color: 'rgba(255,255,255,0.6)',
        maxWidth: '800px',
        lineHeight: '1.6',
        boxSizing: 'border-box'
      }}>
        <h2 style={{ color: '#fff', fontSize: '20px', marginBottom: '16px', fontWeight: 600 }}>Control Presentations From Your Phone</h2>
        <p style={{ marginBottom: '32px' }}>
          <strong>SlideBridge lets you easily control and manage presentations from your phone</strong>, including uploading and removing files wirelessly. Turn any mobile device into a powerful presentation remote instantly.
        </p>

        <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '12px', fontWeight: 600 }}>How It Works</h3>
        <ul style={{ marginBottom: '32px', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}><strong>Connect Instantly:</strong> Open SlideBridge on your main screen and scan the secure QR code with your phone. No software or downloads required.</li>
          <li style={{ marginBottom: '8px' }}><strong>Upload Wirelessly:</strong> Upload your PPT or PDF files directly from your phone to the main display.</li>
          <li><strong>Take Control:</strong> Walk away from the laptop. Swipe, click, and manage your slides remotely while engaging with your audience.</li>
        </ul>

        <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '12px', fontWeight: 600 }}>Key Features</h3>
        <ul style={{ marginBottom: '32px', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '8px' }}><strong>Mobile Presentation Remote:</strong> Navigate through your slides smoothly without needing a physical clicker or standing trapped behind a podium.</li>
          <li style={{ marginBottom: '8px' }}><strong>Wireless File Management:</strong> Instantly upload presentations from your phone's local storage or cloud drive directly to the presentation screen.</li>
          <li style={{ marginBottom: '8px' }}><strong>Zero Latency Connection:</strong> Built on real-time web sockets to ensure the slide changes the exact millisecond you tap your screen.</li>
          <li><strong>Secure Sessions:</strong> Unique room codes ensure that only you have control over your specific presentation dashboard.</li>
        </ul>
      </div>

      <CreditPill />
    </div>
  );
};

export default App;