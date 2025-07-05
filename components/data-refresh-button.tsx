'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useDataStore } from '@/lib/use-data-store';
import { RefreshCcw, Database, Save } from 'lucide-react';

interface DataRefreshButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
  label?: string;
  refreshOptions?: {
    players?: boolean;
    leagues?: boolean;
  };
  showSync?: boolean;
}

export function DataRefreshButton({
  variant = 'outline',
  size = 'sm',
  label = 'Refresh Data',
  refreshOptions = { players: true, leagues: false },
  showSync = true,
}: DataRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { refreshData, players, syncPlayersToSupabase, savePlayersDirectly } = useDataStore();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData(refreshOptions);
      toast.success('Data refreshed successfully');
      
      // Removing automatic sync to prevent potential loops
      // If we're refreshing players and showing sync button, trigger a sync to the DB
      // if (refreshOptions.players && showSync && players.length > 0) {
      //   handleSync();
      // }
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error(`Failed to refresh data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleSync = async () => {
    if (!players.length) {
      toast.warning('No players to sync');
      return;
    }
    
    setIsSyncing(true);
    try {
      await syncPlayersToSupabase();
      toast.success(`Successfully synced ${players.length} players to database`);
    } catch (error) {
      console.error('Error syncing players to database:', error);
      toast.error(`Failed to sync players: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  };
  
  const handleDirectSave = async () => {
    if (!players.length) {
      toast.warning('No players to save');
      return;
    }
    
    setIsSaving(true);
    try {
      const result = await savePlayersDirectly();
      toast.success(result.message || `Successfully saved players to database`);
    } catch (error) {
      console.error('Error saving players to database:', error);
      toast.error(`Failed to save players: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={handleRefresh}
        disabled={isRefreshing || isSyncing || isSaving}
      >
        {isRefreshing ? (
          <RefreshCcw className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <RefreshCcw className="h-4 w-4 mr-2" />
        )}
        {isRefreshing ? "Refreshing..." : label}
      </Button>
      
      {showSync && players.length > 0 && (
        <>
          <Button
            variant="outline"
            size={size}
            onClick={handleSync}
            disabled={isRefreshing || isSyncing || isSaving}
          >
            {isSyncing ? (
              <Database className="h-4 w-4 animate-pulse mr-2" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            {isSyncing ? "Syncing..." : "Standard Sync"}
          </Button>
          
          <Button
            variant="secondary"
            size={size}
            onClick={handleDirectSave}
            disabled={isRefreshing || isSyncing || isSaving}
          >
            {isSaving ? (
              <Save className="h-4 w-4 animate-pulse mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? "Saving..." : "Direct Save"}
          </Button>
        </>
      )}
    </div>
  );
}