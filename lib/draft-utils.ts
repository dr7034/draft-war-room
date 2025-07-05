import { Player, Position } from '@/types/player';

/**
 * Calculate team strength by position on a scale of 0-100
 */
export function calculateTeamStrength(players: Player[], position: Position): number {
  if (players.length === 0) return 0;
  
  // Number of starters by position (typical fantasy league)
  const starterCounts = {
    'QB': 1,
    'RB': 2,
    'WR': 3,
    'TE': 1,
    'K': 1,
    'DEF': 1,
  };
  
  // Sort players by projected points
  const sortedPlayers = [...players].sort((a, b) => b.projectedPoints - a.projectedPoints);
  
  // Calculate total value of best starters
  const starterCount = starterCounts[position];
  const starters = sortedPlayers.slice(0, starterCount);
  
  // Base calculation on projected points of starters
  let totalPoints = starters.reduce((sum, player) => sum + player.projectedPoints, 0);
  const maxPointsByPosition = {
    'QB': 380, // Elite QB
    'RB': 330, // Elite RB
    'WR': 300, // Elite WR
    'TE': 260, // Elite TE
    'K': 170,  // Elite K
    'DEF': 180, // Elite DEF
  };
  
  // Max possible points for position
  const maxPoints = maxPointsByPosition[position] * starterCount;
  
  // Calculate strength as percentage of max possible
  let strength = Math.round((totalPoints / maxPoints) * 100);
  
  // Cap at 100%
  return Math.min(strength, 100);
}

/**
 * Calculate position scarcity chart data
 */
export function calculatePositionScarcity(players: Player[], position: Position) {
  // Filter players by position and sort by projected points
  const positionPlayers = players
    .filter(p => p.position === position)
    .sort((a, b) => b.projectedPoints - a.projectedPoints);
  
  // Generate data for top 30 players
  return positionPlayers.slice(0, 30).map((player, index) => ({
    rank: index + 1,
    name: player.name,
    value: player.projectedPoints,
  }));
}

/**
 * Calculate value over replacement (VOR)
 */
export function calculateValueOverReplacement(player: Player, allPlayers: Player[]): number {
  // Find the replacement level player at the position
  // (typically around 12th QB, 30th RB, 30th WR, 12th TE)
  const replacementLevel = {
    'QB': 12,
    'RB': 30,
    'WR': 30,
    'TE': 12,
    'K': 12,
    'DEF': 12,
  };
  
  const positionPlayers = allPlayers
    .filter(p => p.position === player.position)
    .sort((a, b) => b.projectedPoints - a.projectedPoints);
  
  const replacementIndex = replacementLevel[player.position] - 1;
  if (replacementIndex >= positionPlayers.length) {
    return player.projectedPoints; // Not enough players to find replacement
  }
  
  const replacementPlayer = positionPlayers[replacementIndex];
  const vor = player.projectedPoints - replacementPlayer.projectedPoints;
  
  return Math.round(vor * 10) / 10; // Round to 1 decimal place
}

/**
 * Get defense matchup strength
 */
export function getDefenseMatchupStrength(team: string, week: number): number {
  // In a real application, this would fetch data from an API
  // For the demo, return a random value between 1-10
  return Math.floor(Math.random() * 10) + 1;
}