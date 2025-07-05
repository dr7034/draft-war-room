"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Player } from "@/types/player";
import { useDraftContext } from "@/context/draft-context";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { sleeperAPI } from "@/lib/sleeper-api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface TeamAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  stats: {
    wins: number;
    losses: number;
    ties: number;
    pointsFor: number;
    pointsAgainst: number;
    waiverPosition: number;
    totalMoves: number;
  };
  positionAnalysis: {
    QB: { count: number; starters: Player[]; projectedPoints: number };
    RB: { count: number; starters: Player[]; projectedPoints: number };
    WR: { count: number; starters: Player[]; projectedPoints: number };
    TE: { count: number; starters: Player[]; projectedPoints: number };
  };
  leagueComparison: {
    rank: number;
    totalTeams: number;
    pointsRank: number;
    recordRank: number;
    positionRanks: {
      QB: number;
      RB: number;
      WR: number;
      TE: number;
    };
    powerRanking: number;
    playoffOdds: string;
    brutalAssessment: string;
  };
}

export default function TeamRoster() {
  const { userTeam, league, draftedPlayers } = useDraftContext();
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("draft");
  const [analysis, setAnalysis] = useState<TeamAnalysis>({
    strengths: [],
    weaknesses: [],
    recommendations: [],
    stats: {
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      waiverPosition: 0,
      totalMoves: 0
    },
    positionAnalysis: {
      QB: { count: 0, starters: [], projectedPoints: 0 },
      RB: { count: 0, starters: [], projectedPoints: 0 },
      WR: { count: 0, starters: [], projectedPoints: 0 },
      TE: { count: 0, starters: [], projectedPoints: 0 }
    },
    leagueComparison: {
      rank: 0,
      totalTeams: 0,
      pointsRank: 0,
      recordRank: 0,
      positionRanks: {
        QB: 0,
        RB: 0,
        WR: 0,
        TE: 0
      },
      powerRanking: 0,
      playoffOdds: '',
      brutalAssessment: ''
    }
  });

  const analyzeTeam = async (roster: any, players: Record<string, Player>, leagueRosters: any[]) => {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    // Get all roster players (starters + reserve)
    const rosterPlayers = [...(roster.starters || []), ...(roster.reserve || [])]
      .filter(id => id !== '0' && id.length > 3)
      .map(id => players[id])
      .filter(Boolean);

    // Position analysis with projections
    const positionAnalysis = {
      QB: { count: 0, starters: [] as Player[], projectedPoints: 0 },
      RB: { count: 0, starters: [] as Player[], projectedPoints: 0 },
      WR: { count: 0, starters: [] as Player[], projectedPoints: 0 },
      TE: { count: 0, starters: [] as Player[], projectedPoints: 0 }
    };

    // Analyze each position with projections
    rosterPlayers.forEach(player => {
      if (positionAnalysis[player.position as keyof typeof positionAnalysis]) {
        const position = positionAnalysis[player.position as keyof typeof positionAnalysis];
        position.count++;
        if (roster.starters.includes(player.sleeper_id)) {
          position.starters.push(player);
        }
        // Use projected_points if available, otherwise use fantasy_pros_ecr as fallback
        position.projectedPoints += player.projected_points || player.fantasy_pros_ecr || 0;
      }
    });

    // QB Analysis with Superflex consideration
    const qbs = positionAnalysis.QB;
    const requiredQBs = league.rosterSettings.QB;
    const isSuperflex = (league.rosterSettings.SFLEX || 0) > 0;
    
    if (isSuperflex) {
      if (qbs.count >= 3) {
        strengths.push(`Strong QB depth with ${qbs.count} QBs (Superflex league)`);
      } else if (qbs.count === 2) {
        weaknesses.push('Limited QB depth for Superflex (only 2 QBs)');
        recommendations.push('Add a third QB for Superflex flexibility');
      } else if (qbs.count === 1) {
        weaknesses.push('Severe QB shortage for Superflex');
        recommendations.push('Priority: Add at least 2 more QBs for Superflex');
      }
    } else {
      if (qbs.count >= 2) {
        strengths.push(`Good QB depth with ${qbs.count} QBs`);
      } else if (qbs.count === 1) {
        weaknesses.push('Limited QB depth');
        recommendations.push('Consider adding a backup QB for bye weeks');
      }
    }

    // RB Analysis with projections
    const rbs = positionAnalysis.RB;
    const requiredRBs = league.rosterSettings.RB;
    const rbProjectedPoints = rbs.projectedPoints;
    
    if (rbs.count >= requiredRBs + 2) {
      strengths.push(`Excellent RB depth with ${rbs.count} RBs (${rbProjectedPoints.toFixed(1)} projected points)`);
    } else if (rbs.count < requiredRBs) {
      weaknesses.push(`Insufficient RB depth (${rbs.count} RBs, need ${requiredRBs})`);
      recommendations.push(`Priority: Add ${requiredRBs - rbs.count} more RBs`);
    } else if (rbs.count === requiredRBs) {
      weaknesses.push(`Minimal RB depth (${rbs.count} RBs)`);
      recommendations.push('Add RB depth for bye weeks and injuries');
    }

    // WR Analysis with projections
    const wrs = positionAnalysis.WR;
    const requiredWRs = league.rosterSettings.WR;
    const wrProjectedPoints = wrs.projectedPoints;
    
    if (wrs.count >= requiredWRs + 2) {
      strengths.push(`Strong WR corps with ${wrs.count} WRs (${wrProjectedPoints.toFixed(1)} projected points)`);
    } else if (wrs.count < requiredWRs) {
      weaknesses.push(`Insufficient WR depth (${wrs.count} WRs, need ${requiredWRs})`);
      recommendations.push(`Priority: Add ${requiredWRs - wrs.count} more WRs`);
    } else if (wrs.count === requiredWRs) {
      weaknesses.push(`Minimal WR depth (${wrs.count} WRs)`);
      recommendations.push('Add WR depth for bye weeks');
    }

    // TE Analysis with projections
    const tes = positionAnalysis.TE;
    const requiredTEs = league.rosterSettings.TE;
    const teProjectedPoints = tes.projectedPoints;
    
    if (tes.count >= requiredTEs + 1) {
      strengths.push(`Good TE depth with ${tes.count} TEs (${teProjectedPoints.toFixed(1)} projected points)`);
    } else if (tes.count < requiredTEs) {
      weaknesses.push(`Insufficient TE depth (${tes.count} TEs, need ${requiredTEs})`);
      recommendations.push(`Priority: Add ${requiredTEs - tes.count} more TEs`);
    }

    // Check roster balance against league settings
    const totalRequiredStarters = 
      league.rosterSettings.QB + 
      league.rosterSettings.RB + 
      league.rosterSettings.WR + 
      league.rosterSettings.TE + 
      (league.rosterSettings.SFLEX || 0) + 
      (league.rosterSettings.FLEX || 0);

    const starterCount = roster.starters.filter((id: string) => id !== '0' && id.length > 3).length;
    const reserveCount = roster.reserve ? roster.reserve.filter((id: string) => id !== '0' && id.length > 3).length : 0;

    if (starterCount < totalRequiredStarters) {
      weaknesses.push(`Missing ${totalRequiredStarters - starterCount} required starters`);
      recommendations.push(`Fill all ${totalRequiredStarters} starting roster spots`);
    }

    if (reserveCount < 4) {
      weaknesses.push('Limited bench depth');
      recommendations.push('Add more depth players for bye weeks and injuries');
    }

    // Analyze team performance
    const { wins, losses, ties, fpts, fpts_against, waiver_position, total_moves } = roster.settings;
    const winPercentage = (wins + (ties * 0.5)) / (wins + losses + ties);
    
    if (winPercentage > 0.6) {
      strengths.push(`Strong team performance (${wins}-${losses}-${ties})`);
    } else if (winPercentage < 0.4) {
      weaknesses.push(`Struggling team performance (${wins}-${losses}-${ties})`);
    }

    if (fpts > fpts_against) {
      strengths.push(`Positive point differential (+${fpts - fpts_against})`);
    } else {
      weaknesses.push(`Negative point differential (${fpts - fpts_against})`);
    }

    if (waiver_position > 8) {
      recommendations.push('Consider using waiver priority for key pickups');
    }

    if (total_moves < 5) {
      recommendations.push('More active roster management could improve team performance');
    }

    // League Comparison Analysis
    const leagueComparison = {
      rank: 0,
      totalTeams: leagueRosters.length,
      pointsRank: 0,
      recordRank: 0,
      positionRanks: {
        QB: 0,
        RB: 0,
        WR: 0,
        TE: 0
      },
      powerRanking: 0,
      playoffOdds: '',
      brutalAssessment: ''
    };

    // Calculate league rankings
    const sortedByPoints = [...leagueRosters].sort((a, b) => b.settings.fpts - a.settings.fpts);
    const sortedByRecord = [...leagueRosters].sort((a, b) => {
      const aWinPct = (a.settings.wins + (a.settings.ties * 0.5)) / (a.settings.wins + a.settings.losses + a.settings.ties);
      const bWinPct = (b.settings.wins + (b.settings.ties * 0.5)) / (b.settings.wins + b.settings.losses + b.settings.ties);
      return bWinPct - aWinPct;
    });

    // Find your ranks
    leagueComparison.pointsRank = sortedByPoints.findIndex(r => r.roster_id === roster.roster_id) + 1;
    leagueComparison.recordRank = sortedByRecord.findIndex(r => r.roster_id === roster.roster_id) + 1;

    // Calculate power ranking (weighted average of points and record)
    const pointsWeight = 0.6;
    const recordWeight = 0.4;
    leagueComparison.powerRanking = Math.round(
      ((leagueRosters.length - leagueComparison.pointsRank + 1) * pointsWeight) +
      ((leagueRosters.length - leagueComparison.recordRank + 1) * recordWeight)
    );

    // Calculate playoff odds
    const weeksRemaining = 14 - (roster.settings.wins + roster.settings.losses + roster.settings.ties);
    const currentWinPct = (roster.settings.wins + (roster.settings.ties * 0.5)) / 
      (roster.settings.wins + roster.settings.losses + roster.settings.ties);
    
    if (currentWinPct > 0.6) {
      leagueComparison.playoffOdds = 'High (75%+)';
    } else if (currentWinPct > 0.5) {
      leagueComparison.playoffOdds = 'Moderate (50-75%)';
    } else if (currentWinPct > 0.4) {
      leagueComparison.playoffOdds = 'Low (25-50%)';
    } else {
      leagueComparison.playoffOdds = 'Very Low (<25%)';
    }

    // Generate brutal assessment
    const assessments = [];
    
    // Record assessment
    if (leagueComparison.recordRank <= 3) {
      assessments.push(`Your record (${roster.settings.wins}-${roster.settings.losses}-${roster.settings.ties}) is elite, ranking ${leagueComparison.recordRank} in the league.`);
    } else if (leagueComparison.recordRank <= 6) {
      assessments.push(`Your record (${roster.settings.wins}-${roster.settings.losses}-${roster.settings.ties}) is solid, ranking ${leagueComparison.recordRank} in the league.`);
    } else {
      assessments.push(`Your record (${roster.settings.wins}-${roster.settings.losses}-${roster.settings.ties}) is disappointing, ranking ${leagueComparison.recordRank} in the league.`);
    }

    // Points assessment
    if (leagueComparison.pointsRank <= 3) {
      assessments.push(`You're a scoring machine, ranking ${leagueComparison.pointsRank} in points for.`);
    } else if (leagueComparison.pointsRank <= 6) {
      assessments.push(`Your scoring is average, ranking ${leagueComparison.pointsRank} in points for.`);
    } else {
      assessments.push(`Your scoring is weak, ranking ${leagueComparison.pointsRank} in points for.`);
    }

    // Position strength assessment
    const positionStrengths = [];
    if (positionAnalysis.QB.count >= 2) positionStrengths.push('QB');
    if (positionAnalysis.RB.count >= 4) positionStrengths.push('RB');
    if (positionAnalysis.WR.count >= 5) positionStrengths.push('WR');
    if (positionAnalysis.TE.count >= 2) positionStrengths.push('TE');
    
    if (positionStrengths.length > 0) {
      assessments.push(`Your strongest positions are: ${positionStrengths.join(', ')}.`);
    }

    // Weakness assessment
    const positionWeaknesses = [];
    if (positionAnalysis.QB.count < 2) positionWeaknesses.push('QB');
    if (positionAnalysis.RB.count < 3) positionWeaknesses.push('RB');
    if (positionAnalysis.WR.count < 4) positionWeaknesses.push('WR');
    if (positionAnalysis.TE.count < 2) positionWeaknesses.push('TE');
    
    if (positionWeaknesses.length > 0) {
      assessments.push(`You need help at: ${positionWeaknesses.join(', ')}.`);
    }

    // Roster management assessment
    if (roster.settings.total_moves < 5) {
      assessments.push('Your roster management has been too passive - more activity could improve your team.');
    } else if (roster.settings.total_moves > 20) {
      assessments.push('You might be over-managing your roster - consider being more selective with moves.');
    }

    leagueComparison.brutalAssessment = assessments.join(' ');

    setAnalysis({
      strengths,
      weaknesses,
      recommendations,
      stats: {
        wins,
        losses,
        ties,
        pointsFor: fpts,
        pointsAgainst: fpts_against,
        waiverPosition: waiver_position,
        totalMoves: total_moves
      },
      positionAnalysis,
      leagueComparison
    });
  };

  useEffect(() => {
    const fetchTeam = async () => {
      if (!userTeam?.id || !league?.id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch roster using userTeam.id
        const leagueRosters = await sleeperAPI.getLeagueRosters(league.id);
        if (!leagueRosters) {
          setLoading(false);
          return;
        }
        
        const userRoster = leagueRosters.find(r => r.owner_id === userTeam.id);
        if (!userRoster) {
          setLoading(false);
          return;
        }

        // Fetch all players
        const playersResponse = await sleeperAPI.getAllPlayers();
        if (!playersResponse) {
          setLoading(false);
          return;
        }

        // Map players by their sleeper_id
        const playersMap = Object.values(playersResponse).reduce((acc: Record<string, Player>, player: any) => {
          if (player.player_id) {
            acc[player.player_id] = sleeperAPI.convertToPlayer(player);
          }
          return acc;
        }, {});

        setPlayers(playersMap);
        setRoster(userRoster);

        // Analyze team with all rosters
        await analyzeTeam(userRoster, playersMap, leagueRosters);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching team:', error);
        setLoading(false);
      }
    };

    fetchTeam();
  }, [userTeam?.id, league?.id]);

  const userDraftedPlayers = draftedPlayers.filter(player => player.team === userTeam.id);

  const renderDraftTeam = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Draft Team</span>
          <span className="text-sm font-normal">
            {userDraftedPlayers.length} Players
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {userDraftedPlayers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No players drafted yet
            </div>
          ) : (
            <div className="space-y-2">
              {userDraftedPlayers.map((player) => (
                <div key={player.id} className="text-sm">
                  {player.name} ({player.position} - {player.team})
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderAnalysis = () => {
    if (!analysis) return null;

    return (
      <div className="space-y-6 mt-4">
        <Separator />
        <div>
          <h3 className="font-semibold mb-2">Team Analysis</h3>
          
          {/* League Comparison */}
          <div className="mb-4 p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2">League Comparison</h4>
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div>
                <p className="font-semibold">Power Ranking</p>
                <p>{analysis.leagueComparison.powerRanking}/{analysis.leagueComparison.totalTeams}</p>
              </div>
              <div>
                <p className="font-semibold">Playoff Odds</p>
                <p>{analysis.leagueComparison.playoffOdds}</p>
              </div>
              <div>
                <p className="font-semibold">Points Rank</p>
                <p>{analysis.leagueComparison.pointsRank}/{analysis.leagueComparison.totalTeams}</p>
              </div>
              <div>
                <p className="font-semibold">Record Rank</p>
                <p>{analysis.leagueComparison.recordRank}/{analysis.leagueComparison.totalTeams}</p>
              </div>
            </div>
            <div className="text-sm italic">
              {analysis.leagueComparison.brutalAssessment}
            </div>
          </div>

          {/* Team Stats */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-1">Season Stats</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="font-semibold">Record</p>
                <p>{analysis.stats.wins}-{analysis.stats.losses}-{analysis.stats.ties}</p>
              </div>
              <div>
                <p className="font-semibold">Points</p>
                <p>For: {analysis.stats.pointsFor} | Against: {analysis.stats.pointsAgainst}</p>
              </div>
              <div>
                <p className="font-semibold">Waiver Position</p>
                <p>{analysis.stats.waiverPosition}</p>
              </div>
              <div>
                <p className="font-semibold">Total Moves</p>
                <p>{analysis.stats.totalMoves}</p>
              </div>
            </div>
          </div>

          {/* Position Analysis */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-1">Position Breakdown</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(analysis.positionAnalysis).map(([pos, data]) => (
                <div key={pos}>
                  <p className="font-semibold">{pos}</p>
                  <p>Total: {data.count} | Starters: {data.starters.length}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths */}
          {analysis.strengths.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-1">Strengths</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.strengths.map((strength, index) => (
                  <Badge key={index} variant="outline" className="bg-green-100 text-green-800">
                    {strength}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Weaknesses */}
          {analysis.weaknesses.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-1">Areas to Improve</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.weaknesses.map((weakness, index) => (
                  <Badge key={index} variant="outline" className="bg-red-100 text-red-800">
                    {weakness}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1">Recommendations</h4>
              <ul className="list-disc list-inside text-sm space-y-1">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLeagueTeam = () => {
    if (!roster) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No league roster found</p>
        </div>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>League Team</span>
            <span className="text-sm font-normal">
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
                <p className="font-semibold">Points Against</p>
                <p>{roster.settings.fptsAgainst}</p>
              </div>
            </div>

            <div>
              <p className="font-semibold mb-2">Starters</p>
              <div className="space-y-1">
                {roster.starters
                  .filter((id: string) => id !== '0' && id.length > 3)
                  .map((playerId: string) => {
                    const player = players[playerId];
                    return (
                      <div key={playerId} className="text-sm">
                        {player ? `${player.name} (${player.position} - ${player.team})` : playerId}
                      </div>
                    );
                  })}
              </div>
            </div>

            {roster.reserve && roster.reserve.length > 0 && (
              <div>
                <p className="font-semibold mb-2">Reserve</p>
                <div className="space-y-1">
                  {roster.reserve.map((playerId: string) => {
                    const player = players[playerId];
                    return (
                      <div key={playerId} className="text-sm">
                        {player ? `${player.name} (${player.position} - ${player.team})` : playerId}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {renderAnalysis()}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-4 p-4">
        <Tabs defaultValue="draft" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draft">Draft Team</TabsTrigger>
            <TabsTrigger value="league">League Team</TabsTrigger>
          </TabsList>
          <TabsContent value="draft">
            {renderDraftTeam()}
          </TabsContent>
          <TabsContent value="league">
            {renderLeagueTeam()}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}