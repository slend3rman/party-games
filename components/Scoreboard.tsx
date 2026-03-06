'use client';

import type { Player, Submission } from '@/lib/database.types';
import { rankPlayers } from '@/lib/game-types';

interface Props {
  players: Player[];
  submissions: Submission[];
  playerId: string;
  showRoundScore?: boolean;
  isHost?: boolean;
  onKickPlayer?: (playerId: string) => void;
}

export default function Scoreboard({ players, submissions, playerId, showRoundScore, isHost, onKickPlayer }: Props) {
  // Build ranked results for this round
  const roundResults = submissions.map((sub) => ({
    player_id: sub.player_id,
    score: sub.score,
    time_taken_ms: sub.time_taken_ms,
  }));

  const ranked = rankPlayers(roundResults);

  // Include players who didn't submit
  const submittedPlayerIds = new Set(submissions.map((s) => s.player_id));
  const nonSubmitters = players
    .filter((p) => !submittedPlayerIds.has(p.id))
    .map((p) => ({
      player_id: p.id,
      score: 0,
      time_taken_ms: 999999,
      rank: ranked.length + 1,
    }));

  const allRanked = [...ranked, ...nonSubmitters];

  return (
    <div className="glass-card p-6">
      <div className="space-y-3">
        {allRanked.map((result, i) => {
          const player = players.find((p) => p.id === result.player_id);
          if (!player) return null;

          const isMe = result.player_id === playerId;
          const rank = result.rank;

          return (
            <div
              key={result.player_id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all animate-slide-up ${
                isMe ? 'bg-party-accent/10 border border-party-accent/20' : 'bg-party-bg/30'
              }`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              {/* Rank */}
              <div
                className={`rank-badge ${
                  rank === 1
                    ? 'rank-1'
                    : rank === 2
                    ? 'rank-2'
                    : rank === 3
                    ? 'rank-3'
                    : 'bg-party-border text-slate-400'
                }`}
              >
                {rank}
              </div>

              {/* Player */}
              <span className="text-2xl">{player.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-display font-semibold text-white truncate">
                  {player.name}
                  {isMe && <span className="text-xs text-slate-400 ml-1">(you)</span>}
                </div>
                {showRoundScore && (
                  <div className="text-xs text-slate-400">
                    {result.score > 0
                      ? `${result.score} correct · ${(result.time_taken_ms / 1000).toFixed(1)}s`
                      : result.time_taken_ms >= 999999
                      ? 'No answer'
                      : `0 correct · ${(result.time_taken_ms / 1000).toFixed(1)}s`}
                  </div>
                )}
              </div>

              {/* Round score */}
              {showRoundScore && (
                <div className="text-right shrink-0">
                  <div className="font-mono text-party-secondary font-bold">
                    +{result.score}
                  </div>
                </div>
              )}

              {/* Total score */}
              <div className="text-right shrink-0 ml-2">
                <div className="font-mono text-party-tertiary font-bold text-lg">
                  {player.total_score}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">total</div>
              </div>

              {/* Kick button */}
              {isHost && !player.is_host && onKickPlayer && (
                <button
                  onClick={() => onKickPlayer(player.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors text-sm shrink-0 ml-1"
                  title="Kick player"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
