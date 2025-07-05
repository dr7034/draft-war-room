import { create } from 'zustand';
import { supabase } from './supabase-client';
import { Player, Position } from '@/types/player';
import { League, RosterSettings } from '@/types/league';
import { sleeperAPI } from './sleeper-api';
import { SleeperLeague } from './sleeper-api';
import { StateCreator } from 'zustand';

// Define main store state
interface DataState {
  // Entities
  players: Player[];
  leagues: League[];
  
  // Async state
  isLoading: {
    players: boolean;
    leagues: boolean;
  };
  errors: {
    players: string | null;
    leagues: string | null;
  };
  
  // Metadata
  lastUpdated: {
    players: Date | null;
    leagues: Date | null;
  };
  
  // Selectors
  getPlayersByPosition: (position: Position) => Player[];
  getPlayerById: (id: string) => Player | undefined;
  
  // Actions
  fetchPlayers: () => Promise<void>;
  syncPlayersToSupabase: () => Promise<void>;
  fetchLeagues: (userId: string) => Promise<void>;
  updatePlayer: (player: Player) => Promise<void>;
  savePlayersDirectly: () => Promise<SaveResult>;
}

// Type for database player from Supabase
interface DbPlayer {
  id: string;
  sleeper_id: string;
  name: string;
  position: string;
  team: string | null;
  projected_points: number;
  adp: number;
  tier: number;
  bye_week: number | null;
  injury: string | null;
  stats: Record<string, any>;
  metadata: {
    risk?: string;
    upside?: string;
    recommendation?: string;
  };
  updated_at: string;
}

type SaveResult = {
  success: boolean;
  message: string;
  count?: number;
};

