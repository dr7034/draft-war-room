import { supabase } from '@/lib/supabase-client';
import { Keeper } from '@/types/keeper';
import { Player } from '@/types/player';

export async function getKeepers(leagueId: string, userId?: string) {
  try {
    let query = supabase
      .from('keepers')
      .select(`
        *,
        player:players (*)
      `)
      .eq('leagueId', leagueId);

    if (userId) {
      query = query.eq('userId', userId);
    }

    const { data: keepers, error } = await query;

    if (error) {
      console.error('Error fetching keepers:', error);
      return [];
    }

    return keepers as Keeper[];
  } catch (error) {
    console.error('Error in getKeepers:', error);
    return [];
  }
}

export async function addKeeper(keeper: Omit<Keeper, 'id' | 'created_at' | 'updated_at'>) {
  try {
    const { data, error } = await supabase
      .from('keepers')
      .insert([{
        ...keeper,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding keeper:', error);
      return null;
    }

    return data as Keeper;
  } catch (error) {
    console.error('Error in addKeeper:', error);
    return null;
  }
}

export async function removeKeeper(keeperId: string) {
  try {
    const { error } = await supabase
      .from('keepers')
      .delete()
      .eq('id', keeperId);

    if (error) {
      console.error('Error removing keeper:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeKeeper:', error);
    return false;
  }
}

export async function updateKeeper(keeper: Partial<Keeper> & { id: string }) {
  try {
    const { data, error } = await supabase
      .from('keepers')
      .update({
        ...keeper,
        updated_at: new Date().toISOString()
      })
      .eq('id', keeper.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating keeper:', error);
      return null;
    }

    return data as Keeper;
  } catch (error) {
    console.error('Error in updateKeeper:', error);
    return null;
  }
} 