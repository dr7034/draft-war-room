import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { Player } from '@/types/player';

/**
 * Updates player statistics and injury statuses
 * This is a lightweight alternative to the full import process
 */
export async function POST() {
  // Check for Supabase credentials
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials' },
      { status: 500 }
    );
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Fetch current players from database
    const { data: existingPlayers, error: fetchError } = await supabase
      .from('players')
      .select('*');

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch existing players: ${fetchError.message}` },
        { status: 500 }
      );
    }

    // Fetch latest player data from Sleeper API
    const response = await fetch('https://api.sleeper.app/v1/players/nfl');
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch latest player data from Sleeper API' },
        { status: 500 }
      );
    }

    const latestPlayerData = await response.json();
    const validPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

    // Update the players
    const updatedPlayers = Object.values(latestPlayerData)
      .filter((player: any) => {
        return (
          player.active &&
          player.position &&
          validPositions.includes(player.position) &&
          player.team
        );
      })
      .map((player: any) => ({
        id: player.player_id,
        sleeper_id: player.player_id, // Using sleeper_id instead of sleeperId to match DB schema
        name: player.full_name || `${player.first_name} ${player.last_name}`,
        position: player.position,
        team: player.team,
        status: player.status || 'Active',
        injury: player.injury_status || null,
        number: player.number,
        experience: player.years_exp || 0,
        college: player.college || null,
        projected_points: 0, // Default value, would be updated from projections
        adp: 0, // Default value, would be updated from ADP source
        tier: 3, // Default value
        risk: 'medium',
        upside: 'medium',
        bye_week: player.bye_week || null, // Using bye_week to match DB schema
        stats: {},
        metadata: {
          height: player.height,
          weight: player.weight,
          birthdate: player.birth_date,
          college: player.college
        },
        updated_at: new Date().toISOString()
      }));

    if (updatedPlayers.length > 0) {
      // Update players in database
      const { error: upsertError } = await supabase
        .from('players')
        .upsert(updatedPlayers, {
          onConflict: 'sleeper_id', // Using sleeper_id instead of sleeperId
          ignoreDuplicates: false
        });

      if (upsertError) {
        return NextResponse.json(
          { error: `Failed to update players: ${upsertError.message}` },
          { status: 500 }
        );
      }

      // Revalidate relevant paths
      revalidatePath('/players');

      return NextResponse.json({
        success: true,
        message: `Successfully refreshed ${updatedPlayers.length} players`,
        count: updatedPlayers.length
      });
    }

    return NextResponse.json({
      success: true,
      message: 'No players to update',
      count: 0
    });
  } catch (error) {
    console.error('Error refreshing players:', error);
    return NextResponse.json(
      { error: `Unexpected error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 