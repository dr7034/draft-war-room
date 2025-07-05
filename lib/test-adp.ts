import { adpService } from './adp-service';
import { Player } from '@/types/player';

// Test function to verify ADP service
export async function testADPService() {
  console.log('Testing ADP Service...');
  
  // Create some test players
  const testPlayers: Player[] = [
    {
      id: '1',
      name: 'Christian McCaffrey',
      position: 'RB',
      team: 'SF',
      projected_points: 280,
      sleeper_id: '1'
    },
    {
      id: '2',
      name: 'Tyreek Hill',
      position: 'WR',
      team: 'MIA',
      projected_points: 260,
      sleeper_id: '2'
    },
    {
      id: '3',
      name: 'Patrick Mahomes',
      position: 'QB',
      team: 'KC',
      projected_points: 320,
      sleeper_id: '3'
    },
    {
      id: '4',
      name: 'Unknown Player',
      position: 'RB',
      team: 'FA',
      projected_points: 150,
      sleeper_id: '4'
    }
  ];
  
  try {
    // Test ADP data generation
    const adpData = await adpService.getADPData();
    console.log('ADP Data count:', adpData.length);
    console.log('ADP Data sample:', adpData.slice(0, 3));
    
    // Test player rankings
    const rankings = await adpService.generatePlayerRankings(testPlayers);
    console.log('Player Rankings:', rankings);
    
    // Test individual player analysis
    for (const player of testPlayers) {
      const ranking = rankings.find(r => r.playerId === player.id);
      console.log(`${player.name}: ADP=${ranking?.adp}, Tier=${ranking?.tier}, Risk=${ranking?.risk}, Upside=${ranking?.upside}`);
    }
    
    return { success: true, rankings };
  } catch (error) {
    console.error('ADP Service test failed:', error);
    return { success: false, error };
  }
}

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  (window as any).testADPService = testADPService;
} 