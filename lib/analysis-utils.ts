import { Player, Position } from '@/types/player';
import { League } from '@/types/league';

interface TeamAnalysis {
  topPicks: Array<{
    name: string;
    position: string;
    team: string;
    priority: 'High' | 'Medium' | 'Low';
    reasoning: string;
  }>;
  positionalAdvice: string;
  strategyAdvice: string;
}

export function analyzeTeamLocally(currentTeam: any[], availablePlayers: Player[], league: League): TeamAnalysis {
  // Count positions in current team
  const positionCounts = currentTeam.reduce((acc: Record<string, number>, player) => {
    acc[player.position] = (acc[player.position] || 0) + 1;
    return acc;
  }, {});

  // Calculate position needs
  const needs = {
    QB: Math.max(0, (league.rosterSettings?.QB || 1) - (positionCounts.QB || 0)),
    RB: Math.max(0, (league.rosterSettings?.RB || 2) - (positionCounts.RB || 0)),
    WR: Math.max(0, (league.rosterSettings?.WR || 2) - (positionCounts.WR || 0)),
    TE: Math.max(0, (league.rosterSettings?.TE || 1) - (positionCounts.TE || 0)),
  };

  // Sort available players by projected points
  const sortedPlayers = [...availablePlayers].sort((a, b) => (b.projectedPoints || 0) - (a.projectedPoints || 0));

  // Generate top picks based on needs and value
  const topPicks = sortedPlayers.slice(0, 10)
    .map(player => {
      const positionNeed = needs[player.position as keyof typeof needs] || 0;
      const priority = positionNeed > 0 ? 'High' : 
                      player.projectedPoints > 150 ? 'Medium' : 'Low';
      
      return {
        name: player.name,
        position: player.position,
        team: player.team,
        priority,
        reasoning: generateReasoning(player, needs, positionCounts)
      };
    })
    .filter(pick => pick.priority !== 'Low')
    .slice(0, 5);

  // Generate positional advice
  const positionalAdvice = generatePositionalAdvice(needs, league);

  // Generate strategy advice
  const strategyAdvice = generateStrategyAdvice(needs, league, currentTeam.length);

  return {
    topPicks,
    positionalAdvice,
    strategyAdvice
  };
}

function generateReasoning(
  player: Player, 
  needs: Record<string, number>, 
  currentCounts: Record<string, number>
): string {
  const positionNeed = needs[player.position as keyof typeof needs] || 0;
  const hasPosition = (currentCounts[player.position] || 0) > 0;

  if (positionNeed > 0) {
    return `${player.name} fills an immediate need at ${player.position} with ${player.projectedPoints || 0} projected points.`;
  } else if (player.projectedPoints > 150) {
    return `High-value pick with ${player.projectedPoints} projected points, good for depth or trade value.`;
  } else if (!hasPosition) {
    return `Provides initial coverage at ${player.position} position.`;
  } else {
    return `Depth pick with upside at ${player.position}.`;
  }
}

function generatePositionalAdvice(needs: Record<string, number>, league: League): string {
  const priorities = Object.entries(needs)
    .filter(([_, need]) => need > 0)
    .map(([pos, need]) => `${pos} (need ${need})`)
    .join(', ');

  if (priorities) {
    return `Priority needs: ${priorities}. Focus on filling these positions first while considering player value.`;
  } else {
    return 'All starting positions filled. Focus on depth and high-upside players.';
  }
}

function generateStrategyAdvice(
  needs: Record<string, number>, 
  league: League, 
  currentRosterSize: number
): string {
  const totalNeeds = Object.values(needs).reduce((a, b) => a + b, 0);
  const isSuperFlex = league.rosterSettings?.SFLEX > 0;
  const rosterLimit = league.rosterSettings?.TOTAL || 16;
  const remainingSlots = rosterLimit - currentRosterSize;

  let advice = [];

  if (totalNeeds > 0) {
    advice.push(`You need ${totalNeeds} more starters.`);
  }

  if (isSuperFlex && needs.QB > 0) {
    advice.push('In Superflex leagues, prioritize QB if available.');
  }

  if (remainingSlots > 0) {
    advice.push(`You have ${remainingSlots} roster spots remaining.`);
  }

  if (currentRosterSize === 0) {
    advice.push('Focus on best player available with your first picks.');
  } else if (totalNeeds === 0) {
    advice.push('Consider drafting high-upside players and handcuffs for your starters.');
  }

  return advice.join(' ');
}

