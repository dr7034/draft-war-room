"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Roster } from "@/types/league";
import { Player } from "@/types/player";
import { sleeperAPI } from "@/lib/sleeper-api";
import { useEffect, useState, useRef } from "react";
import { Loader2, Settings, Users, Trophy, Target, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface LeagueRostersProps {
  leagueId: string;
  userId: string;
}

interface LeagueUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string;
  metadata: {
    team_name?: string;
  };
  is_owner: boolean;
}

interface DraftPick {
  round: number;
  slot: number;
  previousOwnerRosterId: number;
  currentOwnerRosterId: number;
}

export default function LeagueRosters({ leagueId, userId }: LeagueRostersProps) {
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [users, setUsers] = useState<Record<string, LeagueUser>>({});
  const [leagueInfo, setLeagueInfo] = useState<any>(null);
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [teamDraftData, setTeamDraftData] = useState<any>(null);
  const [teamTransactions, setTeamTransactions] = useState<any[]>([]);
  const myTeamRef = useRef<HTMLDivElement>(null);

  // Build rosterIdToUserId and userIdToDisplayName
  const rosterIdToUserId: Record<number, string> = {};
  rosters.forEach(r => {
    rosterIdToUserId[r.id] = r.ownerId;
  });
  const userIdToDisplayName: Record<string, string> = {};
  Object.values(users).forEach(u => {
    userIdToDisplayName[u.user_id] = u.display_name || u.username || `User ${u.user_id}`;
  });

  // Helper to format pick display
  function formatPickDisplay(round: number, slot: number, fromName: string, toName?: string) {
    if (typeof slot !== 'number' || typeof round !== 'number') {
      console.warn('Invalid pick data:', { round, slot, fromName, toName });
      return 'Invalid pick';
    }
    return `Round ${round} • Pick ${slot.toString().padStart(2, '0')}` + (toName ? ` (from ${fromName} to ${toName})` : ` (from ${fromName})`);
  }

  useEffect(() => {
    const fetchRosters = async () => {
      try {
        setLoading(true);
        const [sleeperRosters, allPlayers, leagueUsers, leagueData] = await Promise.all([
          sleeperAPI.getLeagueRosters(leagueId),
          sleeperAPI.getAllPlayers(),
          sleeperAPI.getLeagueUsers(leagueId),
          sleeperAPI.getLeague(leagueId)
        ]);

        // Convert users to a map for easy lookup
        const usersMap: Record<string, LeagueUser> = {};
        leagueUsers.forEach(user => {
          usersMap[user.user_id] = user;
        });

        // Convert Sleeper rosters to our format
        const convertedRosters = sleeperRosters.map(roster => ({
          id: roster.roster_id,
          ownerId: roster.owner_id,
          starters: roster.starters || [],
          players: roster.players || [],
          reserve: roster.reserve || [],
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

        // Convert Sleeper players to our format
        const convertedPlayers: Record<string, Player> = {};
        Object.entries(allPlayers).forEach(([id, player]) => {
          convertedPlayers[id] = sleeperAPI.convertToPlayer(player);
        });

        setRosters(convertedRosters);
        setPlayers(convertedPlayers);
        setUsers(usersMap);
        setLeagueInfo(leagueData);
        
        // Extract draft order if available
        if ((leagueData as any).draft_order) {
          const order = Object.entries((leagueData as any).draft_order)
            .sort(([,a], [,b]) => (a as number) - (b as number))
            .map(([userId]) => userId);
          setDraftOrder(order);
        }
      } catch (error) {
        console.error('Error fetching rosters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRosters();
  }, [leagueId]);

  const getTeamName = (roster: Roster) => {
    const user = users[roster.ownerId];
    if (user?.metadata?.team_name) {
      return user.metadata.team_name;
    }
    // Find the team identifier in the starters array
    const teamId = roster.starters.find(id => id.length <= 3 && id === id.toUpperCase());
    return teamId || `Team ${roster.id}`;
  };

  const getOwnerName = (roster: Roster) => {
    const user = users[roster.ownerId];
    return user?.display_name || user?.username || 'Unknown Owner';
  };

  const fetchTeamData = async (roster: Roster) => {
    try {
      // Get draft info for the league
      const drafts = await sleeperAPI.getLeagueDrafts(leagueId);
      if (drafts.length > 0) {
        const draft = drafts[0]; // Get the most recent draft
        const [picks, tradedPicks] = await Promise.all([
          sleeperAPI.getDraftPicks(draft.draft_id),
          sleeperAPI.getDraftTradedPicks(draft.draft_id)
        ]);
        
        console.log('Draft data:', draft);
        console.log('Traded picks:', tradedPicks);
        setTeamDraftData({
          draft,
          picks,
          tradedPicks,
          userPicks: picks.filter((pick: any) => pick.picked_by === roster.ownerId),
          userTradedPicks: tradedPicks.filter((pick: any) => pick.owner_id === roster.id)
        });
      }

      // Get recent transactions for this team
      const transactions = await sleeperAPI.getLeagueTransactions(leagueId, 1);
      const teamTransactions = transactions.filter((tx: any) => 
        tx.roster_ids?.includes(roster.id)
      );
      console.log('Team transactions:', teamTransactions);
      setTeamTransactions(teamTransactions);
    } catch (error) {
      console.error('Error fetching team data:', error);
    }
  };

  const handleTeamClick = (roster: Roster) => {
    setSelectedTeam(roster);
    setShowTeamModal(true);
    fetchTeamData(roster);
  };

  // Build userIdToRosterId from rosters
  const userIdToRosterId: Record<string, number> = {};
  rosters.forEach(r => {
    userIdToRosterId[r.ownerId] = r.id;
  });

  // Build slotToUserId from draft.draft_order
  const slotToUserId: Record<number, string> = {};
  if (teamDraftData?.draft?.draft_order) {
    Object.entries(teamDraftData.draft.draft_order).forEach(([userId, slot]) => {
      slotToUserId[parseInt(slot as string)] = userId;
    });
  }

  // Build slotToRosterId using slotToUserId and userIdToRosterId
  const slotToRosterId: Record<number, number> = {};
  Object.entries(slotToUserId).forEach(([slot, userId]) => {
    slotToRosterId[parseInt(slot)] = userIdToRosterId[userId];
  });

  // Robust pick trade chain function
  function getPickTradeChain(round: number, slot: number, tradedPicks: any[], slotToRosterId: Record<number, number>) {
    const originalOwner = slotToRosterId[slot];
    let currentOwner = originalOwner;
    const chain: { from: number, to: number, trade: any }[] = [];
    const trades = tradedPicks
      .filter(tp => tp.round === round && tp.pick === slot)
      .sort((a, b) => (a.created && b.created ? a.created - b.created : 0));
    for (const trade of trades) {
      chain.push({ from: currentOwner, to: trade.owner_id, trade });
      currentOwner = trade.owner_id;
    }
    return { chain, finalOwner: currentOwner, originalOwner };
  }

  // For draft board: get all picks and their final owners
  const picks: { round: number, slot: number, finalOwner: number, originalOwner: number, chain: any[] }[] = [];
  if (teamDraftData?.draft) {
    const rounds = teamDraftData.draft.settings.rounds;
    const teams = teamDraftData.draft.settings.teams;
    for (let round = 1; round <= rounds; round++) {
      for (let slot = 1; slot <= teams; slot++) {
        const { chain, finalOwner, originalOwner } = getPickTradeChain(round, slot, teamDraftData.tradedPicks, slotToRosterId);
        picks.push({ round, slot, finalOwner, originalOwner, chain });
      }
    }
  }

  // For the selected team, show only picks where they are the final owner
  const owned = picks.filter(p => p.finalOwner === selectedTeam?.id);
  const sent = picks.filter(p => p.originalOwner === selectedTeam?.id && p.finalOwner !== selectedTeam?.id);

  function getTeamNameByRosterId(rosterId: number) {
    const userId = rosterIdToUserId[rosterId];
    return userIdToDisplayName[userId] || `Roster ${rosterId}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="rosters" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rosters" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Rosters
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            League Settings
          </TabsTrigger>
          <TabsTrigger value="draft" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Draft Order
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rosters" className="space-y-4">
          <button
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold shadow hover:scale-105 transition-transform"
            onClick={() => {
              if (myTeamRef.current) myTeamRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            Jump to My Team
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rosters.map((roster) => (
              <Card
                key={roster.id}
                ref={roster.ownerId === userId ? myTeamRef : undefined}
                className={`cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 flex flex-col ${
                  roster.ownerId === userId 
                    ? 'ring-2 ring-blue-500 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900' 
                    : 'hover:bg-accent/50 hover:ring-2 hover:ring-blue-300'
                }`}
                onClick={() => handleTeamClick(roster)}
              >
            <CardHeader>
                  <CardTitle className="flex flex-row items-center gap-3">
                    {/* Avatar */}
                    {users[roster.ownerId]?.avatar && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://sleepercdn.com/avatars/thumbs/${users[roster.ownerId].avatar}`} alt={users[roster.ownerId]?.display_name || users[roster.ownerId]?.username} />
                        <AvatarFallback>{(users[roster.ownerId]?.display_name || users[roster.ownerId]?.username || '?')[0]}</AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex flex-col">
                  <span className="text-lg font-bold">{getTeamName(roster)}</span>
                      <span className="text-xs text-muted-foreground">{getOwnerName(roster)}</span>
                    </div>
                    <span className="ml-auto text-sm font-normal">
                    {roster.settings.wins}-{roster.settings.losses}-{roster.settings.ties}
                  </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="font-semibold">Points For</p>
                    <p>{roster.settings.fpts}</p>
                  </div>
                  <div>
                        <p className="font-semibold mb-2">All Players</p>
                  <div className="space-y-1">
                          {roster.players
                            ?.filter(playerId => playerId !== '0' && playerId.length > 3)
                            .sort((a, b) => {
                              const aIsStarter = roster.starters.includes(a);
                              const bIsStarter = roster.starters.includes(b);
                              if (aIsStarter && !bIsStarter) return -1;
                              if (!aIsStarter && bIsStarter) return 1;
                              return 0;
                            })
                      .map((playerId) => {
                        const player = players[playerId];
                              const isStarter = roster.starters.includes(playerId);
                        return (
                                <div
                                  key={playerId}
                                  className={`p-2 rounded ${
                                    isStarter ? 'bg-green-50 dark:bg-green-950 border-l-2 border-green-500' : ''
                                  }`}

                                >
                                  <span className="text-sm">
                            {player ? `${player.name} (${player.position} - ${player.team})` : playerId}
                                  </span>
                                  {isStarter && (
                                    <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 rounded">
                                      Starter
                                    </span>
                                  )}
                          </div>
                        );
                      })}
                  </div>
                </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                League Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {leagueInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Basic Info</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">League Name:</span> {leagueInfo.name}</div>
                      <div><span className="font-medium">Season:</span> {leagueInfo.season}</div>
                      <div><span className="font-medium">Teams:</span> {leagueInfo.total_rosters}</div>
                      <div><span className="font-medium">Status:</span> {leagueInfo.status}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Scoring</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Format:</span> {leagueInfo.scoring_settings?.rec === 1 ? 'PPR' : leagueInfo.scoring_settings?.rec === 0.5 ? 'Half PPR' : 'Standard'}</div>
                      <div><span className="font-medium">Pass TD:</span> {leagueInfo.scoring_settings?.pass_td || 4}</div>
                      <div><span className="font-medium">Rush TD:</span> {leagueInfo.scoring_settings?.rush_td || 6}</div>
                      <div><span className="font-medium">Rec TD:</span> {leagueInfo.scoring_settings?.rec_td || 6}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="draft" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Draft Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              {draftOrder.length > 0 ? (
                <div className="space-y-2">
                  {draftOrder.map((draftUserId, index) => {
                    const user = users[draftUserId];
                    const isCurrentUser = draftUserId === userId;
                        return (
                      <div
                        key={draftUserId}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isCurrentUser ? 'bg-blue-100 dark:bg-blue-900 border-blue-300' : 'bg-background'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg w-8">{index + 1}</span>
                          <div>
                            <div className="font-semibold">{user?.display_name || user?.username || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">{user?.metadata?.team_name || 'No team name'}</div>
                          </div>
                        </div>
                        {isCurrentUser && (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">You</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Draft order not available yet</p>
                  <p className="text-sm">The draft order will be set when the draft begins</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
            </Tabs>

      {/* Team Modal */}
      {selectedTeam && (
        <Dialog open={showTeamModal} onOpenChange={setShowTeamModal}>
          <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl bg-gradient-to-br from-white/90 via-blue-50/90 to-purple-50/90 dark:from-slate-900/90 dark:via-blue-950/90 dark:to-purple-950/90 backdrop-blur border border-blue-300 dark:border-blue-800">
            <DialogHeader>
              <DialogTitle className="text-3xl font-extrabold text-primary flex items-center gap-3">
                {/* Avatar */}
                {users[selectedTeam.ownerId]?.avatar && (
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={`https://sleepercdn.com/avatars/${users[selectedTeam.ownerId].avatar}`} alt={users[selectedTeam.ownerId]?.display_name || users[selectedTeam.ownerId]?.username} />
                    <AvatarFallback>{(users[selectedTeam.ownerId]?.display_name || users[selectedTeam.ownerId]?.username || '?')[0]}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex flex-col">
                  <span>{getTeamName(selectedTeam)}</span>
                  <span className="text-lg font-normal text-muted-foreground">{getOwnerName(selectedTeam)}</span>
                </div>
                {selectedTeam.ownerId === userId && (
                  <span className="ml-auto px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-bold rounded-full">
                    Your Team
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Team Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Season Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{selectedTeam.settings.wins}</div>
                      <div className="text-sm text-muted-foreground">Wins</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{selectedTeam.settings.losses}</div>
                      <div className="text-sm text-muted-foreground">Losses</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{selectedTeam.settings.fpts}</div>
                      <div className="text-sm text-muted-foreground">Points For</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{selectedTeam.settings.fptsAgainst}</div>
                      <div className="text-sm text-muted-foreground">Points Against</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Draft Information */}
              {teamDraftData && (() => {                
                // Get status badge color
                const getStatusBadge = (status: string) => {
                  switch (status) {
                    case 'pre_draft':
                      return <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded-full">Pre-Draft</span>;
                    case 'in_progress':
                      return <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full">In Progress</span>;
                    case 'complete':
                      return <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium rounded-full">Complete</span>;
                    default:
                      return <span className="px-2 py-1 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-xs font-medium rounded-full">{status}</span>;
                  }
                };

                // Get actual pick numbers for this team
                const getTeamPickNumbers = () => {
                  const pickNumbers: string[] = [];
                  const rounds = teamDraftData.draft.settings.rounds;
                  const teams = teamDraftData.draft.settings.teams;
                  
                  // Build slot-to-userId map
                  const slotToUserId: Record<number, string> = {};
                  if (teamDraftData.draft.draft_order) {
                    Object.entries(teamDraftData.draft.draft_order).forEach(([userId, slot]) => {
                      slotToUserId[slot as number] = userId;
                    });
                  }

                  // Build slot-to-roster_id map
                  const slotToRosterId: Record<number, number> = {};
                  if (teamDraftData.draft.slot_to_roster_id) {
                    Object.entries(teamDraftData.draft.slot_to_roster_id).forEach(([slot, rosterId]) => {
                      slotToRosterId[parseInt(slot)] = rosterId as number;
                    });
                  }

                  // For each round and slot, determine who owns the pick
                  for (let round = 1; round <= rounds; round++) {
                    for (let slot = 1; slot <= teams; slot++) {
                      // Find if this pick was traded
                      const traded = teamDraftData.tradedPicks.find(
                        (tp: any) => tp.round === round && tp.pick === slot
                      );
                      
                      // Determine current owner
                      let currentOwnerRosterId: number;
                      if (traded) {
                        // Pick was traded - current owner is the new owner
                        currentOwnerRosterId = traded.owner_id;
                      } else {
                        // Pick wasn't traded - current owner is the original slot owner
                        currentOwnerRosterId = slotToRosterId[slot];
                      }
                      
                      // If this team owns this pick
                      if (currentOwnerRosterId === selectedTeam.id) {
                        pickNumbers.push(`${round}.${slot.toString().padStart(2, '0')}`);
                      }
                    }
                  }
                  
                  return pickNumbers;
                };

                const pickNumbers = getTeamPickNumbers();
                const tradedAwayRounds = sent.map(pick => pick.round);

                return (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Draft Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Draft Status */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <h4 className="font-semibold text-lg">Draft Status</h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Status:</span>
                              {getStatusBadge(teamDraftData.draft.status)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {teamDraftData.draft.type.charAt(0).toUpperCase() + teamDraftData.draft.type.slice(1)} • {teamDraftData.draft.settings.rounds} Rounds • {teamDraftData.draft.settings.teams} Teams
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <h4 className="font-semibold text-lg">Team Picks</h4>
                          <div className="space-y-2">
                            {owned.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                  <span className="text-green-600">✓</span>
                                  Picks Owned
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {owned.map((pick: any, idx: number) => {
                                    const isOriginal = pick.previousOwnerRosterId === pick.currentOwnerRosterId;
                                    return (
                                      <div key={idx} className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                                        <div className="font-semibold text-green-800 dark:text-green-200">
                                          {`Round ${pick.round} • Pick ${pick.slot.toString().padStart(2, '0')}`}
                                        </div>
                                        <div className="text-sm text-green-600 dark:text-green-400">
                                          {isOriginal ? (
                                            <span>Original pick</span>
                                          ) : (
                                            <span>Acquired from {getTeamNameByRosterId(pick.previousOwnerRosterId)}</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {sent.length > 0 && (
                              <div className="mt-4">
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                  <span className="text-red-600">✗</span>
                                  Picks Traded Away
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {sent.map((pick: any, idx: number) => {
                                    return (
                                      <div key={idx} className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                                        <div className="font-semibold text-red-800 dark:text-red-200">
                                          {`Round ${pick.round} • Pick ${pick.slot.toString().padStart(2, '0')}`}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}