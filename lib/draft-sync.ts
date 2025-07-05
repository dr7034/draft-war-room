import { sleeperAPI } from './sleeper-api';
import { supabase } from './supabase';
import { Player } from '@/types/player';

export class DraftSync {
  private static instance: DraftSync;
  private constructor() {}

  static getInstance(): DraftSync {
    if (!DraftSync.instance) {
      DraftSync.instance = new DraftSync();
    }
    return DraftSync.instance;
  }

  async syncLeague(sleeper_id: string) {
    try {
      // Get league data from Sleeper
      const league = await sleeperAPI.getLeague(sleeper_id);
      
      // Insert or update league in Supabase
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .upsert({
          sleeper_id: sleeper_id,
          name: league.name,
          total_rosters: league.total_rosters,
          status: league.status,
          season: league.season,
          settings: league.settings,
          scoring_settings: league.scoring_settings,
          roster_positions: league.roster_positions,
        })
        .select()
        .single();

      if (leagueError) throw leagueError;

      return leagueData;
    } catch (error) {
      console.error('Error syncing league:', error);
      throw error;
    }
  }

  async syncPlayers() {
    try {
      // Get all players from Sleeper
      const players = await sleeperAPI.getAllPlayers();
      
      // Convert to our format and prepare for batch insert
      const formattedPlayers = Object.values(players)
        .filter(p => p.active && p.position)
        .map(p => ({
          id: p.player_id,
          sleeper_id: p.player_id,
          name: `${p.first_name} ${p.last_name}`,
          position: p.position,
          team: p.team || 'FA',
          metadata: {
            age: p.age,
            number: p.number,
            status: p.status,
            injury_status: p.injury_status,
            depth_chart_position: p.depth_chart_position,
            years_exp: p.years_exp,
          }
        }));

      // Batch insert/update players
      const { error } = await supabase
        .from('players')
        .upsert(formattedPlayers);

      if (error) throw error;
    } catch (error) {
      console.error('Error syncing players:', error);
      throw error;
    }
  }

  async syncDraft(draftId: string) {
    try {
      // Get draft data from Sleeper
      const draft = await sleeperAPI.getDraft(draftId);
      const picks = await sleeperAPI.getDraftPicks(draftId);
      
      // Insert or update draft in Supabase
      const { data: draftData, error: draftError } = await supabase
        .from('drafts')
        .upsert({
          sleeper_id: draftId,
          status: draft.status,
          type: draft.type,
          start_time: new Date(draft.start_time),
          settings: draft.settings,
          draft_order: draft.draft_order,
        })
        .select()
        .single();

      if (draftError) throw draftError;

      // Insert draft picks
      if (picks.length > 0) {
        const formattedPicks = picks.map((pick, index) => ({
          draft_id: draftData.id,
          player_id: pick.player_id,
          pick_number: index + 1,
          round: Math.floor(index / draft.settings.teams) + 1,
          team_id: pick.roster_id,
          picked_by: pick.picked_by,
          picked_at: new Date(pick.picked_at || Date.now()),
        }));

        const { error: picksError } = await supabase
          .from('draft_picks')
          .upsert(formattedPicks);

        if (picksError) throw picksError;
      }

      return draftData;
    } catch (error) {
      console.error('Error syncing draft:', error);
      throw error;
    }
  }

  async updatePlayerProjections(players: Player[]) {
    try {
      const updates = players.map(player => ({
        id: player.id,
        projected_points: player.projectedPoints,
        adp: player.adp,
        tier: player.tier,
        stats: player.stats,
      }));

      const { error } = await supabase
        .from('players')
        .upsert(updates);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating player projections:', error);
      throw error;
    }
  }
}

export const draftSync = DraftSync.getInstance();