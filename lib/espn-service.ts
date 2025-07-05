import { Player } from '@/types/player';

interface ESPNPlayer {
  id: string;
  fullName: string;
  stats: Array<{
    scoringPeriodId: number;
    statSourceId: number;
    appliedTotal: number;
  }>;
  injuryStatus?: string;
}

interface ESPNResponse {
  players: Array<{
    player: ESPNPlayer;
    ratings?: {
      totalRating?: number;
      totalProjectedPoints?: number;
    };
  }>;
}

const SLOT_CODES = {
  0: 'QB',
  2: 'RB',
  4: 'WR',
  6: 'TE',
  16: 'DEF',
  17: 'K',
  20: 'Bench',
  21: 'IR',
  23: 'Flex'
} as const;

export async function fetchESPNProjections() {
  try {
    // Use ESPN's public API endpoint for player projections
    const url = 'https://fantasy.espn.com/apis/v3/games/ffl/seasons/2024/players?view=players_wl';
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`ESPN API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as ESPNResponse;
    const projections = new Map<string, number>();
    
    // Process each player
    for (const entry of data.players) {
      const player = entry.player;
      
      // Get projected points from ratings or stats
      let projectedPoints = entry.ratings?.totalProjectedPoints;
      
      if (!projectedPoints && player.stats) {
        const projectedStats = player.stats.find(
          stat => stat.statSourceId === 1
        );
        if (projectedStats) {
          projectedPoints = projectedStats.appliedTotal;
        }
      }
      
      if (projectedPoints) {
        projections.set(player.fullName, projectedPoints);
      }
    }
    
    return projections;
  } catch (error) {
    console.error('Error fetching ESPN projections:', error);
    return new Map();
  }
}

export async function updatePlayerProjections(players: Player[]) {
  try {
    const espnProjections = await fetchESPNProjections();
    
    // Update player projections based on ESPN data
    return players.map(player => {
      const espnProjection = espnProjections.get(player.name);
      if (espnProjection !== undefined) {
        return {
          ...player,
          projected_points: espnProjection,
          metadata: {
            ...player.metadata,
            espn_projection: espnProjection,
            projection_source: 'ESPN',
            projection_updated: new Date().toISOString()
          }
        };
      }
      return player;
    });
  } catch (error) {
    console.error('Error updating player projections:', error);
    return players;
  }
} 