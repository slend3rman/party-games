import { supabase } from './supabase';
import {
  generateLobbyCode,
  DEFAULT_COLORRANK_CONFIG,
  COLOR_RANK_ROUNDS,
  calculateColorRankScore,
  type ColorRankAnswer,
  type ColorRankRoundData,
  type GameConfig,
} from './game-types';
import type { Lobby, Player, Round, Submission } from './database.types';

// ─── Lobby Management ────────────────────────────────────────

export async function createLobby(): Promise<{ lobby: Lobby; code: string } | null> {
  const code = generateLobbyCode();

  const { data, error } = await supabase
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

  if (error) {
    console.error('Error creating lobby:', error);
    return null;
  }

  return { lobby: data, code };
}

export async function getLobbyByCode(code: string): Promise<Lobby | null> {
  const { data, error } = await supabase
    .from('lobbies')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error) return null;
  return data;
}

export async function getLobby(id: string): Promise<Lobby | null> {
  const { data, error } = await supabase
    .from('lobbies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

// ─── Player Management ───────────────────────────────────────

export async function joinLobby(
  lobbyId: string,
  name: string,
  icon: string,
  isHost: boolean = false
): Promise<Player | null> {
  const playerId = crypto.randomUUID();

  const { data, error } = await supabase
    .from('players')
    .insert({
      id: playerId,
      lobby_id: lobbyId,
      name,
      icon,
      is_host: isHost,
      is_connected: true,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error joining lobby:', error);
    return null;
  }

  // If host, update lobby's host_player_id
  if (isHost) {
    await supabase
      .from('lobbies')
      .update({ host_player_id: playerId })
      .eq('id', lobbyId);
  }

  return data;
}

export async function getPlayers(lobbyId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('lobby_id', lobbyId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data;
}

export async function updatePlayerConnection(
  playerId: string,
  isConnected: boolean
): Promise<void> {
  await supabase
    .from('players')
    .update({ is_connected: isConnected })
    .eq('id', playerId);
}

// ─── Game Flow ───────────────────────────────────────────────

export async function startGame(lobbyId: string): Promise<boolean> {
  const { error } = await supabase
    .from('lobbies')
    .update({
      status: 'playing',
      current_game: 'color_rank',
      current_round: 0,
    })
    .eq('id', lobbyId);

  if (error) {
    console.error('Error starting game:', error);
    return false;
  }

  return true;
}

export async function startNextRound(lobbyId: string): Promise<Round | null> {
  // Get current lobby state
  const lobby = await getLobby(lobbyId);
  if (!lobby) return null;

  const nextRoundNumber = lobby.current_round + 1;
  if (nextRoundNumber > lobby.total_rounds) return null;

  // Pick round data (cycle through available rounds)
  const roundDataIndex = (nextRoundNumber - 1) % COLOR_RANK_ROUNDS.length;
  const roundData = COLOR_RANK_ROUNDS[roundDataIndex];

  // Update lobby current_round BEFORE inserting the round, so that when the
  // real-time subscription fires for the new round, lobby.current_round is
  // already correct for display.
  await supabase
    .from('lobbies')
    .update({ current_round: nextRoundNumber })
    .eq('id', lobbyId);

  // Create the round
  const { data: round, error } = await supabase
    .from('rounds')
    .insert({
      id: crypto.randomUUID(),
      lobby_id: lobbyId,
      round_number: nextRoundNumber,
      game_type: 'color_rank',
      round_data: roundData as any,
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating round:', error);
    return null;
  }

  return round;
}

export async function submitAnswer(
  roundId: string,
  playerId: string,
  lobbyId: string,
  answer: ColorRankAnswer,
  timeTakenMs: number
): Promise<Submission | null> {
  // Get round data to calculate score
  const { data: round } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', roundId)
    .single();

  if (!round) return null;

  const roundData = round.round_data as unknown as ColorRankRoundData;

  // Get game config for topN
  const { data: lobby } = await supabase
    .from('lobbies')
    .select('game_config')
    .eq('id', lobbyId)
    .single();

  const config = lobby?.game_config as unknown as GameConfig;
  const topN = config?.top_n_colors ?? 3;

  const score = calculateColorRankScore(answer, roundData.correct_order, topN);

  const { data: submission, error } = await supabase
    .from('submissions')
    .insert({
      id: crypto.randomUUID(),
      round_id: roundId,
      player_id: playerId,
      lobby_id: lobbyId,
      answer: answer as any,
      score,
      time_taken_ms: timeTakenMs,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error submitting answer:', error);
    return null;
  }

  // Update player's total score
  await supabase.rpc('increment_player_score', {
    p_player_id: playerId,
    p_score: score,
  }).then(({ error }) => {
    // If RPC doesn't exist, do it manually
    if (error) {
      supabase
        .from('players')
        .select('total_score')
        .eq('id', playerId)
        .single()
        .then(({ data }) => {
          if (data) {
            supabase
              .from('players')
              .update({ total_score: (data.total_score || 0) + score })
              .eq('id', playerId);
          }
        });
    }
  });

  return submission;
}

export async function endRound(roundId: string): Promise<void> {
  await supabase
    .from('rounds')
    .update({
      status: 'finished',
      ended_at: new Date().toISOString(),
    })
    .eq('id', roundId);
}

export async function endGame(lobbyId: string): Promise<void> {
  await supabase
    .from('lobbies')
    .update({
      status: 'waiting',
      current_game: null,
      current_round: 0,
    })
    .eq('id', lobbyId);
}

export async function getRoundSubmissions(roundId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('round_id', roundId)
    .order('score', { ascending: false });

  if (error) return [];
  return data;
}

export async function getCurrentRound(lobbyId: string): Promise<Round | null> {
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('lobby_id', lobbyId)
    .eq('status', 'active')
    .order('round_number', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

export async function updateGameConfig(
  lobbyId: string,
  config: Partial<GameConfig>
): Promise<void> {
  const lobby = await getLobby(lobbyId);
  if (!lobby) return;

  const currentConfig = lobby.game_config as unknown as GameConfig;
  const newConfig = { ...currentConfig, ...config };

  await supabase
    .from('lobbies')
    .update({
      game_config: newConfig as any,
      total_rounds: newConfig.total_rounds,
    })
    .eq('id', lobbyId);
}
