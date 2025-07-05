import { NextResponse } from 'next/server';
import { importPlayersFromSleeper } from '@/lib/player-service';
import { supabase } from '@/lib/supabase-client';

// Force dynamic rendering to prevent static optimization
export const dynamic = 'force-dynamic';

/**
 * API endpoint to refresh all data from remote sources
 * This includes players and other related data
 */
export async function POST(request: Request) {
  try {
    const { refreshPlayers, refreshLeagues } = await request.json();
    const results = { success: true, players: 0, leagues: 0 };
    
    // Refresh players from Sleeper API if requested
    if (refreshPlayers) {
      console.log('Refreshing players from Sleeper API');
      const importResult = await importPlayersFromSleeper();
      
      if (importResult.success) {
        results.players = importResult.count || 0;
        
        // Update the lastUpdated timestamp for players
        await supabase
          .from('metadata')
          .upsert({ 
            key: 'players_last_updated',
            value: new Date().toISOString()
          }, { onConflict: 'key' });
      } else {
        throw new Error(importResult.error || 'Failed to import players');
      }
    }
    
    // Placeholder for league refresh logic
    if (refreshLeagues) {
      console.log('League refresh not yet implemented');
      // Placeholder for future league refresh implementation
    }
    
    return NextResponse.json({ 
      ...results,
      message: 'Data refresh completed successfully' 
    });
  } catch (error: any) {
    console.error('Error refreshing data:', error);
    return NextResponse.json(
      { success: false, message: `Error refreshing data: ${error.message}` },
      { status: 500 }
    );
  }
} 