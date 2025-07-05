import { supabase } from '@/lib/supabase-client';

export type AnalysisType = 
  | 'draft_strategy' 
  | 'player_comparison' 
  | 'team_analysis' 
  | 'trade_analysis'
  | 'position_analysis';

export interface AnalysisParameters {
  position?: string;
  player_count?: number;
  player_ids?: string[];
  league_id?: string;
  [key: string]: any;
}

export interface Analysis {
  id: string;
  type: AnalysisType;
  content: string;
  parameters?: AnalysisParameters;
  user_id?: string;
  created_at: string;
}

export interface CreateAnalysisInput {
  type: AnalysisType;
  content: string;
  parameters?: AnalysisParameters;
  user_id?: string;
  league_id?: string;
  draft_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Save a new analysis to the database
 */
export async function saveAnalysis(input: CreateAnalysisInput): Promise<Analysis> {
  const { type, content, parameters, user_id, league_id, draft_id, metadata } = input;
  
  const { data, error } = await supabase
    .from('analyses')
    .insert({
      type,
      content,
      parameters,
      user_id,
      league_id,
      draft_id,
      metadata,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    throw error;
  }
  
  return {
    ...data,
    parameters: data.parameters ? JSON.parse(data.parameters as string) : undefined,
  } as Analysis;
}

/**
 * Get analyses by type, with optional limit
 */
export async function getAnalysesByType(
  type: AnalysisType, 
  limit: number = 5
): Promise<Analysis[]> {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    throw error;
  }
  
  return (data || []).map((analysis: any) => ({
    ...analysis,
    parameters: analysis.parameters ? JSON.parse(analysis.parameters as string) : undefined,
  }));
}

/**
 * Get analyses by user, with optional type filter and limit
 */
export async function getAnalysesByUser(
  userId: string,
  type?: AnalysisType,
  limit: number = 10
): Promise<Analysis[]> {
  let query = supabase
    .from('analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (type) {
    query = query.eq('type', type);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw error;
  }
  
  return (data || []).map((analysis: any) => ({
    ...analysis,
    parameters: analysis.parameters ? JSON.parse(analysis.parameters as string) : undefined,
  }));
}

/**
 * Get a single analysis by ID
 */
export async function getAnalysisById(id: string): Promise<Analysis | null> {
  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }
  
  return {
    ...data,
    parameters: data.parameters ? JSON.parse(data.parameters as string) : undefined,
  } as Analysis;
}

/**
 * Delete an analysis by ID
 */
export async function deleteAnalysis(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('analyses')
    .delete()
    .eq('id', id);
  
  if (error) {
    throw error;
  }
  
  return true;
} 