export function generatePositionalAnalysis(players: Player[], position: Position, league: League) {
  const positionPlayers = players
    .filter(p => p.position === position)
    .sort((a, b) => b.projectedPoints - a.projectedPoints);

  // Generate analysis based on player data
  const topPerformers = positionPlayers.slice(0, 5);
  const riskyCandidates = positionPlayers.filter(p => p.risk === 'high');
  const highUpsidePlayers = positionPlayers.filter(p => p.upside === 'high');

  let analysis = `# ${position} Analysis\n\n`;

  // Top Performers
  analysis += `## Top Performers\n\n`;
  topPerformers.forEach((player, index) => {
    analysis += `${index + 1}. **${player.name}** (${player.team})\n`;
    analysis += `   - Projected Points: ${player.projectedPoints}\n`;
    analysis += `   - Risk: ${player.risk}\n`;
    analysis += `   - Upside: ${player.upside}\n`;
    if (player.recommendation) {
      analysis += `   - ${player.recommendation}\n`;
    }
    analysis += '\n';
  });

  // Risk Analysis
  analysis += `## Risk Analysis\n\n`;
  riskyCandidates.slice(0, 3).forEach(player => {
    analysis += `- **${player.name}** - High risk due to ${player.injury || 'performance concerns'}\n`;
  });
  analysis += '\n';

  // Upside Potential
  analysis += `## Upside Potential\n\n`;
  highUpsidePlayers.slice(0, 3).forEach(player => {
    analysis += `- **${player.name}** - High upside potential in ${league.scoringFormat} scoring\n`;
  });

  // Draft Strategy
  analysis += `\n## Draft Strategy\n\n`;
  analysis += `- Position scarcity: ${getPositionScarcity(positionPlayers, position)}\n`;
  analysis += `- Recommended draft rounds: ${getDraftRoundRecommendations(position)}\n`;
  analysis += `- Value picks: ${getValuePicks(positionPlayers).join(', ')}\n`;

  return analysis;
}

function getPositionScarcity(players: Player[], position: Position) {
  const startableCount = {
    QB: 12,
    RB: 24,
    WR: 36,
    TE: 12,
    K: 12,
    DEF: 12,
  }[position];

  const qualityStarters = players.filter(p => p.projectedPoints > getPositionBaseline(position));
  
  if (qualityStarters.length < startableCount * 0.7) {
    return "High scarcity - consider drafting early";
  } else if (qualityStarters.length < startableCount) {
    return "Moderate scarcity - be selective but don't reach";
  }
  return "Low scarcity - can wait for value";
}

function getPositionBaseline(position: Position): number {
  return {
    QB: 240,
    RB: 180,
    WR: 170,
    TE: 120,
    K: 100,
    DEF: 110,
  }[position] || 0;
}

function getDraftRoundRecommendations(position: Position): string {
  switch (position) {
    case 'QB':
      return "Rounds 4-6 for elite options, 8-10 for solid starters";
    case 'RB':
      return "Rounds 1-2 for elite backs, 3-5 for RB2s";
    case 'WR':
      return "Rounds 1-3 for elite options, good value through round 7";
    case 'TE':
      return "Rounds 3-4 for elite options, 8+ for streamers";
    default:
      return "Late rounds";
  }
}

function getValuePicks(players: Player[]): string[] {
  return players
    .filter(p => p.adp > 50 && p.projectedPoints > getPositionBaseline(p.position))
    .slice(0, 3)
    .map(p => p.name);
}

export function generateDraftStrategy(league: League, players: Player[]) {
  let strategy = `# 2025 Draft Strategy\n\n`;

  // League Settings Analysis
  strategy += `## League Settings Impact\n\n`;
  strategy += `- Scoring: ${league.scoringFormat.toUpperCase()}\n`;
  strategy += `- Starting Requirements: ${formatRosterRequirements(league.rosterSettings)}\n\n`;

  // Round-by-Round Strategy
  strategy += `## Round-by-Round Approach\n\n`;
  strategy += generateRoundStrategy(league, players);

  // Position Priority
  strategy += `\n## Position Priority\n\n`;
  strategy += generatePositionPriority(league, players);

  return strategy;
}

function formatRosterRequirements(settings: League['rosterSettings']): string {
  return `QB:${settings.QB} RB:${settings.RB} WR:${settings.WR} TE:${settings.TE} FLEX:${settings.FLEX}`;
}

function generateRoundStrategy(league: League, players: Player[]): string {
  let strategy = '';
  
  // Early Rounds (1-3)
  strategy += "### Early Rounds (1-3)\n";
  strategy += "- Focus on securing elite RB/WR talent\n";
  strategy += "- Consider elite TE if value presents\n\n";

  // Middle Rounds (4-8)
  strategy += "### Middle Rounds (4-8)\n";
  strategy += "- Target high-upside QBs\n";
  strategy += "- Fill starting roster requirements\n\n";

  // Late Rounds (9+)
  strategy += "### Late Rounds (9+)\n";
  strategy += "- Focus on upside bench players\n";
  strategy += "- Target rookie sleepers\n";

  return strategy;
}

function generatePositionPriority(league: League, players: Player[]): string {
  let priority = '';
  
  const positions: Position[] = ['QB', 'RB', 'WR', 'TE'];
  positions.forEach(pos => {
    const posPlayers = players.filter(p => p.position === pos);
    priority += `### ${pos}\n`;
    priority += `- Scarcity: ${getPositionScarcity(posPlayers, pos)}\n`;
    priority += `- Target Rounds: ${getDraftRoundRecommendations(pos)}\n\n`;
  });

  return priority;
}