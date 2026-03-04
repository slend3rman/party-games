'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { generateLobbyCode, DEFAULT_COLORRANK_CONFIG } from '@/lib/game-types';

export default function HomePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setIsCreating(true);
    setError('');

    try {
      const code = generateLobbyCode();
      const { data, error: err } = await supabase
        .from('lobbies')
        .insert({
          id: crypto.randomUUID(),
          code,
          status: 'waiting',
          current_round: 0,
          total_rounds: DEFAULT_COLORRANK_CONFIG.total_rounds,
          game_config: DEFAULT_COLORRANK_CONFIG as any,
        })
        .select('*')
        .single();

      if (err) throw err;

      // Navigate to join page with host flag
      router.push(`/lobby/join?code=${code}&host=true`);
    } catch (e: any) {
      setError('Failed to create lobby. Please try again.');
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = () => {
    if (joinCode.trim().length < 4) {
      setError('Please enter a valid lobby code.');
      return;
    }
    setError('');
    router.push(`/lobby/join?code=${joinCode.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 text-6xl opacity-10 animate-float" style={{ animationDelay: '0s' }}>🎮</div>
        <div className="absolute top-40 right-20 text-5xl opacity-10 animate-float" style={{ animationDelay: '0.5s' }}>🎯</div>
        <div className="absolute bottom-32 left-1/4 text-5xl opacity-10 animate-float" style={{ animationDelay: '1s' }}>🏆</div>
        <div className="absolute bottom-20 right-1/3 text-6xl opacity-10 animate-float" style={{ animationDelay: '1.5s' }}>🎨</div>
        <div className="absolute top-1/3 left-1/3 text-4xl opacity-10 animate-float" style={{ animationDelay: '2s' }}>⭐</div>
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="font-display text-6xl font-bold mb-3 neon-text">
            Party
            <span className="text-party-secondary"> Games</span>
          </h1>
          <p className="text-slate-400 font-body text-lg">
            Play together. No downloads needed.
          </p>
        </div>

        {/* Action cards */}
        <div className="space-y-4">
          {/* Create Lobby */}
          <div className="glass-card p-6">
            <h2 className="font-display text-xl font-semibold text-white mb-3">
              🎉 Host a Game
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Create a lobby and invite your friends with a code.
            </p>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="btn-primary w-full text-lg disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Lobby'}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 px-4">
            <div className="flex-1 h-px bg-party-border" />
            <span className="text-slate-500 font-display text-sm">or</span>
            <div className="flex-1 h-px bg-party-border" />
          </div>

          {/* Join Lobby */}
          <div className="glass-card p-6">
            <h2 className="font-display text-xl font-semibold text-white mb-3">
              🚀 Join a Game
            </h2>
            <p className="text-slate-400 text-sm mb-4">
              Enter the code shared by your host.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="ABCD12"
                maxLength={6}
                className="flex-1 bg-party-bg border border-party-border rounded-xl px-4 py-3 text-center font-mono text-xl tracking-[0.3em] text-party-tertiary placeholder:text-slate-600 focus:outline-none focus:border-party-secondary transition-colors"
              />
              <button
                onClick={handleJoin}
                className="btn-secondary px-6"
              >
                Join
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 text-center text-red-400 text-sm font-medium animate-slide-up">
            {error}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-8">
          Works on any device with a browser
        </p>
      </div>
    </div>
  );
}
