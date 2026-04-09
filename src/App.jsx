import React, { useState, useEffect } from 'react';
import Controller from './components/Controller';
import DisplayScreen from './components/DisplayScreen';
import { MonitorPlay, Smartphone, ArrowRight } from 'lucide-react';

const App = () => {
  const [mode, setMode] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [joinCode, setJoinCode] = useState("");

  // Check the URL to see if they are already in a room
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sid')) setSessionId(params.get('sid'));
    if (params.get('mode')) setMode(params.get('mode'));
  }, []);

  // Generates a random 6-character alphanumeric room code
  const createScreen = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    window.location.href = `?sid=${code}&mode=display`;
  };

  // Submits the form to join a room
  const joinScreen = (e) => {
    e.preventDefault();
    if (joinCode.trim().length > 0) {
      window.location.href = `?sid=${joinCode.trim().toUpperCase()}&mode=mobile`;
    }
  };

  // --- ROUTER ---
  if (sessionId && mode === 'display') return <DisplayScreen sessionId={sessionId} />;
  if (sessionId && mode === 'mobile') return <Controller sessionId={sessionId} />;

  // --- LANDING PAGE UI ---
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 relative overflow-hidden selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-neutral-950 to-neutral-950 pointer-events-none"></div>

      <div className="z-10 w-full max-w-md flex flex-col items-center">
        <div className="bg-white/5 p-4 rounded-full mb-6 border border-white/10 backdrop-blur-md">
          <MonitorPlay size={32} className="text-indigo-400" />
        </div>
        <h1 className="text-5xl font-black mb-2 tracking-tighter bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">SlideBridge.</h1>
        <p className="text-neutral-500 font-medium tracking-wide mb-12">Seamless presentation control.</p>

        {/* Create Display Button */}
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

        {/* Join via Code Form */}
        <form onSubmit={joinScreen} className="w-full relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Smartphone size={20} className="text-neutral-500" />
          </div>
          <input
            type="text"
            placeholder="ENTER 6-DIGIT CODE"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            maxLength={6}
            className="w-full bg-white/5 border border-white/10 text-white placeholder-neutral-600 text-center font-black text-xl tracking-[0.3em] uppercase py-5 rounded-2xl focus:outline-none focus:border-indigo-500 focus:bg-indigo-500/5 transition-all backdrop-blur-md"
          />
          <button
            type="submit"
            className={`absolute inset-y-2 right-2 px-6 rounded-xl font-bold text-sm tracking-widest transition-all ${joinCode.length > 0 ? 'bg-white text-black hover:bg-indigo-500 hover:text-white' : 'bg-transparent text-transparent pointer-events-none'
              }`}
          >
            JOIN
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;