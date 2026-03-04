// Player avatar icons - fun emoji-based icons
export const PLAYER_ICONS = [
  '🦊', '🐸', '🦄', '🐙', '🦋', '🐼',
  '🦁', '🐯', '🐨', '🐮', '🐷', '🐵',
  '🦈', '🦅', '🐢', '🦉', '🐝', '🦩',
  '🐲', '🦖', '🐳', '🦜', '🐺', '🦝',
  '🦎', '🐡', '🦚', '🐞', '🦀', '🐘',
];

export const MAX_PLAYERS_PER_LOBBY = 30;

export type GameType = 'color_rank';

export interface GameConfig {
  game_type: GameType;
  total_rounds: number;
  top_n_colors: number; // how many top colors players must pick
  time_limit_seconds: number;
}

export const DEFAULT_COLORRANK_CONFIG: GameConfig = {
  game_type: 'color_rank',
  total_rounds: 5,
  top_n_colors: 3,
  time_limit_seconds: 30,
};

// ColorRank specific types
export interface ColorRankRoundData {
  image_url: string;
  colors: ColorOption[];
  correct_order: string[]; // color hex values in order of area coverage
}

export interface ColorOption {
  hex: string;
  name: string;
  percentage: number; // actual area percentage (hidden from players)
}

export interface ColorRankAnswer {
  selected_colors: string[]; // hex values in order player ranked them
}

// Scoring
export function calculateColorRankScore(
  answer: ColorRankAnswer,
  correctOrder: string[],
  topN: number
): number {
  const correctTopN = correctOrder.slice(0, topN);
  let score = 0;

  // 1 point for each correct color in the top N (regardless of order)
  for (const color of answer.selected_colors) {
    if (correctTopN.includes(color)) {
      score += 1;
    }
  }

  return score;
}

// Ranking: sort by score DESC, then time ASC
export function rankPlayers(
  results: { player_id: string; score: number; time_taken_ms: number }[]
): { player_id: string; score: number; time_taken_ms: number; rank: number }[] {
  const sorted = [...results].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.time_taken_ms - b.time_taken_ms;
  });

  return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
}

// Pre-built ColorRank rounds with procedurally described images
// In production, you'd use actual images. For now we generate colored canvases.
export const COLOR_RANK_ROUNDS: ColorRankRoundData[] = [
  {
    image_url: '/generated',
    colors: [
      { hex: '#FF6B6B', name: 'Coral Red', percentage: 35 },
      { hex: '#4ECDC4', name: 'Teal', percentage: 25 },
      { hex: '#FFE66D', name: 'Sunny Yellow', percentage: 20 },
      { hex: '#A855F7', name: 'Purple', percentage: 12 },
      { hex: '#3B82F6', name: 'Blue', percentage: 8 },
    ],
    correct_order: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A855F7', '#3B82F6'],
  },
  {
    image_url: '/generated',
    colors: [
      { hex: '#22C55E', name: 'Green', percentage: 30 },
      { hex: '#EC4899', name: 'Pink', percentage: 28 },
      { hex: '#F97316', name: 'Orange', percentage: 18 },
      { hex: '#06B6D4', name: 'Cyan', percentage: 14 },
      { hex: '#8B5CF6', name: 'Violet', percentage: 10 },
    ],
    correct_order: ['#22C55E', '#EC4899', '#F97316', '#06B6D4', '#8B5CF6'],
  },
  {
    image_url: '/generated',
    colors: [
      { hex: '#EAB308', name: 'Gold', percentage: 32 },
      { hex: '#EF4444', name: 'Red', percentage: 24 },
      { hex: '#14B8A6', name: 'Teal', percentage: 22 },
      { hex: '#6366F1', name: 'Indigo', percentage: 15 },
      { hex: '#F472B6', name: 'Rose', percentage: 7 },
    ],
    correct_order: ['#EAB308', '#EF4444', '#14B8A6', '#6366F1', '#F472B6'],
  },
  {
    image_url: '/generated',
    colors: [
      { hex: '#3B82F6', name: 'Blue', percentage: 33 },
      { hex: '#F59E0B', name: 'Amber', percentage: 27 },
      { hex: '#10B981', name: 'Emerald', percentage: 20 },
      { hex: '#EF4444', name: 'Red', percentage: 13 },
      { hex: '#8B5CF6', name: 'Violet', percentage: 7 },
    ],
    correct_order: ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6'],
  },
  {
    image_url: '/generated',
    colors: [
      { hex: '#EC4899', name: 'Pink', percentage: 29 },
      { hex: '#06B6D4', name: 'Cyan', percentage: 26 },
      { hex: '#F97316', name: 'Orange', percentage: 21 },
      { hex: '#22C55E', name: 'Green', percentage: 16 },
      { hex: '#A855F7', name: 'Purple', percentage: 8 },
    ],
    correct_order: ['#EC4899', '#06B6D4', '#F97316', '#22C55E', '#A855F7'],
  },
  {
    image_url: '/generated',
    colors: [
      { hex: '#8B5CF6', name: 'Violet', percentage: 31 },
      { hex: '#F43F5E', name: 'Rose', percentage: 25 },
      { hex: '#0EA5E9', name: 'Sky Blue', percentage: 22 },
      { hex: '#84CC16', name: 'Lime', percentage: 14 },
      { hex: '#F59E0B', name: 'Amber', percentage: 8 },
    ],
    correct_order: ['#8B5CF6', '#F43F5E', '#0EA5E9', '#84CC16', '#F59E0B'],
  },
  {
    image_url: '/generated',
    colors: [
      { hex: '#14B8A6', name: 'Teal', percentage: 28 },
      { hex: '#E11D48', name: 'Crimson', percentage: 26 },
      { hex: '#FACC15', name: 'Yellow', percentage: 24 },
      { hex: '#7C3AED', name: 'Purple', percentage: 14 },
      { hex: '#2563EB', name: 'Royal Blue', percentage: 8 },
    ],
    correct_order: ['#14B8A6', '#E11D48', '#FACC15', '#7C3AED', '#2563EB'],
  },
  {
    image_url: '/generated',
    colors: [
      { hex: '#D946EF', name: 'Fuchsia', percentage: 34 },
      { hex: '#0891B2', name: 'Dark Cyan', percentage: 23 },
      { hex: '#65A30D', name: 'Olive', percentage: 19 },
      { hex: '#DC2626', name: 'Red', percentage: 15 },
      { hex: '#CA8A04', name: 'Dark Gold', percentage: 9 },
    ],
    correct_order: ['#D946EF', '#0891B2', '#65A30D', '#DC2626', '#CA8A04'],
  },
];

// Utility to generate a lobby code
export function generateLobbyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
