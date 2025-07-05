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

            {/* --- MY TEAM SECTION --- */}
            {selectedTeam.ownerId === userId && (
              <div className="space-y-8 my-8">
                <h2 className="text-2xl font-bold mb-4">My Team: Pre-Draft Overview</h2>

                {/* 1. Draft Capital Overview */}
                <section>
                  <h3 className="text-xl font-semibold mb-2">Draft Capital Overview</h3>
                  <div className="text-muted-foreground">[Grid/Table of all rounds and slots, highlight your picks, show extras/missing]</div>
                </section>

                {/* 2. Draft Order Context */}
                <section>
                  <h3 className="text-xl font-semibold mb-2">Draft Order Context</h3>
                  <div className="text-muted-foreground">[Show your draft slot, pick numbers for each round, and full draft order for Round 1]</div>
                </section>

                {/* 3. Roster Needs/Strengths */}
                <section>
                  <h3 className="text-xl font-semibold mb-2">Roster Needs & Strengths</h3>
                  <div className="text-muted-foreground">[Summary of roster by position, highlight weak spots, show average age]</div>
                </section>

                {/* 4. Trade Suggestions */}
                <section>
                  <h3 className="text-xl font-semibold mb-2">Trade Suggestions</h3>
                  <div className="text-muted-foreground">[Suggest trading for more picks if missing, or packaging extras]</div>
                </section>

                {/* 5. Draft Strategy Tips */}
                <section>
                  <h3 className="text-xl font-semibold mb-2">Draft Strategy Tips</h3>
                  <div className="text-muted-foreground">[Blurb or link to draft strategy guide, best available by position]</div>
                </section>

                {/* 6. League Settings Recap */}
                <section>
                  <h3 className="text-xl font-semibold mb-2">League Settings Recap</h3>
                  <div className="text-muted-foreground">[Scoring format, roster size, draft type, special rules]</div>
                </section>

                {/* 7. Countdown/Timer */}
                <section>
                  <h3 className="text-xl font-semibold mb-2">Draft Countdown</h3>
                  <div className="text-muted-foreground">[Countdown to draft start, show local start time]</div>
                </section>
              </div>
            )}

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
              {teamDraftData && (
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
                            {(() => {
                              switch (teamDraftData.draft.status) {
                                case 'pre_draft':
                                  return <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded-full">Pre-Draft</span>;
                                case 'in_progress':
                                  return <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full">In Progress</span>;
                                case 'complete':
                                  return <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium rounded-full">Complete</span>;
                                default:
                                  return <span className="px-2 py-1 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-xs font-medium rounded-full">{teamDraftData.draft.status}</span>;
                              }
                            })()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {teamDraftData.draft.type.charAt(0).toUpperCase() + teamDraftData.draft.type.slice(1)} • {teamDraftData.draft.settings.rounds} Rounds • {teamDraftData.draft.settings.teams} Teams
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="font-semibold text-lg">Team Picks</h4>
                        <div className="space-y-2">
                          {(() => {
                            // ---
                            // Pre-draft pick attribution:
                            // Do NOT use the picks array (actual player selections) for pre-draft pick display.
                            // Only use slot_to_roster_id (from the draft object) and tradedPicks (from the traded picks endpoint).
                            // If slot_to_roster_id is missing, build it from draft_order and userId-to-rosterId mapping.
                            // ---
                            const rounds = teamDraftData.draft.settings.rounds;
                            const teams = teamDraftData.draft.settings.teams;
                            let slotToRosterId: Record<string, number> = Object.create(null);
                            if (teamDraftData.draft.slot_to_roster_id && typeof teamDraftData.draft.slot_to_roster_id === 'object') {
                              slotToRosterId = teamDraftData.draft.slot_to_roster_id as Record<string, number>;
                            }
                            const draftOrder = teamDraftData.draft.draft_order || {};
                            const tradedPicks = teamDraftData.tradedPicks || [];
                            const ownedPicks = [];
                            const tradedAwayPicks = [];

                            // If slotToRosterId is empty, build it from draftOrder and league rosters
                            if (Object.keys(slotToRosterId).length === 0 && Object.keys(draftOrder).length > 0 && rosters.length > 0) {
                              // Build userId -> rosterId mapping
                              const userIdToRosterId = {};
                              rosters.forEach(roster => {
                                userIdToRosterId[roster.ownerId] = roster.id;
                              });
                              // Build slot -> rosterId mapping
                              slotToRosterId = {};
                              Object.entries(draftOrder).forEach(([userId, slot]) => {
                                const rosterId = userIdToRosterId[userId];
                                if (rosterId !== undefined) {
                                  slotToRosterId[String(slot)] = rosterId;
                                }
                              });
                            }

                            // Debug logging
                            console.log('slotToRosterId', slotToRosterId);
                            console.log('selectedTeam.id', selectedTeam.id, typeof selectedTeam.id);

                            for (let round = 1; round <= rounds; round++) {
                              for (let slot = 1; slot <= teams; slot++) {
                                // Always use String(slot) for lookup, since slot_to_roster_id keys are strings
                                const originalOwner: number | undefined = slotToRosterId[String(slot)];
                                console.log(`Round ${round} Slot ${slot}: originalOwner=`, originalOwner, typeof originalOwner);
                                if (!originalOwner) continue; // skip if mapping is missing
                                // Find a trade for this pick (if any)
                                const trade = tradedPicks.find(
                                  (t: any) => t.round === round && t.roster_id === originalOwner
                                );
                                const finalOwner = trade ? trade.owner_id : originalOwner;

                                if (finalOwner === selectedTeam.id) {
                                  if (!trade && originalOwner === selectedTeam.id) {
                                    ownedPicks.push(`Round ${round} • Pick ${slot.toString().padStart(2, '0')} (Original)`);
                                  } else if (trade && originalOwner !== selectedTeam.id) {
                                    const fromTeam = getTeamNameByRosterId(trade.previous_owner_id);
                                    ownedPicks.push(`Round ${round} • Pick ${slot.toString().padStart(2, '0')} (from ${fromTeam})`);
                                  } else if (trade && originalOwner === selectedTeam.id) {
                                    ownedPicks.push(`Round ${round} • Pick ${slot.toString().padStart(2, '0')} (Original, reacquired)`);
                                  } else {
                                    ownedPicks.push(`Round ${round} • Pick ${slot.toString().padStart(2, '0')}`);
                                  }
                                } else if (originalOwner === selectedTeam.id && finalOwner !== selectedTeam.id) {
                                  const toTeam = getTeamNameByRosterId(finalOwner);
                                  tradedAwayPicks.push(`Round ${round} • Pick ${slot.toString().padStart(2, '0')} (to ${toTeam})`);
                                }
                              }
                            }

                            return (
                              <div className="space-y-4">
                                {ownedPicks.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold mb-2 text-green-600">Picks Owned ({ownedPicks.length})</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {ownedPicks.map((pick, idx) => (
                                        <div key={idx} className="p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded text-sm">
                                          {pick}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {tradedAwayPicks.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold mb-2 text-red-600">Picks Traded Away ({tradedAwayPicks.length})</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {tradedAwayPicks.map((pick, idx) => (
                                        <div key={idx} className="p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-sm">
                                          {pick}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {ownedPicks.length === 0 && tradedAwayPicks.length === 0 && (
                                  <div className="text-sm text-muted-foreground">
                                    No draft picks found for this team.
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transactions Section */}
              {teamTransactions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5" />
                      Recent Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {teamTransactions.map((transaction: any, index: number) => (
                        <div key={index} className="p-4 border rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">
                              {transaction.type === 'trade' ? 'Trade' : 
                               transaction.type === 'free_agent' ? 'Free Agent' :
                               transaction.type === 'waiver' ? 'Waiver' :
                               transaction.type}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(transaction.created).toLocaleDateString()}
                            </span>
                          </div>
                          
                          {transaction.type === 'trade' && (
                            <div className="text-sm space-y-2">
                              <div className="font-medium">Trade Details:</div>
                              <div className="pl-4 space-y-1">
                                {transaction.adds && Object.keys(transaction.adds).length > 0 && (
                                  <div>
                                    <span className="font-medium text-green-600">Received:</span>
                                    <div className="pl-2">
                                      {Object.entries(transaction.adds).map(([playerId, rosterId]: [string, any]) => (
                                        <div key={playerId} className="text-xs">
                                          {players[playerId]?.name || `Player ${playerId}`} (Roster {rosterId})
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {transaction.drops && Object.keys(transaction.drops).length > 0 && (
                                  <div>
                                    <span className="font-medium text-red-600">Traded Away:</span>
                                    <div className="pl-2">
                                      {Object.entries(transaction.drops).map(([playerId, rosterId]: [string, any]) => (
                                        <div key={playerId} className="text-xs">
                                          {players[playerId]?.name || `Player ${playerId}`} (Roster {rosterId})
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {transaction.type === 'free_agent' && (
                            <div className="text-sm">
                              {transaction.adds && Object.keys(transaction.adds).length > 0 && (
                                <div className="text-green-600">
                                  Added: {Object.keys(transaction.adds).map(playerId => 
                                    players[playerId]?.name || `Player ${playerId}`
                                  ).join(', ')}
                                </div>
                              )}
                              {transaction.drops && Object.keys(transaction.drops).length > 0 && (
                                <div className="text-red-600">
                                  Dropped: {Object.keys(transaction.drops).map(playerId => 
                                    players[playerId]?.name || `Player ${playerId}`
                                  ).join(', ')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}