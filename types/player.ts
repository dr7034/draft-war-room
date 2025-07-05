export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF';

export interface PlayerStats {
  passingYards?: number;
  passingTDs?: number;
  interceptions?: number;
  rushingYards?: number;
  rushingTDs?: number;
  receptions?: number;
  receivingYards?: number;
  receivingTDs?: number;
  fumbles?: number;
}

export interface PlayerMetadata {
  height?: string;
  weight?: string;
  birthdate?: string;
  college?: string;
  projection_source?: string;
  espn_projection?: number;
  projection_updated?: string;
}

export interface Player {
  id: string;
  sleeper_id: string;
  name: string;
  position: Position;
  team?: string;
  status?: string;
  injury?: string | null;
  number?: string;
  experience?: number;
  college?: string | null;
  projected_points?: number | null;
  adp?: number;
  tier?: number;
  risk?: 'low' | 'medium' | 'high';
  upside?: 'low' | 'medium' | 'high';
  bye_week?: number | null;
  stats?: Record<string, any>;
  metadata?: PlayerMetadata;
  updated_at?: string;
  // Optional fields that may be added by our application
  draftPosition?: number;
  trend?: 'up' | 'down' | 'stable';
  notes?: string;
  ecr?: number;
  fantasy_pros_ecr?: number;
  recommendation?: string;
  tags?: string[];
  depth_chart_position?: number;
}