"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Player } from '@/types/player';
import { Team } from '@/types/team';
import { League, Roster } from '@/types/league';
import { sleeperAPI } from '@/lib/sleeper-api';
import { adpService } from '@/lib/adp-service';
import { useToast } from '@/hooks/use-toast';

type DraftContextType = {
  players: Player[];
  draftedPlayers: Player[];
  userTeam: Team;
  currentPick: number;
  isLoading: boolean;
  league: League;
  userRoster: Roster | null;
  draftStarted: boolean;
  draftPlayer: (player: Player) => void;
  undoDraft: (player: Player) => void;
  setCurrentPick: (pick: number) => void;
  syncDraft: () => Promise<void>;
};

const defaultContext: DraftContextType = {
  players: [],
  draftedPlayers: [],
  userTeam: { id: 'user', name: 'Your Team', picks: [], logo: '' },
  currentPick: 1,
  isLoading: true,
  league: {} as League,
  userRoster: null,
  draftStarted: false,
  draftPlayer: () => {},
  undoDraft: () => {},
  setCurrentPick: () => {},
  syncDraft: async () => {},
};

const DraftContext = createContext<DraftContextType>(defaultContext);

export const useDraftContext = () => useContext(DraftContext);

interface DraftContextProviderProps {
  children: React.ReactNode;
  league: League;
}

