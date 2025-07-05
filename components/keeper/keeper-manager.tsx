"use client"

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useDraftContext } from '@/context/draft-context';
import { getKeepers, addKeeper, removeKeeper } from '@/lib/keeper-service';
import { Keeper } from '@/types/keeper';
import { Player } from '@/types/player';
import PlayerCard from '@/components/players/player-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function KeeperManager() {
  const { league, players } = useDraftContext();
  const { toast } = useToast();
  const [keepers, setKeepers] = useState<Keeper[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadKeepers();
  }, [league.id]);

  const loadKeepers = async () => {
    if (!league.id || !league.userId) return [];
    
    setIsLoading(true);
    const loadedKeepers = await getKeepers(league.id, league.userId);
    setKeepers(loadedKeepers);
    setIsLoading(false);
    return loadedKeepers;
  };

  const roundOptions = useMemo(() => {
    if (!league?.totalRounds) return [];
    return Array.from({ length: league.totalRounds }, (_, i) => ({
      value: (i + 1).toString(),
      label: `Round ${i + 1}`,
    }));
  }, [league?.totalRounds]);

  const handleAddKeeper = async () => {
    if (!selectedPlayer || !selectedRound || !league?.id || !league?.userId) {
      toast({
        title: "Error",
        description: "Please select both a player and a round",
        variant: "destructive",
      });
      return;
    }

    // Check if player is already a keeper
    const existingKeeper = keepers.find(k => k.playerId === selectedPlayer.id);
    if (existingKeeper) {
      toast({
        title: "Error",
        description: "This player is already a keeper",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const newKeeper = await addKeeper({
        playerId: selectedPlayer.id,
        player: selectedPlayer,
        leagueId: league.id,
        userId: league.userId,
        round: parseInt(selectedRound),
      });

      if (newKeeper) {
        // Refresh keepers list
        const updatedKeepers = await loadKeepers();
        setKeepers(updatedKeepers);
        
        // Reset selection
        setSelectedPlayer(null);
        setSelectedRound('');

        toast({
          title: "Success",
          description: `Added ${selectedPlayer.name} as a keeper for round ${selectedRound}`,
        });
      } else {
        throw new Error("Failed to add keeper");
      }
    } catch (error) {
      console.error("Error adding keeper:", error);
      toast({
        title: "Error",
        description: "Failed to add keeper",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveKeeper = async (keeper: Keeper) => {
    setIsLoading(true);
    const success = await removeKeeper(keeper.id);
    if (success) {
      setKeepers(keepers.filter(k => k.id !== keeper.id));
      toast({
        title: "Success",
        description: "Keeper removed successfully"
      });
    }
    setIsLoading(false);
  };

  const availableRounds = Array.from({ length: league.totalRounds || 15 }, (_, i) => i + 1)
    .filter(round => !keepers.some(k => k.round === round));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Keepers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Select Player</Label>
              <Select
                value={selectedPlayer?.id}
                onValueChange={(value) => {
                  const player = players.find(p => p.id === value);
                  setSelectedPlayer(player || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a player" />
                </SelectTrigger>
                <SelectContent>
                  {players.map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name} - {player.position} {player.team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Round</Label>
              <Select
                value={selectedRound}
                onValueChange={setSelectedRound}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a round" />
                </SelectTrigger>
                <SelectContent>
                  {roundOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleAddKeeper}
              disabled={isLoading || !selectedPlayer || !selectedRound}
            >
              Add Keeper
            </Button>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Your Keepers</h3>
            {keepers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No keepers selected</p>
            ) : (
              <div className="grid gap-4">
                {keepers.map(keeper => (
                  <div key={keeper.id} className="flex items-center justify-between">
                    <PlayerCard 
                      player={keeper.player}
                      showDetails
                    />
                    <div className="flex items-center gap-4">
                      <span className="text-sm">Round {keeper.round}</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveKeeper(keeper)}
                        disabled={isLoading}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 