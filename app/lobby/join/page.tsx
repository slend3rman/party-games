'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { PLAYER_ICONS, MAX_PLAYERS_PER_LOBBY } from '@/lib/game-types';

function JoinLobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  const isHost = searchParams.get('host') === 'true';
  const wasKicked = searchParams.get('kicked') === 'true';

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(wasKicked ? 'You were removed from the lobby by the host.' : '');
  const [lobbyExists, setLobbyExists] = useState<boolean | null>(null);

  // Check if lobby exists
  useEffect(() => {
    if (!code) return;
    const check = async () => {
      const { data } = await supabase
        .from('lobbies')
        .select('id, status')
        .eq('code', code.toUpperCase())
        .single();

      if (!data) {
        setLobbyExists(false);
        setError('Lobby not found. Check the code and try again.');
      } else {
        setLobbyExists(true);
      }
    };
    check();
  }, [code]);

  const handleJoin = async () => {
    if (!name.trim()) {
      setError('Enter your name!');
      return;
    }
    if (!selectedIcon) {
      setError('Pick an icon!');
      return;
    }
    if (name.trim().length > 20) {
      setError('Name too long (max 20 characters).');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      // Get lobby
      const { data: lobby, error: lobbyErr } = await supabase
        .from('lobbies')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (lobbyErr || !lobby) throw new Error('Lobby not found');

      // Check player count
      const { count } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('lobby_id', lobby.id);

      if ((count || 0) >= MAX_PLAYERS_PER_LOBBY) {
        setError('Lobby is full!');
        setIsJoining(false);
        return;
      }

      // Create player
      const playerId = crypto.randomUUID();
      const { error: playerErr } = await supabase
        .from('players')
        .insert({
          id: playerId,
          lobby_id: lobby.id,
          name: name.trim(),
          icon: selectedIcon,
          is_host: isHost,
          is_connected: true,
        });

      if (playerErr) throw playerErr;

      // If host, update lobby
      if (isHost) {
        await supabase
          .from('lobbies')
          .update({ host_player_id: playerId })
          .eq('id', lobby.id);
      }

      // Store player info in sessionStorage for this tab
      sessionStorage.setItem('playerId', playerId);
      sessionStorage.setItem('playerName', name.trim());
      sessionStorage.setItem('playerIcon', selectedIcon);
      sessionStorage.setItem('lobbyId', lobby.id);
      sessionStorage.setItem('isHost', isHost.toString());

      // Navigate to lobby
      router.push(`/lobby/${code.toUpperCase()}`);
    } catch (e: any) {
      console.error(e);
      setError('Failed to join. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-slate-500 hover:text-slate-300 transition-colors mb-6 inline-block"
          >
            ← Back
          </button>
          <h1 className="font-display text-4xl font-bold text-white mb-2">
            {isHost ? 'Set Up Your Profile' : 'Join Game'}
          </h1>
          {code && (
            <div className="lobby-code mt-2">{code.toUpperCase()}</div>
          )}
        </div>

        {lobbyExists === false ? (
          <div className="glass-card p-8 text-center">
            <div className="text-5xl mb-4">😢</div>
            <p className="text-red-400 font-display text-lg mb-4">Lobby Not Found</p>
            <p className="text-slate-400 mb-6">The code might be wrong or the lobby has expired.</p>
            <button onClick={() => router.push('/')} className="btn-primary">
              Go Home
            </button>
          </div>
        ) : (
          <div className="glass-card p-8">
            {/* Name Input */}
            <div className="mb-6">
              <label className="block font-display text-sm font-semibold text-slate-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                className="w-full bg-party-bg border border-party-border rounded-xl px-4 py-3 text-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-party-secondary transition-colors font-body"
              />
            </div>

            {/* Icon Selection */}
            <div className="mb-8">
              <label className="block font-display text-sm font-semibold text-slate-300 mb-3">
                Pick Your Icon
              </label>
              <div className="grid grid-cols-6 gap-2">
                {PLAYER_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setSelectedIcon(icon)}
                    className={`w-full aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-150 ${
                      selectedIcon === icon
                        ? 'bg-party-accent/20 border-2 border-party-accent scale-110 shadow-lg shadow-party-accent/20'
                        : 'bg-party-bg/50 border border-party-border hover:bg-party-bg hover:border-party-border/80'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {name && selectedIcon && (
              <div className="mb-6 flex items-center justify-center gap-3 p-4 rounded-xl bg-party-bg/50 animate-slide-up">
                <span className="text-3xl">{selectedIcon}</span>
                <span className="font-display text-xl font-semibold text-white">{name}</span>
                {isHost && (
                  <span className="text-xs bg-party-tertiary/20 text-party-tertiary px-2 py-1 rounded-full font-semibold">
                    HOST
                  </span>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-red-400 text-sm text-center mb-4 animate-slide-up">{error}</p>
            )}

            {/* Join Button */}
            <button
              onClick={handleJoin}
              disabled={isJoining || !name.trim() || !selectedIcon}
              className="btn-primary w-full text-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isJoining ? 'Joining...' : isHost ? 'Create & Enter Lobby' : 'Join Lobby'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function JoinLobbyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 font-display text-xl">Loading...</div>
      </div>
    }>
      <JoinLobbyContent />
    </Suspense>
  );
}