export const DraftContextProvider = ({ children, league }: DraftContextProviderProps) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [draftedPlayers, setDraftedPlayers] = useState<Player[]>([]);
  const [userRoster, setUserRoster] = useState<Roster | null>(null);
  const [userTeam, setUserTeam] = useState<Team>(() => ({
    id: league.userId || 'user',
    name: league.username || 'Your Team',
    picks: [],
    logo: ''
  }));
  const [currentPick, setCurrentPick] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [draftStarted, setDraftStarted] = useState(false);
  const { toast } = useToast();

  // Find user's roster and update state
  const updateUserRoster = (rosters: Roster[]) => {
    const roster = rosters.find(r => r.ownerId === league.userId);
    if (roster) {
      setUserRoster(roster);
      // Update user team with roster info
      setUserTeam(prev => ({
        ...prev,
        id: roster.ownerId,
        name: league.username || 'Your Team',
        picks: prev.picks,
        logo: '',
        roster: roster
      }));
    }
  };

  const generateRecommendations = (player: Player, availablePlayers: Player[], draftedPlayers: Player[]) => {
    // Calculate risk based on position scarcity and player stats
    const positionCount = availablePlayers.filter(p => p.position === player.position).length;
    const totalPlayers = availablePlayers.length;
    const positionScarcity = positionCount / totalPlayers;
    
    let risk: 'high' | 'medium' | 'low' = 'low';
    if (positionScarcity < 0.1) risk = 'high';
    else if (positionScarcity < 0.2) risk = 'medium';
    
    // Calculate upside based on projected points
    let upside: 'high' | 'medium' | 'low' = 'low';
    const maxPoints = Math.max(...availablePlayers.map(p => p.projected_points || 0));
    const pointsRatio = (player.projected_points || 0) / maxPoints;
    if (pointsRatio > 0.8) upside = 'high';
    else if (pointsRatio > 0.6) upside = 'medium';
    
    // Generate recommendation
    let recommendation = '';
    if (risk === 'high' && upside === 'high') {
      recommendation = 'High-risk, high-reward pick. Consider if you need this position.';
    } else if (risk === 'low' && upside === 'high') {
      recommendation = 'Safe pick with high upside. Strongly consider.';
    } else if (risk === 'low' && upside === 'low') {
      recommendation = 'Safe but low upside. Consider for depth.';
    } else {
      recommendation = 'Evaluate based on your team needs.';
    }

    return {
      ...player,
      risk,
      upside,
      recommendation
    };
  };

  const syncDraft = async () => {
    try {
      setIsLoading(true);
      
      // Get draft data first
      let draft;
      let draftPicks: any[] = [];
      
      if (league.draftId) {
        try {
          draft = await sleeperAPI.getDraft(league.draftId);
          draftPicks = await sleeperAPI.getDraftPicks(league.draftId);
          
          // Update league with draft order if available
          if (draft.draft_order) {
            league.draftOrder = Object.entries(draft.draft_order)
              .sort(([,a], [,b]) => (a as number) - (b as number))
              .map(([userId]) => userId);
          }
        } catch (error) {
          console.warn('Draft not started yet:', error);
        }
      }

      // Get rosters for the league
      const rosters = await sleeperAPI.getLeagueRosters(league.id);
      league.rosters = rosters.map(roster => ({
        id: roster.roster_id,
        ownerId: roster.owner_id,
        starters: roster.starters,
        players: roster.players,
        reserve: roster.reserve,
        settings: {
          wins: roster.settings.wins,
          losses: roster.settings.losses,
          ties: roster.settings.ties,
          fpts: roster.settings.fpts,
          fptsAgainst: roster.settings.fpts_against,
          waiverPosition: roster.settings.waiver_position,
          waiverBudgetUsed: roster.settings.waiver_budget_used,
          totalMoves: roster.settings.total_moves,
        },
      }));

      // Update user's roster
      updateUserRoster(league.rosters);
      
      // Get all players from Sleeper
      const sleeperPlayers = await sleeperAPI.getAllPlayers();
      
      // Convert Sleeper players to our format
      const convertedPlayers = Object.values(sleeperPlayers)
        .filter(p => p.active && p.position)
        .map(p => {
          const player = sleeperAPI.convertToPlayer(p);
          return generateRecommendations(player, [], draftPicks);
        });

      // Get proper ADP data and rankings
      const playerRankings = await adpService.generatePlayerRankings(convertedPlayers);
      
      // Debug: Log some ranking data
      console.log('Player rankings sample:', playerRankings.slice(0, 5));
      console.log('Converted players sample:', convertedPlayers.slice(0, 5));
      
      // Merge rankings with player data
      const rankedPlayers = convertedPlayers.map(player => {
        const ranking = playerRankings.find(r => 
          r.playerId === player.id || 
          r.name.toLowerCase() === player.name.toLowerCase()
        );
        
        if (ranking) {
          return {
            ...player,
            adp: ranking.adp,
            tier: ranking.tier,
            risk: ranking.risk,
            upside: ranking.upside,
            recommendation: ranking.notes,
            tags: ranking.tags,
            ecr: ranking.ecr
          };
        }
        
        // Debug: Log unmatched players
        console.log('No ranking found for player:', player.name, player.position, player.team);
        
        return {
          ...player,
          adp: 999,
          tier: 5,
          tags: []
        };
      }).sort((a, b) => (a.adp || 999) - (b.adp || 999));
      
      // Process draft picks if available
      if (draftPicks.length > 0) {
        setDraftStarted(true);
        const draftedPlayerIds = new Set(draftPicks.map(pick => pick.player_id));
        
        const drafted = rankedPlayers
          .filter(p => draftedPlayerIds.has(p.id))
          .map(p => {
            const pick = draftPicks.find(dp => dp.player_id === p.id);
            return { ...p, draftPosition: pick.pick_no };
          });
        
        setDraftedPlayers(drafted);
        setPlayers(rankedPlayers.filter(p => !draftedPlayerIds.has(p.id)));
        setCurrentPick(draftPicks.length + 1);
        
        // Update user team with picks made by the user's ID
        const userPicks = drafted.filter(p => {
          const pick = draftPicks.find(dp => dp.player_id === p.id);
          return pick.picked_by === league.userId;
        });
        
        if (userPicks.length > 0) {
          setUserTeam(prev => ({
            ...prev,
            picks: userPicks,
          }));
        }
      } else {
        setDraftStarted(false);
        setPlayers(rankedPlayers);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error syncing draft:', error);
      toast({
        title: "Sync Error",
        description: "Failed to sync with Sleeper. Please try again.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (league.id && league.userId) {
      syncDraft();
    }
  }, [league.id, league.userId]);

  const draftPlayer = (player: Player) => {
    setPlayers(players.filter(p => p.id !== player.id));
    setDraftedPlayers([...draftedPlayers, { ...player, draftPosition: currentPick }]);
    
    // Check if it's the user's pick based on their roster
    const isUserPick = userRoster && currentPick % league.totalRosters === userRoster.id;
    if (isUserPick) {
      setUserTeam(prev => ({
        ...prev,
        picks: [...prev.picks, { ...player, draftPosition: currentPick }],
      }));
    }
    
    setCurrentPick(currentPick + 1);
  };

  const undoDraft = (player: Player) => {
    setDraftedPlayers(draftedPlayers.filter(p => p.id !== player.id));
    setPlayers([...players, player].sort((a, b) => (a.adp || 999) - (b.adp || 999)));
    
    // Check if it was the user's pick based on their roster
    const isUserPick = userRoster && player.draftPosition && 
      player.draftPosition % league.totalRosters === userRoster.id;
    
    if (isUserPick) {
      setUserTeam(prev => ({
        ...prev,
        picks: prev.picks.filter(p => p.id !== player.id),
      }));
    }
    
    setCurrentPick(currentPick - 1);
  };

  return (
    <DraftContext.Provider
      value={{
        players,
        draftedPlayers,
        userTeam,
        currentPick,
        isLoading,
        league,
        userRoster,
        draftStarted,
        draftPlayer,
        undoDraft,
        setCurrentPick,
        syncDraft,
      }}
    >
      {children}
    </DraftContext.Provider>
  );
};