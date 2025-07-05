import { useState, useEffect, useCallback } from 'react';
import { Player } from '@/types/player';
import { League } from '@/types/league';
import { useDataStore as useBaseDataStore } from './data-store';

/**
 * Hook for accessing and refreshing data in the data store
 */
export function useDataStore() {
  const dataStore = useBaseDataStore();
  const { 
    players, 
    leagues, 
    isLoading, 
    errors, 
    fetchPlayers, 
    fetchLeagues,
    syncPlayersToSupabase,
    savePlayersDirectly,
    lastUpdated
  } = dataStore;

  // Refresh data from remote sources
  const refreshData = useCallback(async (options: { players?: boolean; leagues?: boolean } = {}) => {
    const { players: refreshPlayers = true, leagues: refreshLeagues = false } = options;
    
    try {
      const response = await fetch('/api/data/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshPlayers, refreshLeagues }),
      });
      
      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Refresh operation failed');
      }
      
      // Reload data after successful refresh
      if (refreshPlayers) await fetchPlayers();
      
      return result;
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      throw error;
    }
  }, [fetchPlayers]);

  // Initial data loading
  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  return {
    players,
    leagues,
    isLoading,
    errors,
    lastUpdated,
    refreshData,
    fetchPlayers,
    fetchLeagues,
    syncPlayersToSupabase,
    savePlayersDirectly
  };
} 