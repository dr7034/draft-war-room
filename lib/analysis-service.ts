import { Player, Position } from '@/types/player';
import { League } from '@/types/league';
import { saveAnalysis, AnalysisType } from './analysis-storage-service';
import { createClient } from '@supabase/supabase-js';

export async function getAIAnalysis(players: Player[], league: League) {
  try {
    // Validate input
    if (!players?.length) {
      console.log('No players provided for analysis');
      
      // Return default responses instead of throwing an error
      return {
        positionAnalyses: [
          { position: 'QB', analysis: '# QB Analysis\n\nNo player data available. Please import players first.' },
          { position: 'RB', analysis: '# RB Analysis\n\nNo player data available. Please import players first.' },
          { position: 'WR', analysis: '# WR Analysis\n\nNo player data available. Please import players first.' },
          { position: 'TE', analysis: '# TE Analysis\n\nNo player data available. Please import players first.' }
        ],
        draftStrategy: "# Draft Strategy\n\nUnable to generate draft strategy without player data. Please import players from Sleeper first."
      };
    }
    
    console.log('Total players before filtering:', players.length);
    console.log('Sample player data:', players.slice(0, 2));
    
    // Use less restrictive filtering logic
    const relevantPlayers = players.filter(p => {
      // Include any player that has a name and position
      const hasName = !!p.name;
      const hasPosition = !!p.position;
      
      return hasName && hasPosition;
    });
    
    console.log(`Filtered from ${players.length} to ${relevantPlayers.length} relevant players`);
    
    // If all players were filtered out, use the original players
    const playersToAnalyze = relevantPlayers.length > 0 ? relevantPlayers : players;
    console.log('Using', playersToAnalyze.length, 'players for analysis');

    // Skip API call and use local analysis directly
    console.log('Using local analysis methods instead of API endpoint');
    
    const positions = ['QB', 'RB', 'WR', 'TE'];
    const positionGroups: Record<string, Player[]> = {
      QB: playersToAnalyze.filter(p => p.position === 'QB').slice(0, 20),
      RB: playersToAnalyze.filter(p => p.position === 'RB').slice(0, 30),
      WR: playersToAnalyze.filter(p => p.position === 'WR').slice(0, 30),
      TE: playersToAnalyze.filter(p => p.position === 'TE').slice(0, 15)
    };
    
    const positionAnalyses = positions.map(position => {
      return {
        position,
        analysis: generateLocalAnalysis(playersToAnalyze, position)
      };
    });
    
    const draftStrategy = generateDraftStrategy(league, playersToAnalyze);
    
    // Try to save analyses using the server-side API endpoint
    try {
      console.log('[UPDATED CODE] Attempting to save analyses via API endpoint');
      
      // Save position analyses
      if (positionAnalyses && Array.isArray(positionAnalyses)) {
        for (const posAnalysis of positionAnalyses) {
          const response = await fetch('/api/analyses/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'position_analysis',
              content: posAnalysis.analysis || '',
              parameters: {
                league,
                position: posAnalysis.position,
                playerCount: positionGroups[posAnalysis.position as Position]?.length || 0
              },
              league_id: league.id,
              metadata: {
                position: posAnalysis.position,
                scoringFormat: league.scoringFormat,
                date: new Date().toISOString()
              }
            })
          });
          
          const result = await response.json();
          
          if (!response.ok) {
            console.error(`Error saving ${posAnalysis.position} analysis:`, result.error);
          } else {
            console.log(`Successfully saved ${posAnalysis.position} analysis`);
          }
        }
      }
      
      // Save draft strategy
      if (draftStrategy) {
        const response = await fetch('/api/analyses/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'draft_strategy',
            content: draftStrategy,
            parameters: {
              league,
              positions: Object.keys(positionGroups),
              playerCounts: Object.fromEntries(
                Object.entries(positionGroups).map(([pos, players]) => [pos, players.length])
              )
            },
            league_id: league.id,
            metadata: {
              scoringFormat: league.scoringFormat,
              date: new Date().toISOString()
            }
          })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          console.error('Error saving draft strategy:', result.error);
        } else {
          console.log('Successfully saved draft strategy');
        }
      }
    } catch (error) {
      // Just log the error but don't fail the overall function
      console.error('Error saving analyses to database:', error);
    }
    
    return {
      positionAnalyses,
      draftStrategy,
      source: 'local_direct'
    };
  } catch (error) {
    console.error('Error getting AI analysis:', error);
    throw new Error(
      `Failed to get AI analysis: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function generateLocalAnalysis(players: Player[], position: string) {
  const positionPlayers = players
    .filter(p => p.position === position)
    .sort((a, b) => b.projectedPoints - a.projectedPoints);

  let analysis = `# ${position} Analysis\n\n`;

  // Top Players
  analysis += `## Top Players\n\n`;
  positionPlayers.slice(0, 5).forEach((player, index) => {
    analysis += `${index + 1}. **${player.name}** (${player.team})\n`;
    analysis += `   - Projected Points: ${player.projectedPoints}\n`;
    analysis += `   - Risk Level: ${player.risk}\n`;
    analysis += `   - Upside: ${player.upside}\n`;
    if (player.recommendation) {
      analysis += `   - ${player.recommendation}\n`;
    }
    analysis += '\n';
  });

  // Risk Analysis
  const highRiskPlayers = positionPlayers.filter(p => p.risk === 'high');
  if (highRiskPlayers.length > 0) {
    analysis += `## Risk Analysis\n\n`;
    highRiskPlayers.slice(0, 3).forEach(player => {
      analysis += `- **${player.name}** - High risk player\n`;
      if (player.injury) {
        analysis += `  - Current injury: ${player.injury}\n`;
      }
    });
    analysis += '\n';
  }

  // Upside Potential
  const highUpsidePlayers = positionPlayers.filter(p => p.upside === 'high');
  if (highUpsidePlayers.length > 0) {
    analysis += `## Upside Potential\n\n`;
    highUpsidePlayers.slice(0, 3).forEach(player => {
      analysis += `- **${player.name}** - High upside player\n`;
      if (player.recommendation) {
        analysis += `  - ${player.recommendation}\n`;
      }
    });
  }

  return analysis;
}

export function generateDraftStrategy(league: League, players: Player[]) {
  let strategy = `# Draft Strategy\n\n`;

  // League Settings
  strategy += `## League Settings\n\n`;
  strategy += `- Scoring Format: ${league.scoringFormat.toUpperCase()}\n`;
  strategy += `- Starting Requirements:\n`;
  strategy += `  - QB: ${league.rosterSettings.QB}\n`;
  strategy += `  - RB: ${league.rosterSettings.RB}\n`;
  strategy += `  - WR: ${league.rosterSettings.WR}\n`;
  strategy += `  - TE: ${league.rosterSettings.TE}\n`;
  strategy += `  - FLEX: ${league.rosterSettings.FLEX}\n\n`;

  // Position Analysis
  ['QB', 'RB', 'WR', 'TE'].forEach(pos => {
    const posPlayers = players.filter(p => p.position === pos);
    strategy += `## ${pos} Strategy\n\n`;
    
    // Top Available
    const topPlayer = posPlayers[0];
    if (topPlayer) {
      strategy += `- Top Available: ${topPlayer.name}\n`;
      strategy += `- Projected Points: ${topPlayer.projectedPoints}\n`;
      if (topPlayer.recommendation) {
        strategy += `- Recommendation: ${topPlayer.recommendation}\n`;
      }
    }
    
    strategy += '\n';
  });

  return strategy;
}