'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Lobby, Player, Round, Submission } from '@/lib/database.types';
import type { ColorRankRoundData, GameConfig, ColorRankAnswer } from '@/lib/game-types';
import { calculateColorRankScore, rankPlayers, COLOR_RANK_ROUNDS } from '@/lib/game-types';
import ColorRankImage from '@/components/ColorRankImage';
import Scoreboard from '@/components/Scoreboard';
import GameSettings from '@/components/GameSettings';

type GamePhase = 'lobby' | 'countdown' | 'playing' | 'round_results' | 'game_over';

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();

  // Session state
  const [playerId, setPlayerId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);
  const [lobbyId, setLobbyId] = useState<string>('');

  // Game state
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState<GamePhase>('lobby');
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [roundData, setRoundData] = useState<ColorRankRoundData | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [showSettings, setShowSettings] = useState(false);

  // Player's answer state
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [roundStartTime, setRoundStartTime] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Initialize from session ───────────────────────────────
  useEffect(() => {
    const pid = sessionStorage.getItem('playerId');
    const lid = sessionStorage.getItem('lobbyId');
    const host = sessionStorage.getItem('isHost') === 'true';

    if (!pid || !lid) {
      router.push(`/lobby/join?code=${code}`);
      return;
    }

    setPlayerId(pid);
    setLobbyId(lid);
    setIsHost(host);
  }, [code, router]);

  // ─── Fetch initial data ────────────────────────────────────
  useEffect(() => {
    if (!lobbyId) return;

    const fetchData = async () => {
      const { data: lobbyData } = await supabase
        .from('lobbies')
        .select('*')
        .eq('id', lobbyId)
        .single() as { data: Lobby | null };

      if (lobbyData) {
        setLobby(lobbyData);
        if (lobbyData.status === 'playing') {
          // Rejoin in-progress game
          const { data: activeRound } = await supabase
            .from('rounds')
            .select('*')
            .eq('lobby_id', lobbyId)
            .eq('status', 'active')
            .order('round_number', { ascending: false })
            .limit(1)
            .single() as { data: Round | null };

          if (activeRound) {
            setCurrentRound(activeRound);
            setRoundData(activeRound.round_data as unknown as ColorRankRoundData);
            setPhase('playing');
            setRoundStartTime(Date.now());

            const config = lobbyData.game_config as unknown as GameConfig;
            setTimeLeft(config?.time_limit_seconds ?? 30);

            // Check if already submitted
            const { data: existingSub } = await supabase
              .from('submissions')
              .select('*')
              .eq('round_id', activeRound.id)
              .eq('player_id', playerId)
              .single() as { data: Submission | null };

            if (existingSub) {
              setHasSubmitted(true);
            }
          }
        }
      }

      const { data: playerData } = await supabase
        .from('players')
        .select('*')
        .eq('lobby_id', lobbyId)
        .order('created_at', { ascending: true }) as { data: Player[] | null };

      if (playerData) setPlayers(playerData);
    };

    fetchData();
  }, [lobbyId, playerId]);

  // ─── Real-time subscriptions ───────────────────────────────
  useEffect(() => {
    if (!lobbyId) return;

    // Listen to lobby changes
    const lobbyChannel = supabase
      .channel(`lobby-${lobbyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lobbies', filter: `id=eq.${lobbyId}` },
        (payload) => {
          const newLobby = payload.new as Lobby;
          setLobby(newLobby);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `lobby_id=eq.${lobbyId}` },
        async () => {
          // Refetch all players on any change
          const { data } = await supabase
            .from('players')
            .select('*')
            .eq('lobby_id', lobbyId)
            .order('created_at', { ascending: true }) as { data: Player[] | null };
          if (data) setPlayers(data);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rounds', filter: `lobby_id=eq.${lobbyId}` },
        (payload) => {
          const newRound = payload.new as Round;
          if (newRound.status === 'active') {
            setCurrentRound(newRound);
            setRoundData(newRound.round_data as unknown as ColorRankRoundData);
            setSelectedColors([]);
            setHasSubmitted(false);
            setSubmissions([]);
            setPhase('countdown');
            setCountdown(3);
          } else if (newRound.status === 'finished') {
            // Fetch submissions for results
            (supabase
              .from('submissions')
              .select('*')
              .eq('round_id', newRound.id) as any)
              .then(({ data }: { data: Submission[] | null }) => {
                if (data) setSubmissions(data);
                setPhase('round_results');
                if (timerRef.current) clearInterval(timerRef.current);
              });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'submissions', filter: `lobby_id=eq.${lobbyId}` },
        async () => {
          if (currentRound) {
            const { data } = await supabase
              .from('submissions')
              .select('*')
              .eq('round_id', currentRound.id) as { data: Submission[] | null };
            if (data) setSubmissions(data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(lobbyChannel);
    };
  }, [lobbyId, currentRound]);

  // ─── Countdown timer ───────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;

    if (countdown <= 0) {
      setPhase('playing');
      setRoundStartTime(Date.now());
      const config = lobby?.game_config as unknown as GameConfig;
      setTimeLeft(config?.time_limit_seconds ?? 30);
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown, lobby]);

  // ─── Game timer ────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || hasSubmitted) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // Auto-submit on timeout
          if (!hasSubmitted) {
            handleSubmit(true);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, hasSubmitted]);

  // ─── Game Actions ──────────────────────────────────────────

  const handleStartGame = async () => {
    if (!isHost || !lobbyId) return;

    // Update lobby status
    await supabase
      .from('lobbies')
      .update({
        status: 'playing',
        current_game: 'color_rank',
        current_round: 0,
      })
      .eq('id', lobbyId);

    // Reset all player scores
    for (const p of players) {
      await supabase
        .from('players')
        .update({ total_score: 0 })
        .eq('id', p.id);
    }

    // Start first round
    await startNewRound(1);
  };

  const startNewRound = async (roundNumber: number) => {
    if (!lobbyId) return;

    const roundDataIndex = (roundNumber - 1) % COLOR_RANK_ROUNDS.length;
    const rd = COLOR_RANK_ROUNDS[roundDataIndex];

    await supabase.from('rounds').insert({
      id: crypto.randomUUID(),
      lobby_id: lobbyId,
      round_number: roundNumber,
      game_type: 'color_rank',
      round_data: rd as any,
      status: 'active',
      started_at: new Date().toISOString(),
    });

    await supabase
      .from('lobbies')
      .update({ current_round: roundNumber })
      .eq('id', lobbyId);
  };

  const handleColorSelect = (hex: string) => {
    if (hasSubmitted) return;

    const config = lobby?.game_config as unknown as GameConfig;
    const topN = config?.top_n_colors ?? 3;

    setSelectedColors((prev) => {
      if (prev.includes(hex)) {
        return prev.filter((c) => c !== hex);
      }
      if (prev.length >= topN) {
        return prev; // Already selected max
      }
      return [...prev, hex];
    });
  };

  const handleSubmit = async (isTimeout = false) => {
    if (hasSubmitted || !currentRound || !playerId) return;

    setHasSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTaken = Date.now() - roundStartTime;
    const answer: ColorRankAnswer = { selected_colors: selectedColors };

    const config = lobby?.game_config as unknown as GameConfig;
    const topN = config?.top_n_colors ?? 3;
    const score = calculateColorRankScore(answer, roundData!.correct_order, topN);

    await supabase.from('submissions').insert({
      id: crypto.randomUUID(),
      round_id: currentRound.id,
      player_id: playerId,
      lobby_id: lobbyId,
      answer: answer as any,
      score,
      time_taken_ms: timeTaken,
    });

    // Update player total score
    const player = players.find((p) => p.id === playerId);
    if (player) {
      await supabase
        .from('players')
        .update({ total_score: (player.total_score || 0) + score })
        .eq('id', playerId);
    }
  };

  const handleEndRound = async () => {
    if (!isHost || !currentRound) return;

    await supabase
      .from('rounds')
      .update({ status: 'finished', ended_at: new Date().toISOString() })
      .eq('id', currentRound.id);
  };

  const handleNextRound = async () => {
    if (!isHost || !lobby) return;

    const nextRound = (lobby.current_round || 0) + 1;
    if (nextRound > lobby.total_rounds) {
      // Game over
      setPhase('game_over');
      await supabase
        .from('lobbies')
        .update({ status: 'waiting', current_game: null, current_round: 0 })
        .eq('id', lobbyId);
      return;
    }

    await startNewRound(nextRound);
  };

  const handleBackToLobby = async () => {
    setPhase('lobby');
    setCurrentRound(null);
    setRoundData(null);
    setSubmissions([]);
    setSelectedColors([]);
    setHasSubmitted(false);

    // Refetch players (scores may have updated)
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('lobby_id', lobbyId)
      .order('created_at', { ascending: true }) as { data: Player[] | null };
    if (data) setPlayers(data);
  };

  const submittedCount = submissions.length;
  const connectedCount = players.filter((p) => p.is_connected).length;

  // ─── Render ────────────────────────────────────────────────

  // Lobby waiting phase
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-white mb-2">Game Lobby</h1>
            <div className="lobby-code">{code}</div>
            <p className="text-slate-400 mt-2 text-sm">
              Share this code with friends to join
            </p>
          </div>

          {/* Players */}
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-white">
                Players ({players.length}/{30})
              </h2>
              {isHost && (
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-slate-400 hover:text-white transition-colors text-sm font-display"
                >
                  ⚙️ Settings
                </button>
              )}
            </div>

            {showSettings && isHost && lobby && (
              <GameSettings
                lobby={lobby}
                onClose={() => setShowSettings(false)}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {players.map((player, i) => (
                <div
                  key={player.id}
                  className="player-card animate-slide-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <span className="text-2xl">{player.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-white truncate">
                      {player.name}
                      {player.id === playerId && (
                        <span className="text-xs text-slate-400 ml-1">(you)</span>
                      )}
                    </div>
                  </div>
                  {player.is_host && (
                    <span className="text-xs bg-party-tertiary/20 text-party-tertiary px-2 py-1 rounded-full font-semibold shrink-0">
                      HOST
                    </span>
                  )}
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      player.is_connected ? 'bg-green-400' : 'bg-slate-500'
                    }`}
                  />
                </div>
              ))}
            </div>

            {players.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <div className="text-4xl mb-2">👀</div>
                <p>Waiting for players to join...</p>
              </div>
            )}
          </div>

          {/* Start Game Button (Host only) */}
          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={players.length < 1}
              className="btn-primary w-full text-xl py-4 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              🎮 Start ColorRank
              {players.length < 1 && (
                <span className="block text-sm font-normal opacity-70 mt-1">
                  Need at least 1 player
                </span>
              )}
            </button>
          )}

          {!isHost && (
            <div className="text-center text-slate-400 font-display">
              Waiting for host to start the game...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Countdown phase
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-xl text-slate-400 mb-4">
            Round {lobby?.current_round || 1} of {lobby?.total_rounds || 5}
          </p>
          <div className="text-9xl font-display font-bold text-party-accent animate-pop neon-text">
            {countdown}
          </div>
          <p className="font-display text-lg text-slate-400 mt-4">Get ready!</p>
        </div>
      </div>
    );
  }

  // Playing phase
  if (phase === 'playing' && roundData) {
    const config = lobby?.game_config as unknown as GameConfig;
    const topN = config?.top_n_colors ?? 3;

    return (
      <div className="min-h-screen px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* Header bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="font-display text-sm text-slate-400">
              Round {lobby?.current_round}/{lobby?.total_rounds}
            </div>
            <div className={`font-mono text-2xl font-bold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-party-tertiary'}`}>
              {timeLeft}s
            </div>
            <div className="font-display text-sm text-slate-400">
              {submittedCount}/{connectedCount} answered
            </div>
          </div>

          {/* Image */}
          <div className="mb-6">
            <ColorRankImage roundData={roundData} />
          </div>

          {/* Instructions */}
          <div className="text-center mb-4">
            <p className="font-display text-lg text-white">
              Pick the top <span className="text-party-accent font-bold">{topN}</span> colors by area coverage
            </p>
            <p className="text-sm text-slate-400">
              Tap colors in order from largest to smallest area
            </p>
          </div>

          {/* Color options */}
          {!hasSubmitted ? (
            <>
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                {roundData.colors.map((color) => {
                  const selectedIndex = selectedColors.indexOf(color.hex);
                  const isSelected = selectedIndex >= 0;

                  return (
                    <button
                      key={color.hex}
                      onClick={() => handleColorSelect(color.hex)}
                      className={`relative group transition-all duration-150 ${
                        isSelected ? 'scale-110' : 'hover:scale-105'
                      }`}
                    >
                      <div
                        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl transition-all ${
                          isSelected
                            ? 'ring-4 ring-white shadow-lg'
                            : 'ring-2 ring-transparent hover:ring-white/30'
                        }`}
                        style={{ backgroundColor: color.hex }}
                      />
                      <div className="mt-1 text-xs text-center text-slate-400 font-display">
                        {color.name}
                      </div>
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-bold text-party-bg animate-pop">
                          {selectedIndex + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected display */}
              <div className="flex justify-center gap-3 mb-6">
                {Array.from({ length: topN }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-12 h-12 rounded-lg border-2 border-dashed transition-all ${
                      selectedColors[i]
                        ? 'border-transparent'
                        : 'border-slate-600'
                    }`}
                    style={selectedColors[i] ? { backgroundColor: selectedColors[i] } : {}}
                  >
                    {!selectedColors[i] && (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs font-display">
                        {i + 1}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSubmit(false)}
                disabled={selectedColors.length !== topN}
                className="btn-primary w-full text-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Lock In Answer
              </button>
            </>
          ) : (
            <div className="text-center py-8 animate-slide-up">
              <div className="text-5xl mb-3">✅</div>
              <p className="font-display text-xl text-party-secondary font-semibold">
                Answer Submitted!
              </p>
              <p className="text-slate-400 mt-2">
                Waiting for other players... ({submittedCount}/{connectedCount})
              </p>
            </div>
          )}

          {/* Host: End Round */}
          {isHost && (
            <button
              onClick={handleEndRound}
              className="mt-4 w-full text-center text-slate-500 hover:text-slate-300 transition-colors font-display text-sm py-2"
            >
              End Round Early →
            </button>
          )}
        </div>
      </div>
    );
  }

  // Round Results
  if (phase === 'round_results') {
    const config = lobby?.game_config as unknown as GameConfig;
    const topN = config?.top_n_colors ?? 3;
    const isLastRound = (lobby?.current_round || 0) >= (lobby?.total_rounds || 5);

    return (
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-center text-white mb-2">
            Round {lobby?.current_round} Results
          </h2>

          {/* Correct answer */}
          {roundData && (
            <div className="glass-card p-4 mb-6">
              <p className="font-display text-sm text-slate-400 mb-2 text-center">
                Correct top {topN} (by area):
              </p>
              <div className="flex justify-center gap-3">
                {roundData.correct_order.slice(0, topN).map((hex, i) => {
                  const color = roundData.colors.find((c) => c.hex === hex);
                  return (
                    <div key={hex} className="text-center">
                      <div
                        className="w-12 h-12 rounded-lg mx-auto mb-1"
                        style={{ backgroundColor: hex }}
                      />
                      <div className="text-xs text-slate-400">{color?.name}</div>
                      <div className="text-xs text-party-tertiary font-mono">{color?.percentage}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Scoreboard
            players={players}
            submissions={submissions}
            playerId={playerId}
            showRoundScore
          />

          {isHost && (
            <div className="mt-6 space-y-3">
              {isLastRound ? (
                <button
                  onClick={() => {
                    setPhase('game_over');
                  }}
                  className="btn-primary w-full text-lg"
                >
                  🏆 See Final Results
                </button>
              ) : (
                <button
                  onClick={handleNextRound}
                  className="btn-primary w-full text-lg"
                >
                  Next Round →
                </button>
              )}
            </div>
          )}

          {!isHost && (
            <p className="text-center text-slate-400 mt-6 font-display">
              {isLastRound
                ? 'Waiting for host to show final results...'
                : 'Waiting for host to start next round...'}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Game Over
  if (phase === 'game_over') {
    const sortedPlayers = [...players].sort((a, b) => b.total_score - a.total_score);

    return (
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="font-display text-4xl font-bold text-party-tertiary mb-2 neon-text">
            Game Over!
          </h2>

          {sortedPlayers.length > 0 && (
            <div className="mb-8">
              <div className="text-5xl mb-2">{sortedPlayers[0].icon}</div>
              <p className="font-display text-2xl font-bold text-white">
                {sortedPlayers[0].name} wins!
              </p>
              <p className="text-party-secondary font-display text-lg">
                {sortedPlayers[0].total_score} points
              </p>
            </div>
          )}

          {/* Final standings */}
          <div className="glass-card p-6 mb-6 text-left">
            <h3 className="font-display text-lg font-semibold text-white mb-4 text-center">
              Final Standings
            </h3>
            <div className="space-y-3">
              {sortedPlayers.map((player, i) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 animate-slide-up"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div
                    className={`rank-badge ${
                      i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'bg-party-border text-slate-300'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="text-2xl">{player.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-white truncate">
                      {player.name}
                      {player.id === playerId && (
                        <span className="text-xs text-slate-400 ml-1">(you)</span>
                      )}
                    </div>
                  </div>
                  <div className="font-mono text-party-tertiary font-bold">
                    {player.total_score} pts
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <div className="space-y-3">
              <button onClick={handleStartGame} className="btn-primary w-full text-lg">
                🔄 Play Again
              </button>
              <button onClick={handleBackToLobby} className="btn-secondary w-full text-lg">
                Back to Lobby
              </button>
            </div>
          )}

          {!isHost && (
            <p className="text-slate-400 font-display">
              Waiting for host...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Loading / fallback
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-float">🎮</div>
        <p className="text-slate-400 font-display">Loading...</p>
      </div>
    </div>
  );
}
