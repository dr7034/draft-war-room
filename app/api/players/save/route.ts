import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { revalidatePath } from 'next/cache';
import { Player } from '@/types/player';

// Make this API route dynamic
export const dynamic = 'force-dynamic';

// Batch size for processing players
const BATCH_SIZE = 50;

interface PlayerSaveRequest {
  players: Player[];
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json() as PlayerSaveRequest;
    
    if (!data.players || !Array.isArray(data.players)) {
      return NextResponse.json(
        { error: 'Invalid request body: players array is required' },
        { status: 400 }
      );
    }
    
    const players = data.players;
    console.log(`Processing ${players.length} players`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process in batches to avoid payload size issues
    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      const batch = players.slice(i, i + BATCH_SIZE);
      
      // Format players for Supabase
      const formattedPlayers = batch.map((player: Player) => ({
        id: player.id,
        sleeper_id: player.id,
        name: player.name,
        position: player.position,
        team: player.team,
        projected_points: player.projectedPoints,
        adp: player.adp,
        tier: player.tier,
        bye_week: player.byeWeek,
        injury: player.injury || null,
        stats: player.stats || null,
        metadata: {
          imageUrl: player.imageUrl,
          trend: player.trend,
          notes: player.notes,
          ecr: player.ecr,
          risk: player.risk,
          upside: player.upside,
          recommendation: player.recommendation
        }
      }));
      
      try {
        const { data: savedData, error } = await supabase
          .from('players')
          .upsert(formattedPlayers, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          });
        
        if (error) {
          console.error(`Error saving batch ${i / BATCH_SIZE + 1}:`, error);
          errorCount += batch.length;
        } else {
          console.log(`Successfully saved batch ${i / BATCH_SIZE + 1} (${batch.length} players)`);
          successCount += batch.length;
        }
      } catch (err) {
        console.error(`Exception in batch ${i / BATCH_SIZE + 1}:`, err);
        errorCount += batch.length;
      }
    }
    
    // Revalidate relevant paths
    revalidatePath('/dashboard');
    revalidatePath('/draft');
    revalidatePath('/players');
    
    return NextResponse.json({
      success: true,
      message: `Player data saved successfully. ${successCount} players saved, ${errorCount} errors.`
    });
  } catch (error) {
    console.error('Error in players/save API route:', error);
    return NextResponse.json(
      { error: 'Failed to save player data', details: String(error) },
      { status: 500 }
    );
  }
} 