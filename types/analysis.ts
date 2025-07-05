export type AnalysisType = 
  | 'draft_strategy' 
  | 'player_evaluation'
  | 'position_analysis'
  | 'team_analysis'
  | 'waiver_recommendation'
  | 'trade_analysis';

export interface Analysis {
  id: string;
  type: AnalysisType;
  content: string;
  parameters?: Record<string, any>;
  user_id?: string;
  league_id?: string;
  draft_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AnalysisInput {
  type: AnalysisType;
  content: string;
  parameters?: Record<string, any>;
  user_id?: string;
  league_id?: string;
  draft_id?: string;
  metadata?: Record<string, any>;
} 