'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Lobby } from '@/lib/database.types';
import type { GameConfig, GameType } from '@/lib/game-types';

interface Props {
  lobby: Lobby;
  gameType: GameType;
  onClose: () => void;
}

export default function GameSettings({ lobby, gameType, onClose }: Props) {
  const config = lobby.game_config as unknown as GameConfig;

  const [rounds, setRounds] = useState(config?.total_rounds ?? 5);
  const [topN, setTopN] = useState(
    config && 'top_n_colors' in config ? config.top_n_colors : 3
  );
  const [timeLimit, setTimeLimit] = useState(config?.time_limit_seconds ?? 30);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);

    const newConfig: GameConfig =
      gameType === 'color_rank'
        ? {
            game_type: 'color_rank',
            total_rounds: rounds,
            top_n_colors: topN,
            time_limit_seconds: timeLimit,
          }
        : {
            game_type: 'question_answer',
            total_rounds: rounds,
            time_limit_seconds: timeLimit,
          };

    await supabase
      .from('lobbies')
      .update({
        game_config: newConfig as any,
        total_rounds: rounds,
      })
      .eq('id', lobby.id);

    setSaving(false);
    onClose();
  };

  const isColorRank = gameType === 'color_rank';

  return (
    <div className="mb-6 p-4 rounded-xl bg-party-bg/60 border border-party-border space-y-4 animate-slide-up">
      <h3 className="font-display font-semibold text-white text-sm">
        {isColorRank ? 'ColorRank Settings' : 'Q&A Settings'}
      </h3>

      <div className={`grid ${isColorRank ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
        <div>
          <label className="block text-xs text-slate-400 mb-1 font-display">Rounds</label>
          <select
            value={rounds}
            onChange={(e) => setRounds(Number(e.target.value))}
            className="w-full bg-party-card border border-party-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-party-secondary"
          >
            {[3, 5, 7, 10].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {isColorRank && (
          <div>
            <label className="block text-xs text-slate-400 mb-1 font-display">Top N Colors</label>
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="w-full bg-party-card border border-party-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-party-secondary"
            >
              {[2, 3, 4].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-400 mb-1 font-display">Time (s)</label>
          <select
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            className="w-full bg-party-card border border-party-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-party-secondary"
          >
            {[15, 20, 30, 45, 60].map((n) => (
              <option key={n} value={n}>{n}s</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-secondary text-sm py-2 px-4"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onClose}
          className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
