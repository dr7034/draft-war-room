import { supabase } from '@/lib/supabase-client';
import { Player } from '@/types/player';
import { standardizePlayers, StandardizedPlayer } from './player-utils';
import { updatePlayerProjections } from './espn-service';

/**
 * Validates player data before sending to Supabase
 */
function validatePlayerData(player: any): boolean {
  const requiredFields = ['id', 'sleeper_id', 'name', 'position'];
  const missingFields = requiredFields.filter(field => !player[field]);
  
  if (missingFields.length > 0) {
    console.warn(`Player missing required fields: ${missingFields.join(', ')}`, player);
    return false;
  }
  
  return true;
}

/**
 * Fetch and filter active players from the Sleeper API
 */
export async function importPlayersFromSleeper() {
  try {
    console.log('Importing players from Sleeper API...');
    
    // Check Supabase connection first
    try {
      const { data: testData, error: testError } = await supabase.from('players').select('count').limit(1);
      
      if (testError) {
        console.error('Supabase connection test failed:', testError);
        throw new Error(`Supabase connection failed: ${testError.message}`);
      }
      
      console.log('Supabase connection verified:', testData);
    } catch (connectionError) {
      console.error('Failed to connect to Supabase:', connectionError);
      throw connectionError;
    }
    
    const response = await fetch('https://api.sleeper.app/v1/players/nfl');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch players: ${response.status} ${response.statusText}`);
    }
    
    const allPlayers = await response.json();
    console.log(`Fetched ${Object.keys(allPlayers).length} total players from Sleeper`);
    
    // Filter for active players with valid positions
    const validPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    const filteredPlayers = Object.values(allPlayers)
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
        sleeper_id: player.player_id,
        name: player.full_name || `${player.first_name} ${player.last_name}`,
        position: player.position,
        team: player.team,
        status: player.status || 'Active',
        injury: player.injury_status || null,
        number: player.number,
        experience: player.years_exp || 0,
        college: player.college || null,
        projected_points: player.projected_points || 0,
        adp: player.adp || 999,
        tier: player.tier || 3,
        risk: player.risk || 'medium',
        upside: player.upside || 'medium',
        bye_week: player.bye_week || null,
        stats: player.stats || {},
        metadata: {
          height: player.height,
          weight: player.weight,
          birthdate: player.birth_date,
          college: player.college
        },
        updated_at: new Date().toISOString()
      }))
      .filter(validatePlayerData);
    
    console.log(`Filtered to ${filteredPlayers.length} active players`);
    
    // Store in Supabase
    if (filteredPlayers.length > 0) {
      console.log('Attempting to store players in Supabase...');
      console.log('Sample player data:', filteredPlayers[0]);
      
      const { error } = await supabase
        .from('players')
        .upsert(filteredPlayers, { 
          onConflict: 'sleeper_id',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`Failed to store players: ${error.message}`);
      }
      
      console.log(`Successfully imported ${filteredPlayers.length} players`);
      return {
        success: true,
        count: filteredPlayers.length
      };
    }
    
    return {
      success: true,
      count: 0
    };
  } catch (error) {
    console.error('Error importing players:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get all players from the database with updated ESPN projections
 */
export async function getAllPlayers(): Promise<StandardizedPlayer[]> {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select('*');

    if (error) {
      console.error('Error fetching players:', error);
      return [];
    }

    // Update projections from ESPN
    let updatedPlayers = players as Player[];
    try {
      updatedPlayers = await updatePlayerProjections(updatedPlayers);
      
      // Update players in database with new projections
      const { error: updateError } = await supabase
        .from('players')
        .upsert(
          updatedPlayers.map(p => ({
            ...p,
            updated_at: new Date().toISOString()
          }))
        );

      if (updateError) {
        console.error('Error updating player projections in database:', updateError);
      }
    } catch (projectionError) {
      console.error('Error updating projections:', projectionError);
    }

    return standardizePlayers(updatedPlayers);
  } catch (error) {
    console.error('Error in getAllPlayers:', error);
    return [];
  }
}

/**
 * Get players by position
 */
export async function getPlayersByPosition(position: string): Promise<StandardizedPlayer[]> {
  try {
    const { data: players, error } = await supabase
      .from('players')
      .select('*')
      .eq('position', position);

    if (error) {
      console.error('Error fetching players by position:', error);
      return [];
    }

    return standardizePlayers(players as Player[]);
  } catch (error) {
    console.error('Error in getPlayersByPosition:', error);
    return [];
  }
}

/**
 * Direct import from Sleeper API without requiring a user
 */
export async function importPlayersWithoutUser() {
  try {
    console.log('Directly importing NFL players from Sleeper API...');
    
    // Check Supabase connection first
    try {
      const { data: testData, error: testError } = await supabase.from('players').select('count').limit(1);
      
      if (testError) {
        console.error('Supabase connection test failed:', testError);
        throw new Error(`Supabase connection failed: ${testError.message}`);
      }
      
      console.log('Supabase connection verified:', testData);
    } catch (connectionError) {
      console.error('Failed to connect to Supabase:', connectionError);
      throw connectionError;
    }
    
    const response = await fetch('https://api.sleeper.app/v1/players/nfl');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch players: ${response.status} ${response.statusText}`);
    }
    
    const allPlayers = await response.json();
    console.log(`Fetched ${Object.keys(allPlayers).length} total players from Sleeper`);
    
    // Filter for active players with valid positions
    const validPositions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    const filteredPlayers = Object.values(allPlayers)
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
        sleeper_id: player.player_id,
        name: player.full_name || `${player.first_name} ${player.last_name}`,
        position: player.position,
        team: player.team,
        status: player.status || 'Active',
        injury: player.injury_status || null,
        number: player.number,
        experience: player.years_exp || 0,
        college: player.college || null,
        projected_points: player.projected_points || 0,
        adp: player.adp || 999,
        tier: player.tier || 3,
        risk: player.risk || 'medium',
        upside: player.upside || 'medium',
        bye_week: player.bye_week || null,
        stats: player.stats || {},
        metadata: {
          height: player.height,
          weight: player.weight,
          birthdate: player.birth_date,
          college: player.college
        },
        updated_at: new Date().toISOString()
      }))
      .filter(validatePlayerData);
    
    console.log(`Filtered to ${filteredPlayers.length} active players`);
    
    // Store in Supabase
    if (filteredPlayers.length > 0) {
      console.log('Attempting to store players in Supabase...');
      console.log('Sample player data:', filteredPlayers[0]);
      
      const { error } = await supabase
        .from('players')
        .upsert(filteredPlayers, { 
          onConflict: 'sleeper_id',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error('Supabase error details:', error);
        throw new Error(`Failed to store players: ${error.message}`);
      }
      
      console.log(`Successfully imported ${filteredPlayers.length} players`);
      return {
        success: true,
        count: filteredPlayers.length
      };
    }
    
    return {
      success: true,
      count: 0
    };
  } catch (error) {
    console.error('Error importing players:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 