import React, { useState, useEffect } from 'react';
import Controller from './components/Controller';
import DisplayScreen from './components/DisplayScreen';
import { MonitorPlay, Smartphone, ArrowRight, User } from 'lucide-react';
import { db } from './firebase';
import { doc, getDoc } from "firebase/firestore";

const App = () => {
  const [mode, setMode] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [userName, setUserName] = useState("");
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sid')) setSessionId(params.get('sid'));
    if (params.get('mode')) setMode(params.get('mode'));
    if (params.get('scan')) setJoinCode(params.get('scan'));
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
        // Check the database BEFORE trying to join
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

        // If it exists and is open, proceed
        window.location.href = `?sid=${code}&mode=mobile&name=${encodeURIComponent(name)}`;
      } catch (err) {
        setJoinError("Connection error");
      }
    }
  };

  if (sessionId && mode === 'display') return <DisplayScreen sessionId={sessionId} />;
  if (sessionId && mode === 'mobile') return <Controller sessionId={sessionId} />;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-neutral-950 to-neutral-950 pointer-events-none"></div>

      <div className="z-10 w-full max-w-md flex flex-col items-center">
        <div className="bg-white/5 p-4 rounded-full mb-6 border border-white/10 backdrop-blur-md">
          <MonitorPlay size={32} className="text-indigo-400" />
        </div>
        <h1 className="text-5xl font-black mb-2 tracking-tighter bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">SlideBridge.</h1>
        <p className="text-neutral-500 font-medium tracking-wide mb-12">Seamless presentation control.</p>

        <button
          onClick={createScreen}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-2xl flex items-center justify-between transition-all duration-300 shadow-xl shadow-indigo-600/20 active:scale-95 group mb-8"
        >
          <span className="flex items-center gap-3 text-lg tracking-wide">
            <MonitorPlay size={24} /> Launch Big Screen
          </span>
          <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
        </button>

        <div className="w-full flex items-center gap-4 mb-8">
          <div className="h-px bg-white/10 flex-1"></div>
          <span className="text-xs font-bold text-neutral-600 uppercase tracking-widest">Or Join a Room</span>
          <div className="h-px bg-white/10 flex-1"></div>
        </div>

        <form onSubmit={joinScreen} className="w-full flex flex-col gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <User size={20} className="text-neutral-500" />
            </div>
            <input
              type="text"
              placeholder="YOUR NAME (E.G. PRADZ)"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              maxLength={15}
              required
              className="w-full bg-white/5 border border-white/10 text-white placeholder-neutral-600 pl-12 pr-4 font-bold tracking-widest uppercase py-4 rounded-2xl focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/5 transition-all backdrop-blur-md"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Smartphone size={20} className="text-neutral-500" />
            </div>
            <input
              type="text"
              placeholder="ENTER 6-DIGIT CODE"
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value); setJoinError(""); }}
              maxLength={6}
              required
              className={`w-full bg-white/5 border text-white placeholder-neutral-600 pl-12 pr-24 font-black text-xl tracking-[0.3em] uppercase py-4 rounded-2xl focus:outline-none transition-all backdrop-blur-md ${joinError ? 'border-red-500/50 bg-red-500/5 focus:border-red-500' : 'border-white/10 focus:border-indigo-500 focus:bg-indigo-500/5'}`}
            />
            <button
              type="submit"
              className={`absolute inset-y-2 right-2 px-6 rounded-xl font-bold text-sm tracking-widest transition-all ${joinCode.length === 6 && userName.trim().length > 0 ? 'bg-white text-black hover:bg-indigo-500 hover:text-white shadow-lg' : 'bg-transparent text-transparent pointer-events-none'
                }`}
            >
              JOIN
            </button>

            {/* The Inline Error Message */}
            {joinError && (
              <div className="absolute -bottom-6 left-0 right-0 text-center animate-in fade-in slide-in-from-top-1">
                <span className="text-[10px] font-bold text-red-500 tracking-widest uppercase">{joinError}</span>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default App;