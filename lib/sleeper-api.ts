"use client"

import { Player } from '@/types/player';
import { supabase } from './supabase-client';

const BASE_URL = 'https://api.sleeper.app/v1';

export interface SleeperPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  position: string;
  team: string;
  age: number;
  number: number;
  status: string;
  injury_status: string | null;
  depth_chart_position: number | null;
  years_exp: number;
  fantasy_positions: string[];
  stats?: any;
  projected_stats?: any;
  active?: boolean;
  college?: string;
  height?: string;
  weight?: string;
  birth_date?: string;
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  total_rosters: number;
  status: string;
  sport: string;
  settings: any;
  season: string;
  scoring_settings: any;
  roster_positions: string[];
  draft_id: string;
}

export interface SleeperDraft {
  draft_id: string;
  status: string;
  type: string;
  settings: {
    teams: number;
    rounds: number;
    pick_timer: number;
  };
  start_time: number;
  league_id: string;
  metadata: {
    scoring_type: string;
    name: string;
  };
  draft_order?: Record<string, number>;
}

export interface SleeperRoster {
  starters: string[];
  settings: {
    wins: number;
    waiver_position: number;
    waiver_budget_used: number;
    total_moves: number;
    ties: number;
    losses: number;
    fpts_decimal: number;
    fpts_against_decimal: number;
    fpts_against: number;
    fpts: number;
  };
  roster_id: number;
  reserve: string[];
  players: string[];
  owner_id: string;
  league_id: string;
}

class SleeperAPI {
  private static instance: SleeperAPI;
  private playerCache: Map<string, SleeperPlayer> = new Map();
  private lastPlayerUpdate: number = 0;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {}

  static getInstance(): SleeperAPI {
    if (!SleeperAPI.instance) {
      SleeperAPI.instance = new SleeperAPI();
    }
    return SleeperAPI.instance;
  }

