export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      lobbies: {
        Row: {
          id: string;
          code: string;
          host_player_id: string | null;
          status: 'waiting' | 'playing' | 'finished';
          current_game: string | null;
          current_round: number;
          total_rounds: number;
          game_config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['lobbies']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['lobbies']['Insert']>;
      };
      players: {
        Row: {
          id: string;
          lobby_id: string;
          name: string;
          icon: string;
          is_host: boolean;
          is_connected: boolean;
          total_score: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['players']['Row'], 'created_at' | 'total_score'>;
        Update: Partial<Database['public']['Tables']['players']['Insert']>;
      };
      rounds: {
        Row: {
          id: string;
          lobby_id: string;
          round_number: number;
          game_type: string;
          round_data: Json;
          status: 'pending' | 'active' | 'finished';
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['rounds']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['rounds']['Insert']>;
      };
      submissions: {
        Row: {
          id: string;
          round_id: string;
          player_id: string;
          lobby_id: string;
          answer: Json;
          score: number;
          time_taken_ms: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['submissions']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['submissions']['Insert']>;
      };
    };
  };
}

// Convenience types
export type Lobby = Database['public']['Tables']['lobbies']['Row'];
export type Player = Database['public']['Tables']['players']['Row'];
export type Round = Database['public']['Tables']['rounds']['Row'];
export type Submission = Database['public']['Tables']['submissions']['Row'];
