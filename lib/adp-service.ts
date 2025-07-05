import { Player } from '@/types/player';

export interface ADPData {
  playerId: string;
  name: string;
  position: string;
  team: string;
  adp: number;
  source: 'fantasypros' | 'espn' | 'cbs' | 'sleeper' | 'ffcalculator';
  leagueSize: number;
  scoringFormat: 'ppr' | 'half_ppr' | 'standard';
  updatedAt: string;
}

export interface PlayerRanking {
  playerId: string;
  name: string;
  position: string;
  team: string;
  rank: number;
  tier: number;
  adp: number;
  ecr: number; // Expert Consensus Ranking
  risk: 'low' | 'medium' | 'high';
  upside: 'low' | 'medium' | 'high';
  tags: string[];
  notes: string;
}

class ADPService {
  private static instance: ADPService;
  private cache: Map<string, ADPData[]> = new Map();
  private lastUpdate: number = 0;
  private readonly CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

  private constructor() {}

  static getInstance(): ADPService {
    if (!ADPService.instance) {
      ADPService.instance = new ADPService();
    }
    return ADPService.instance;
  }

  /**
   * Fetch ADP data from FantasyPros API
   */
  private async fetchFantasyProsADP(): Promise<ADPData[]> {
    try {
      // FantasyPros ADP API endpoint (you'll need an API key)
      const response = await fetch('https://api.fantasypros.com/v2/json/nfl/2024/adp', {
        headers: {
          'Authorization': `Bearer ${process.env.FANTASYPROS_API_KEY}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`FantasyPros API error: ${response.status}`);
      }

      const data = await response.json();
      return data.adp.map((item: any) => ({
        playerId: item.player_id,
        name: item.name,
        position: item.position,
        team: item.team,
        adp: parseFloat(item.adp),
        source: 'fantasypros' as const,
        leagueSize: 12,
        scoringFormat: 'ppr' as const,
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('Failed to fetch FantasyPros ADP:', error);
      return [];
    }
  }

  /**
   * Fetch ADP data from ESPN (disabled due to CORS)
   */
  private async fetchESPNRankings(): Promise<ADPData[]> {
    // ESPN API is blocked by CORS, so we'll skip it
    console.log('ESPN API disabled due to CORS restrictions');
    return [];
  }

  /**
   * Generate mock ADP data for development/testing
   */
  private generateMockADP(): ADPData[] {
    const mockPlayers = [
      // Top RBs
      { name: 'Christian McCaffrey', position: 'RB', team: 'SF', adp: 1.2 },
      { name: 'Bijan Robinson', position: 'RB', team: 'ATL', adp: 2.1 },
      { name: 'Saquon Barkley', position: 'RB', team: 'PHI', adp: 3.4 },
      { name: 'Jonathan Taylor', position: 'RB', team: 'IND', adp: 4.2 },
      { name: 'Derrick Henry', position: 'RB', team: 'BAL', adp: 5.8 },
      { name: 'Nick Chubb', position: 'RB', team: 'CLE', adp: 6.3 },
      { name: 'Josh Jacobs', position: 'RB', team: 'GB', adp: 7.1 },
      { name: 'Rachaad White', position: 'RB', team: 'TB', adp: 8.5 },
      { name: 'James Cook', position: 'RB', team: 'BUF', adp: 9.2 },
      { name: 'Kyren Williams', position: 'RB', team: 'LAR', adp: 10.1 },
      
      // Top WRs
      { name: 'Tyreek Hill', position: 'WR', team: 'MIA', adp: 2.3 },
      { name: 'JaMarr Chase', position: 'WR', team: 'CIN', adp: 3.1 },
      { name: 'CeeDee Lamb', position: 'WR', team: 'DAL', adp: 4.8 },
      { name: 'Amon-Ra St. Brown', position: 'WR', team: 'DET', adp: 5.2 },
      { name: 'Stefon Diggs', position: 'WR', team: 'HOU', adp: 6.7 },
      { name: 'AJ Brown', position: 'WR', team: 'PHI', adp: 7.4 },
      { name: 'Garrett Wilson', position: 'WR', team: 'NYJ', adp: 8.1 },
      { name: 'Puka Nacua', position: 'WR', team: 'LAR', adp: 9.3 },
      { name: 'Chris Olave', position: 'WR', team: 'NO', adp: 10.8 },
      { name: 'Drake London', position: 'WR', team: 'ATL', adp: 11.2 },
      
      // Top QBs
      { name: 'Patrick Mahomes', position: 'QB', team: 'KC', adp: 12.1 },
      { name: 'Josh Allen', position: 'QB', team: 'BUF', adp: 13.4 },
      { name: 'Jalen Hurts', position: 'QB', team: 'PHI', adp: 14.2 },
      { name: 'Lamar Jackson', position: 'QB', team: 'BAL', adp: 15.8 },
      { name: 'Dak Prescott', position: 'QB', team: 'DAL', adp: 16.3 },
      { name: 'Justin Herbert', position: 'QB', team: 'LAC', adp: 17.1 },
      { name: 'C.J. Stroud', position: 'QB', team: 'HOU', adp: 18.5 },
      { name: 'Joe Burrow', position: 'QB', team: 'CIN', adp: 19.2 },
      { name: 'Kyler Murray', position: 'QB', team: 'ARI', adp: 20.1 },
      { name: 'Anthony Richardson', position: 'QB', team: 'IND', adp: 21.4 },
      
      // Top TEs
      { name: 'Travis Kelce', position: 'TE', team: 'KC', adp: 11.8 },
      { name: 'Sam LaPorta', position: 'TE', team: 'DET', adp: 22.3 },
      { name: 'Trey McBride', position: 'TE', team: 'ARI', adp: 23.1 },
      { name: 'Evan Engram', position: 'TE', team: 'JAX', adp: 24.7 },
      { name: 'George Kittle', position: 'TE', team: 'SF', adp: 25.4 },
      { name: 'Mark Andrews', position: 'TE', team: 'BAL', adp: 26.2 },
      { name: 'Jake Ferguson', position: 'TE', team: 'DAL', adp: 27.8 },
      { name: 'Dalton Kincaid', position: 'TE', team: 'BUF', adp: 28.5 },
      { name: 'Kyle Pitts', position: 'TE', team: 'ATL', adp: 29.1 },
      { name: 'David Njoku', position: 'TE', team: 'CLE', adp: 30.2 },
      
      // More players for better coverage
      { name: 'Austin Ekeler', position: 'RB', team: 'WAS', adp: 11.8 },
      { name: 'Alvin Kamara', position: 'RB', team: 'NO', adp: 12.4 },
      { name: 'Joe Mixon', position: 'RB', team: 'HOU', adp: 13.1 },
      { name: 'Tony Pollard', position: 'RB', team: 'TEN', adp: 14.2 },
      { name: 'Isiah Pacheco', position: 'RB', team: 'KC', adp: 15.7 },
      { name: 'Zamir White', position: 'RB', team: 'LV', adp: 16.3 },
      { name: 'Jahmyr Gibbs', position: 'RB', team: 'DET', adp: 17.1 },
      { name: 'Kenneth Walker', position: 'RB', team: 'SEA', adp: 18.5 },
      { name: 'David Montgomery', position: 'RB', team: 'DET', adp: 19.2 },
      { name: 'Aaron Jones', position: 'RB', team: 'MIN', adp: 20.8 },
      
      { name: 'DeVonta Smith', position: 'WR', team: 'PHI', adp: 12.1 },
      { name: 'Jaylen Waddle', position: 'WR', team: 'MIA', adp: 13.4 },
      { name: 'Tee Higgins', position: 'WR', team: 'CIN', adp: 14.2 },
      { name: 'DK Metcalf', position: 'WR', team: 'SEA', adp: 15.8 },
      { name: 'Deebo Samuel', position: 'WR', team: 'SF', adp: 16.3 },
      { name: 'Brandon Aiyuk', position: 'WR', team: 'SF', adp: 17.1 },
      { name: 'Tyler Lockett', position: 'WR', team: 'SEA', adp: 18.5 },
      { name: 'Terry McLaurin', position: 'WR', team: 'WAS', adp: 19.2 },
      { name: 'Calvin Ridley', position: 'WR', team: 'TEN', adp: 20.1 },
      { name: 'Christian Kirk', position: 'WR', team: 'JAX', adp: 21.4 },
    ];

    return mockPlayers.map((player, index) => ({
      playerId: `mock_${index + 1}`,
      name: player.name,
      position: player.position,
      team: player.team,
      adp: player.adp,
      source: 'fantasypros' as const,
      leagueSize: 12,
      scoringFormat: 'ppr' as const,
      updatedAt: new Date().toISOString()
    }));
  }

  /**
   * Get consolidated ADP data from multiple sources
   */
  async getADPData(): Promise<ADPData[]> {
    const now = Date.now();
    const cacheKey = 'adp_data';

    // Check cache first
    if (this.cache.has(cacheKey) && now - this.lastUpdate < this.CACHE_DURATION) {
      return this.cache.get(cacheKey) || [];
    }

    try {
      // Try FantasyPros first, fallback to mock data
      const fantasyProsADP = await this.fetchFantasyProsADP();
      
      let allADPData: ADPData[] = [];

      // Add FantasyPros data if available
      if (fantasyProsADP.length > 0) {
        allADPData.push(...fantasyProsADP);
      }

      // If no real data available, use mock data
      if (allADPData.length === 0) {
        allADPData = this.generateMockADP();
      }

      // Cache the results
      this.cache.set(cacheKey, allADPData);
      this.lastUpdate = now;

      return allADPData;
    } catch (error) {
      console.error('Error fetching ADP data:', error);
      // Return mock data as fallback
      return this.generateMockADP();
    }
  }

  /**
   * Generate comprehensive player rankings with tiers and analysis
   */
  async generatePlayerRankings(players: Player[]): Promise<PlayerRanking[]> {
    const adpData = await this.getADPData();
    
    // Debug: Log ADP data sample
    console.log('ADP data sample:', adpData.slice(0, 5));
    console.log('Players to rank:', players.length);
    
    const rankings = players.map(player => {
      // Find matching ADP data with improved matching logic
      const matchingADP = this.findMatchingADP(player, adpData);

      const adp = matchingADP?.adp || this.generateFallbackADP(player, players);
      const tier = this.calculateTier(adp, player.position);
      const risk = this.calculateRisk(player);
      const upside = this.calculateUpside(player);
      const tags = this.generateTags(player, adp);
      const notes = this.generateNotes(player, adp);

      // Debug: Log matching results for first few players
      if (players.indexOf(player) < 5) {
        console.log(`Player: ${player.name} (${player.position}, ${player.team}) - ADP: ${adp}, Matched: ${!!matchingADP}`);
      }

      return {
        playerId: player.id,
        name: player.name,
        position: player.position,
        team: player.team || 'FA',
        rank: adp,
        tier,
        adp,
        ecr: adp, // For now, use ADP as ECR
        risk,
        upside,
        tags,
        notes
      };
    }).sort((a, b) => a.adp - b.adp); // Sort by ADP
    
    // Debug: Log final rankings sample
    console.log('Final rankings sample:', rankings.slice(0, 5));
    
    return rankings;
  }

  /**
   * Find matching ADP data with flexible name matching
   */
  private findMatchingADP(player: Player, adpData: ADPData[]): ADPData | undefined {
    const playerName = player.name.toLowerCase();
    const playerTeam = (player.team || 'FA').toUpperCase();
    const playerPosition = player.position.toUpperCase();

    // Filter out non-skill position players from ADP data
    const skillPositionADP = adpData.filter(adp => 
      ['QB', 'RB', 'WR', 'TE'].includes(adp.position.toUpperCase())
    );

    // First try: exact name + team match
    let match = skillPositionADP.find(adp => {
      const adpName = adp.name.toLowerCase();
      const adpTeam = adp.team.toUpperCase();
      return adpName === playerName && adpTeam === playerTeam;
    });

    if (match) return match;

    // Second try: exact name + position match
    match = skillPositionADP.find(adp => {
      const adpName = adp.name.toLowerCase();
      const adpPosition = adp.position.toUpperCase();
      return adpName === playerName && adpPosition === playerPosition;
    });

    if (match) return match;

    // Third try: similar name + team match
    match = skillPositionADP.find(adp => {
      const adpName = adp.name.toLowerCase();
      const adpTeam = adp.team.toUpperCase();
      const adpPosition = adp.position.toUpperCase();

      const nameSimilar = this.namesAreSimilar(playerName, adpName);
      const teamMatch = adpTeam === playerTeam;
      const positionMatch = adpPosition === playerPosition;

      return nameSimilar && (teamMatch || positionMatch);
    });

    if (match) return match;

    // Fourth try: last name only + team match (for players with common names)
    const playerLastName = playerName.split(' ').pop() || '';
    if (playerLastName.length > 2) {
      match = skillPositionADP.find(adp => {
        const adpName = adp.name.toLowerCase();
        const adpTeam = adp.team.toUpperCase();
        const adpLastName = adpName.split(' ').pop() || '';
        
        return adpLastName === playerLastName && adpTeam === playerTeam;
      });
    }

    return match;
  }

  /**
   * Check if two names are similar (handle common variations)
   */
  private namesAreSimilar(name1: string, name2: string): boolean {
    // Exact match
    if (name1 === name2) return true;

    // Handle common name variations
    const variations = [
      // Remove periods and spaces
      [name1.replace(/[.\s]/g, ''), name2.replace(/[.\s]/g, '')],
      // Handle Jr., Sr., III, etc.
      [name1.replace(/\s+(jr|sr|ii|iii|iv)\.?$/i, ''), name2.replace(/\s+(jr|sr|ii|iii|iv)\.?$/i, '')],
      // Handle initials vs full names
      [name1.replace(/\b([a-z])\.\s*/g, '$1'), name2.replace(/\b([a-z])\.\s*/g, '$1')],
    ];

    return variations.some(([v1, v2]) => v1 === v2);
  }

  /**
   * Generate fallback ADP based on player's projected points and position
   */
  private generateFallbackADP(player: Player, allPlayers: Player[]): number {
    const projectedPoints = player.projected_points || 0;
    const position = player.position;
    
    // Get position players sorted by projected points
    const positionPlayers = allPlayers
      .filter(p => p.position === position)
      .sort((a, b) => (b.projected_points || 0) - (a.projected_points || 0));
    
    // Find player's rank within position
    const playerRank = positionPlayers.findIndex(p => p.id === player.id) + 1;
    
    // Generate ADP based on position and projected points
    let baseADP = 150; // Default fallback
    
    if (position === 'QB') {
      if (projectedPoints > 350) baseADP = 15;
      else if (projectedPoints > 300) baseADP = 25;
      else if (projectedPoints > 250) baseADP = 45;
      else if (projectedPoints > 200) baseADP = 75;
      else baseADP = 120;
    } else if (position === 'RB') {
      if (projectedPoints > 250) baseADP = 5;
      else if (projectedPoints > 200) baseADP = 15;
      else if (projectedPoints > 150) baseADP = 35;
      else if (projectedPoints > 100) baseADP = 65;
      else baseADP = 120;
    } else if (position === 'WR') {
      if (projectedPoints > 220) baseADP = 8;
      else if (projectedPoints > 180) baseADP = 20;
      else if (projectedPoints > 140) baseADP = 40;
      else if (projectedPoints > 100) baseADP = 70;
      else baseADP = 130;
    } else if (position === 'TE') {
      if (projectedPoints > 180) baseADP = 12;
      else if (projectedPoints > 140) baseADP = 25;
      else if (projectedPoints > 100) baseADP = 50;
      else if (projectedPoints > 60) baseADP = 80;
      else baseADP = 140;
    } else if (position === 'K') {
      baseADP = 120 + Math.floor(Math.random() * 60);
    } else if (position === 'DEF') {
      baseADP = 130 + Math.floor(Math.random() * 60);
    }
    
    // Add some variance based on player rank within position
    const rankVariance = (playerRank - 1) * 2; // Higher rank = lower ADP
    const randomVariance = Math.random() * 20 - 10; // ±10 ADP variance
    
    return Math.max(1, Math.round(baseADP - rankVariance + randomVariance));
  }

  private calculateTier(adp: number, position: string): number {
    const tierThresholds = {
      QB: [30, 60, 90, 120],
      RB: [24, 48, 72, 96],
      WR: [36, 72, 108, 144],
      TE: [12, 24, 36, 48],
      K: [12, 24, 36, 48],
      DEF: [12, 24, 36, 48]
    };

    const thresholds = tierThresholds[position as keyof typeof tierThresholds] || [0];
    for (let i = 0; i < thresholds.length; i++) {
      if (adp <= thresholds[i]) return i + 1;
    }
    return 5;
  }

  private calculateRisk(player: Player): 'low' | 'medium' | 'high' {
    if (player.injury) return 'high';
    if (player.experience && player.experience < 2) return 'medium';
    if (player.position === 'QB' && (player.projected_points || 0) > 300) return 'low';
    if (player.position === 'RB' && (player.projected_points || 0) > 200) return 'low';
    if (player.position === 'WR' && (player.projected_points || 0) > 180) return 'low';
    if (player.position === 'TE' && (player.projected_points || 0) > 150) return 'low';
    return 'medium';
  }

  private calculateUpside(player: Player): 'low' | 'medium' | 'high' {
    const points = player.projected_points || 0;
    const position = player.position;
    
    const upsideThresholds = {
      QB: [350, 300],
      RB: [250, 200],
      WR: [220, 180],
      TE: [180, 140],
      K: [150, 130],
      DEF: [170, 140]
    };

    const thresholds = upsideThresholds[position as keyof typeof upsideThresholds];
    if (!thresholds) return 'medium';

    if (points >= thresholds[0]) return 'high';
    if (points >= thresholds[1]) return 'medium';
    return 'low';
  }

  private generateTags(player: Player, adp: number): string[] {
    const tags: string[] = [];
    
    // Position-based tags
    if (player.position === 'QB' && adp <= 30) tags.push('Elite QB');
    if (player.position === 'RB' && adp <= 24) tags.push('Elite RB');
    if (player.position === 'WR' && adp <= 36) tags.push('Elite WR');
    if (player.position === 'TE' && adp <= 12) tags.push('Elite TE');
    
    // Value tags
    if (adp > 100 && (player.projected_points || 0) > 150) tags.push('Late Value');
    if (adp <= 50 && (player.projected_points || 0) < 100) tags.push('Overvalued');
    
    // Risk tags
    if (player.injury) tags.push('Injury Risk');
    if (player.experience && player.experience < 2) tags.push('Rookie/Young');
    if (player.experience && player.experience > 8) tags.push('Veteran');
    
    // Team context tags
    if (player.team === 'KC' || player.team === 'BUF' || player.team === 'CIN') tags.push('High-Powered Offense');
    if (player.team === 'NYJ' || player.team === 'CHI' || player.team === 'CAR') tags.push('Questionable Offense');
    
    return tags;
  }

  private generateNotes(player: Player, adp: number): string {
    const notes: string[] = [];
    
    if (player.injury) {
      notes.push(`Injury concern: ${player.injury}`);
    }
    
    if (adp <= 24) {
      notes.push('Early round target - secure foundation player');
    } else if (adp <= 72) {
      notes.push('Mid-round value - good production potential');
    } else if (adp <= 120) {
      notes.push('Late-round sleeper - high upside potential');
    } else {
      notes.push('Deep league target - depth/streaming option');
    }
    
    if (player.experience && player.experience < 2) {
      notes.push('Young player with development potential');
    }
    
    return notes.join('. ');
  }

  /**
   * Get position-specific rankings
   */
  async getPositionRankings(position: string): Promise<PlayerRanking[]> {
    const allRankings = await this.generatePlayerRankings([]);
    return allRankings.filter(r => r.position === position);
  }

  /**
   * Get tier-based rankings
   */
  async getTierRankings(tier: number): Promise<PlayerRanking[]> {
    const allRankings = await this.generatePlayerRankings([]);
    return allRankings.filter(r => r.tier === tier);
  }
}

export const adpService = ADPService.getInstance(); 