  private async fetchJson<T>(endpoint: string): Promise<T> {
    try {
      const url = `${BASE_URL}${endpoint}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Resource not found at ${url}. Please check if the endpoint is correct and all parameters are valid.`);
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data) {
        throw new Error(`No data received from ${url}`);
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      throw error;
    }
  }

  async getUser(username: string) {
    if (!username) {
      throw new Error('Username is required');
    }
    return this.fetchJson<any>(`/user/${username}`);
  }

  async getUserLeagues(userId: string, season: string) {
    if (!userId || !season) {
      throw new Error('User ID and season are required');
    }
    return this.fetchJson<SleeperLeague[]>(`/user/${userId}/leagues/nfl/${season}`);
  }

  async getLeague(leagueId: string) {
    if (!leagueId) {
      throw new Error('League ID is required');
    }
    return this.fetchJson<SleeperLeague>(`/league/${leagueId}`);
  }

  async getLeagueUsers(leagueId: string) {
    if (!leagueId) {
      throw new Error('League ID is required');
    }
    return this.fetchJson<any[]>(`/league/${leagueId}/users`);
  }

  async getDraft(draftId: string) {
    if (!draftId) {
      throw new Error('Draft ID is required');
    }
    return this.fetchJson<SleeperDraft>(`/draft/${draftId}`);
  }

  async getDraftPicks(draftId: string) {
    if (!draftId) {
      throw new Error('Draft ID is required');
    }
    try {
      return await this.fetchJson<any[]>(`/draft/${draftId}/picks`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        // If draft doesn't exist yet or has no picks, return empty array
        return [];
      }
      throw error;
    }
  }

  async getAllPlayers(): Promise<Record<string, SleeperPlayer>> {
    // Check if we need to update the cache
    const now = Date.now();
    if (this.playerCache.size > 0 && now - this.lastPlayerUpdate < this.CACHE_DURATION) {
      return Object.fromEntries(this.playerCache);
    }

    try {
      const players = await this.fetchJson<Record<string, SleeperPlayer>>('/players/nfl');
      
      // Update cache
      this.playerCache.clear();
      Object.entries(players).forEach(([id, player]) => {
        this.playerCache.set(id, player);
      });
      this.lastPlayerUpdate = now;

      // Save to Supabase
      const validPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
      const formattedPlayers = Object.values(players)
        .filter(p => p.active && p.position && validPositions.includes(p.position) && p.team)
        .map(p => ({
          id: p.player_id,
          sleeper_id: p.player_id,
          name: p.full_name || `${p.first_name} ${p.last_name}`,
          position: p.position,
          team: p.team,
          status: p.status || 'Active',
          injury: p.injury_status || null,
          number: p.number,
          experience: p.years_exp || 0,
          college: p.college || null,
          projected_points: 0,
          adp: 0,
          tier: 3,
          risk: 'medium',
          upside: 'medium',
          bye_week: null,
          stats: {},
          metadata: {
            height: p.height,
            weight: p.weight,
            birthdate: p.birth_date,
            college: p.college
          },
          updated_at: new Date().toISOString()
        }));

      // Save to Supabase asynchronously
      if (formattedPlayers.length > 0) {
        console.log(`Saving ${formattedPlayers.length} players to Supabase...`);
        const { error } = await supabase
          .from('players')
          .upsert(formattedPlayers, {
            onConflict: 'sleeper_id',
            ignoreDuplicates: false
          });

        if (error) {
          console.error('Error saving players to Supabase:', error);
        } else {
          console.log(`Successfully saved ${formattedPlayers.length} players to Supabase`);
        }
      }

      return players;
    } catch (error) {
      // If cache exists but update fails, return cached data
      if (this.playerCache.size > 0) {
        console.warn('Failed to update player cache, using cached data:', error);
        return Object.fromEntries(this.playerCache);
      }
      throw error;
    }
  }

  async getTrendingPlayers(type: 'add' | 'drop' = 'add', lookbackHours: number = 24, limit: number = 25) {
    try {
      return await this.fetchJson<Array<{ player_id: string; count: number }>>(
        `/players/nfl/trending/${type}?lookback_hours=${lookbackHours}&limit=${limit}`
      );
    } catch (error) {
      // If trending data fails, return empty array
      console.warn('Failed to fetch trending players:', error);
      return [];
    }
  }

  async getNFLState() {
    return this.fetchJson<any>('/state/nfl');
  }

  async getStats(season: string, week?: number) {
    if (!season) {
      throw new Error('Season is required');
    }
    const weekParam = week ? `/week/${week}` : '';
    try {
      return await this.fetchJson<any>(`/stats/nfl/${season}${weekParam}`);
    } catch (error) {
      console.warn('Failed to fetch stats:', error);
      return {};
    }
  }

  async getLeagueRosters(leagueId: string) {
    if (!leagueId) {
      throw new Error('League ID is required');
    }
    return this.fetchJson<SleeperRoster[]>(`/league/${leagueId}/rosters`);
  }

  async getLeagueDrafts(leagueId: string) {
    if (!leagueId) {
      throw new Error('League ID is required');
    }
    return this.fetchJson<any[]>(`/league/${leagueId}/drafts`);
  }

  async getDraftTradedPicks(draftId: string) {
    if (!draftId) {
      throw new Error('Draft ID is required');
    }
    try {
      return await this.fetchJson<any[]>(`/draft/${draftId}/traded_picks`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return [];
      }
      throw error;
    }
  }

  async getLeagueTransactions(leagueId: string, round: number = 1) {
    if (!leagueId) {
      throw new Error('League ID is required');
    }
    try {
      return await this.fetchJson<any[]>(`/league/${leagueId}/transactions/${round}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return [];
      }
      throw error;
    }
  }

  // Helper method to convert Sleeper player to our Player type
  convertToPlayer(sleeperPlayer: SleeperPlayer): Player {
    const projectedPoints = this.calculateProjectedPoints(sleeperPlayer);
    const stats = this.convertStats(sleeperPlayer);
    
    return {
      id: sleeperPlayer.player_id,
      sleeper_id: sleeperPlayer.player_id,
      name: `${sleeperPlayer.first_name} ${sleeperPlayer.last_name}`,
      position: sleeperPlayer.position as any,
      team: sleeperPlayer.team || 'FA',
      projected_points: projectedPoints,
      adp: 0, // Set by trending data
      tier: this.calculateTier(projectedPoints || 0, sleeperPlayer.position),
      bye_week: null, // Set by NFL state or FFC merge
      injury: sleeperPlayer.injury_status || undefined,
      stats,
      trend: 'stable',
      risk: this.calculateRisk(sleeperPlayer),
      upside: this.calculateUpside(projectedPoints || 0, sleeperPlayer.position),
      depth_chart_position: typeof sleeperPlayer.depth_chart_position === 'number' ? sleeperPlayer.depth_chart_position : undefined,
    };
  }

  private calculateProjectedPoints(player: SleeperPlayer): number | null {
    if (!player.stats) return null;
    
    // Use last season's stats as a base for projections
    const stats = player.stats;
    let points = 0;

    // PPR Scoring
    points += (stats.pass_yd || 0) * 0.04; // 1 point per 25 passing yards
    points += (stats.pass_td || 0) * 4; // 4 points per passing TD
    points -= (stats.pass_int || 0); // -1 point per interception
    points += (stats.rush_yd || 0) * 0.1; // 1 point per 10 rushing yards
    points += (stats.rush_td || 0) * 6; // 6 points per rushing TD
    points += (stats.rec || 0); // 1 point per reception
    points += (stats.rec_yd || 0) * 0.1; // 1 point per 10 receiving yards
    points += (stats.rec_td || 0) * 6; // 6 points per receiving TD
    points -= (stats.fum_lost || 0) * 2; // -2 points per fumble lost

    // Add variance based on position and experience
    const variance = 1 + (Math.random() * 0.2 - 0.1); // ±10% variance
    return Math.round(points * variance * 10) / 10;
  }

  private calculateTier(points: number, position: string): number {
    const tierThresholds = {
      QB: [350, 300, 250, 200],
      RB: [300, 250, 200, 150],
      WR: [280, 230, 180, 130],
      TE: [200, 150, 100, 50],
      K: [150, 130, 110, 90],
      DEF: [170, 140, 110, 80],
    };

    const thresholds = tierThresholds[position as keyof typeof tierThresholds] || [0];
    for (let i = 0; i < thresholds.length; i++) {
      if (points >= thresholds[i]) return i + 1;
    }
    return 5;
  }

  private calculateRisk(player: SleeperPlayer): 'low' | 'medium' | 'high' {
    if (player.injury_status) return 'high';
    if (player.years_exp < 2) return 'medium';
    if (player.depth_chart_position && player.depth_chart_position > 1) return 'medium';
    return 'low';
  }

  private calculateUpside(points: number, position: string): 'low' | 'medium' | 'high' {
    const upsideThresholds = {
      QB: [350, 300],
      RB: [300, 250],
      WR: [280, 230],
      TE: [200, 150],
      K: [150, 130],
      DEF: [170, 140],
    };

    const [high, medium] = upsideThresholds[position as keyof typeof upsideThresholds] || [0, 0];
    if (points >= high) return 'high';
    if (points >= medium) return 'medium';
    return 'low';
  }

  private convertStats(player: SleeperPlayer): any {
    if (!player.stats) return {};

    return {
      passingYards: player.stats.pass_yd,
      passingTDs: player.stats.pass_td,
      interceptions: player.stats.pass_int,
      rushingYards: player.stats.rush_yd,
      rushingTDs: player.stats.rush_td,
      receptions: player.stats.rec,
      receivingYards: player.stats.rec_yd,
      receivingTDs: player.stats.rec_td,
      fumbles: player.stats.fum_lost,
    };
  }
}

export const sleeperAPI = SleeperAPI.getInstance();