// Create the data store
export const useDataStore = create<DataState>((set, get) => ({
  // Initial state
  players: [],
  leagues: [],
  isLoading: {
    players: false,
    leagues: false,
  },
  errors: {
    players: null,
    leagues: null,
  },
  lastUpdated: {
    players: null,
    leagues: null,
  },
  
  // Selectors
  getPlayersByPosition: (position: Position) => {
    return get().players.filter(player => player.position === position)
      .sort((a, b) => (b.projectedPoints || 0) - (a.projectedPoints || 0));
  },
  
  getPlayerById: (id: string) => {
    return get().players.find(player => player.id === id);
  },
  
  // Actions
  fetchPlayers: async () => {
    try {
      // Set loading state
      set((state: DataState) => ({
        ...state,
        isLoading: { ...state.isLoading, players: true },
        errors: { ...state.errors, players: null }
      }));
      
      // First try Supabase
      const { data: dbPlayers, error } = await supabase
        .from('players')
        .select('*')
        .order('projected_points', { ascending: false });
      
      // If error or no data, fetch from Sleeper API
      if (error || !dbPlayers || dbPlayers.length === 0) {
        console.log('No players in database or error, fetching from Sleeper API');
        
        const sleeperPlayers = await sleeperAPI.getAllPlayers();
        const convertedPlayers = Object.values(sleeperPlayers)
          .filter((p: any) => p.active && p.position)
          .map((p: any) => sleeperAPI.convertToPlayer(p));
        
        // Update state with players from API
        set((state: DataState) => ({
          ...state,
          players: convertedPlayers,
          isLoading: { ...state.isLoading, players: false },
          lastUpdated: { ...state.lastUpdated, players: new Date() }
        }));
        
        // Players will be saved to Supabase by sleeperAPI.getAllPlayers()
        return;
      }
      
      // Map DB players to application model
      const mappedPlayers: Player[] = (dbPlayers as DbPlayer[]).map(dbPlayer => ({
        id: dbPlayer.id,
        name: dbPlayer.name,
        position: dbPlayer.position as Position,
        team: dbPlayer.team || 'FA',
        projectedPoints: dbPlayer.projected_points || 0,
        adp: dbPlayer.adp || 0,
        tier: dbPlayer.tier || 3,
        byeWeek: dbPlayer.bye_week || 0,
        injury: dbPlayer.injury || undefined,
        stats: dbPlayer.stats || {},
        risk: dbPlayer.metadata?.risk as 'low' | 'medium' | 'high' || 'medium',
        upside: dbPlayer.metadata?.upside as 'low' | 'medium' | 'high' || 'medium',
        recommendation: dbPlayer.metadata?.recommendation,
      }));
      
      // Update state with players from DB
      set((state: DataState) => ({
        ...state,
        players: mappedPlayers,
        isLoading: { ...state.isLoading, players: false },
        lastUpdated: { ...state.lastUpdated, players: new Date() }
      }));
      
    } catch (error) {
      console.error('Error fetching players:', error);
      set((state: DataState) => ({
        ...state,
        isLoading: { ...state.isLoading, players: false },
        errors: { ...state.errors, players: (error as Error).message }
      }));
    }
  },
  
  syncPlayersToSupabase: async () => {
    try {
      const players = get().players;
      
      if (!players.length) {
        console.warn('No players to sync to Supabase');
        return;
      }
      
      console.log(`Starting sync of ${players.length} players to Supabase...`);
      
      // Format players for Supabase
      const formattedPlayers = players.map(player => ({
        id: player.id,
        sleeper_id: player.id,
        name: player.name,
        position: player.position,
        team: player.team || null,
        projected_points: player.projectedPoints || 0,
        adp: player.adp || 0,
        tier: player.tier || 3,
        bye_week: player.byeWeek || null,
        injury: player.injury || null,
        stats: player.stats || {},
        metadata: {
          risk: player.risk || 'medium',
          upside: player.upside || 'medium',
          recommendation: player.recommendation || ''
        },
        updated_at: new Date().toISOString()
      }));
      
      // Upsert to Supabase - process in batches to avoid payload size issues
      const BATCH_SIZE = 50;
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < formattedPlayers.length; i += BATCH_SIZE) {
        const batch = formattedPlayers.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${i/BATCH_SIZE + 1} of ${Math.ceil(formattedPlayers.length/BATCH_SIZE)}...`);
        
        try {
          const { error, data } = await supabase
            .from('players')
            .upsert(batch, { 
              onConflict: 'id',
              ignoreDuplicates: false 
            });
          
          if (error) {
            console.error(`Error in batch ${i/BATCH_SIZE + 1}:`, error);
            errorCount += batch.length;
          } else {
            console.log(`Batch ${i/BATCH_SIZE + 1} successful:`, batch.length);
            successCount += batch.length;
          }
        } catch (batchError) {
          console.error(`Failed to process batch ${i/BATCH_SIZE + 1}:`, batchError);
          errorCount += batch.length;
        }
      }
      
      if (errorCount > 0) {
        console.warn(`Sync completed with issues: ${successCount} players saved, ${errorCount} errors`);
      } else {
        console.log(`Successfully synced ${successCount} players to Supabase`);
      }
      
      // Update state
      set((state: DataState) => ({
        ...state,
        lastUpdated: { ...state.lastUpdated, players: new Date() }
      }));
      
    } catch (error) {
      console.error('Error syncing players to Supabase:', error);
      // We don't update state here since this is a background sync
    }
  },
  
  fetchLeagues: async (userId: string) => {
    try {
      // Set loading state
      set((state: DataState) => ({
        ...state,
        isLoading: { ...state.isLoading, leagues: true },
        errors: { ...state.errors, leagues: null }
      }));
      
      // Get current NFL season from Sleeper API
      const nflState = await sleeperAPI.getNFLState();
      const season = nflState.season || '2024';
      
      // Fetch leagues for the user
      const sleeperLeagues = await sleeperAPI.getUserLeagues(userId, season);
      
      // Convert SleeperLeague to League
      const leagues: League[] = sleeperLeagues.map(sl => {
        // Map roster settings correctly
        const rosterSettings: RosterSettings = {
          QB: sl.roster_positions?.filter((pos: string) => pos === 'QB').length || 1,
          RB: sl.roster_positions?.filter((pos: string) => pos === 'RB').length || 2,
          WR: sl.roster_positions?.filter((pos: string) => pos === 'WR').length || 2,
          TE: sl.roster_positions?.filter((pos: string) => pos === 'TE').length || 1,
          FLEX: sl.roster_positions?.filter((pos: string) => pos === 'FLEX').length || 1,
          SFLEX: sl.roster_positions?.filter((pos: string) => pos === 'SUPERFLEX').length || 0,
          K: sl.roster_positions?.filter((pos: string) => pos === 'K').length || 1,
          DEF: sl.roster_positions?.filter((pos: string) => pos === 'DEF').length || 1,
          BENCH: sl.roster_positions?.filter((pos: string) => pos === 'BN').length || 6
        };
        
        // Determine scoring format from settings
        let scoringFormat: 'standard' | 'ppr' | 'half_ppr' = 'standard';
        if (sl.scoring_settings) {
          if (sl.scoring_settings.rec === 1) {
            scoringFormat = 'ppr';
          } else if (sl.scoring_settings.rec === 0.5) {
            scoringFormat = 'half_ppr';
          }
        }
        
        // Build the complete League object
        return {
          id: sl.league_id,
          name: sl.name,
          totalRosters: sl.total_rosters,
          status: sl.status,
          season: sl.season,
          scoringRules: [], // Would need to convert from sl.scoring_settings
          rosterSettings,
          scoringFormat,
          draftId: sl.draft_id
        };
      });
      
      // Update state
      set((state: DataState) => ({
        ...state,
        leagues,
        isLoading: { ...state.isLoading, leagues: false },
        lastUpdated: { ...state.lastUpdated, leagues: new Date() }
      }));
      
    } catch (error) {
      console.error('Error fetching leagues:', error);
      set((state: DataState) => ({
        ...state,
        isLoading: { ...state.isLoading, leagues: false },
        errors: { ...state.errors, leagues: (error as Error).message }
      }));
    }
  },
  
  updatePlayer: async (player: Player) => {
    try {
      // Update locally first (optimistic update)
      set((state: DataState) => ({
        ...state,
        players: state.players.map(p => p.id === player.id ? player : p)
      }));
      
      // Format for Supabase
      const formattedPlayer = {
        id: player.id,
        sleeper_id: player.id,
        name: player.name,
        position: player.position,
        team: player.team || null,
        projected_points: player.projectedPoints || 0,
        adp: player.adp || 0,
        tier: player.tier || 3,
        bye_week: player.byeWeek || null,
        injury: player.injury || null,
        stats: player.stats || {},
        metadata: {
          risk: player.risk || 'medium',
          upside: player.upside || 'medium',
          recommendation: player.recommendation || ''
        },
        updated_at: new Date().toISOString()
      };
      
      // Update in Supabase
      const { error } = await supabase
        .from('players')
        .upsert(formattedPlayer);
      
      if (error) {
        throw new Error(`Failed to update player in Supabase: ${error.message}`);
      }
      
    } catch (error) {
      console.error('Error updating player:', error);
      
      // Revert the optimistic update if there was an error
      get().fetchPlayers();
    }
  },
  
  // Direct save to database
  savePlayersDirectly: async (): Promise<SaveResult> => {
    const players = get().players;
    console.log('savePlayersDirectly called');
    
    if (!players.length) {
      console.warn('No players to save directly');
      return { success: false, message: 'No players to save' };
    }
    
    console.log(`Attempting to save ${players.length} players directly`);
    
    try {
      const response = await fetch('/api/players/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ players }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error saving players directly:', errorData);
        return { 
          success: false, 
          message: `Failed to save players: ${errorData.error || response.statusText}` 
        };
      }
      
      const result = await response.json();
      
      set({ 
        lastUpdated: { 
          ...get().lastUpdated, 
          players: new Date()
        } 
      });
      
      console.log(`Successfully saved ${result.count || players.length} players directly`);
      return { 
        success: true, 
        message: result.message || `Successfully saved ${players.length} players to database`,
        count: result.count 
      };
    } catch (error) {
      console.error('Error saving players directly:', error);
      return { 
        success: false, 
        message: `Error saving players: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}));

// Convenience hooks for components
export function usePlayers() {
  const { 
    players, 
    isLoading: { players: isLoading }, 
    errors: { players: error },
    fetchPlayers,
    syncPlayersToSupabase,
    getPlayersByPosition
  } = useDataStore();
  
  return {
    players,
    isLoading,
    error,
    fetchPlayers,
    syncPlayersToSupabase,
    getPlayersByPosition
  };
}

export function useLeagues() {
  const { 
    leagues, 
    isLoading: { leagues: isLoading }, 
    errors: { leagues: error },
    fetchLeagues
  } = useDataStore();
  
  return {
    leagues,
    isLoading,
    error,
    fetchLeagues
  };
} 