export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      leagues: {
        Row: {
          id: string
          sleeper_id: string
          name: string
          total_rosters: number
          status: string
          season: string
          created_at: string
          updated_at: string
          settings: Json
          scoring_settings: Json
          roster_positions: string[]
        }
        Insert: {
          id?: string
          sleeper_id: string
          name: string
          total_rosters: number
          status: string
          season: string
          created_at?: string
          updated_at?: string
          settings?: Json
          scoring_settings?: Json
          roster_positions?: string[]
        }
        Update: {
          id?: string
          sleeper_id?: string
          name?: string
          total_rosters?: number
          status?: string
          season?: string
          created_at?: string
          updated_at?: string
          settings?: Json
          scoring_settings?: Json
          roster_positions?: string[]
        }
      }
      keepers: {
        Row: {
          id: string
          league_id: string
          player_id: string
          original_round: number
          keeper_round: number
          cost: number
          created_at: string
        }
        Insert: {
          id?: string
          league_id: string
          player_id: string
          original_round: number
          keeper_round: number
          cost?: number
          created_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          player_id?: string
          original_round?: number
          keeper_round?: number
          cost?: number
          created_at?: string
        }
      }
      players: {
        Row: {
          id: string
          sleeper_id: string
          name: string
          position: string
          team: string | null
          projected_points: number
          adp: number
          tier: number
          bye_week: number | null
          injury: string | null
          stats: Json
          metadata: Json
          updated_at: string
        }
        Insert: {
          id: string
          sleeper_id: string
          name: string
          position: string
          team?: string | null
          projected_points?: number
          adp?: number
          tier?: number
          bye_week?: number | null
          injury?: string | null
          stats?: Json
          metadata?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          sleeper_id?: string
          name?: string
          position?: string
          team?: string | null
          projected_points?: number
          adp?: number
          tier?: number
          bye_week?: number | null
          injury?: string | null
          stats?: Json
          metadata?: Json
          updated_at?: string
        }
      }
      drafts: {
        Row: {
          id: string
          league_id: string
          sleeper_id: string
          status: string
          type: string
          start_time: string | null
          settings: Json
          draft_order: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          league_id: string
          sleeper_id: string
          status: string
          type: string
          start_time?: string | null
          settings?: Json
          draft_order?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          sleeper_id?: string
          status?: string
          type?: string
          start_time?: string | null
          settings?: Json
          draft_order?: Json
          created_at?: string
          updated_at?: string
        }
      }
      draft_picks: {
        Row: {
          id: string
          draft_id: string
          player_id: string
          pick_number: number
          round: number
          team_id: string
          picked_by: string | null
          picked_at: string
        }
        Insert: {
          id?: string
          draft_id: string
          player_id: string
          pick_number: number
          round: number
          team_id: string
          picked_by?: string | null
          picked_at?: string
        }
        Update: {
          id?: string
          draft_id?: string
          player_id?: string
          pick_number?: number
          round?: number
          team_id?: string
          picked_by?: string | null
          picked_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          league_id: string
          name: string
          owner_id: string | null
          roster: Json
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          league_id: string
          name: string
          owner_id?: string | null
          roster?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          name?: string
          owner_id?: string | null
          roster?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      scoring_rules: {
        Row: {
          id: string
          league_id: string
          category: string
          points: number
          threshold: number | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          league_id: string
          category: string
          points: number
          threshold?: number | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          league_id?: string
          category?: string
          points?: number
          threshold?: number | null
          description?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}