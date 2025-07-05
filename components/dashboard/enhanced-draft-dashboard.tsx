"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDraftContext } from '@/context/draft-context';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle, 
  Star, 
  Crown,
  Target,
  Users,
  BarChart3,
  Zap,
  Shield
} from "lucide-react";
import EnhancedPlayerRankings from '@/components/players/enhanced-player-rankings';
import TierDraftBoard from '@/components/draft/tier-draft-board';
import { playerAnalysisService, PlayerAnalysis, PositionAnalysis, DraftStrategy } from '@/lib/player-analysis-service';
import { testADPService } from '@/lib/test-adp';

export default function EnhancedDraftDashboard() {
  const { players, isLoading, syncDraft } = useDraftContext();
  const [positionAnalyses, setPositionAnalyses] = useState<PositionAnalysis[]>([]);
  const [draftStrategy, setDraftStrategy] = useState<DraftStrategy | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (players.length > 0) {
      analyzePlayers();
    }
  }, [players]);

  const analyzePlayers = async () => {
    setIsAnalyzing(true);
    try {
      const [analyses, strategy] = await Promise.all([
        playerAnalysisService.analyzePositions(players),
        playerAnalysisService.generateDraftStrategy(players)
      ]);
      setPositionAnalyses(analyses);
      setDraftStrategy(strategy);
    } catch (error) {
      console.error('Error analyzing players:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const refreshADP = async () => {
    try {
      const response = await fetch('/api/adp/refresh', { method: 'POST' });
      if (response.ok) {
        await syncDraft();
        await analyzePlayers();
      }
    } catch (error) {
      console.error('Error refreshing ADP:', error);
    }
  };

  const testADP = async () => {
    try {
      await testADPService();
    } catch (error) {
      console.error('Error testing ADP:', error);
    }
  };

  const getScarcityColor = (scarcity: string) => {
    switch (scarcity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScarcityIcon = (scarcity: string) => {
    switch (scarcity) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Target className="w-4 h-4" />;
      case 'low': return <Users className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enhanced Draft Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive ADP data, player analysis, and draft strategy
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={refreshADP} 
            disabled={isLoading}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh ADP
          </Button>
          <Button 
            onClick={analyzePlayers} 
            disabled={isAnalyzing || players.length === 0}
          >
            <Zap className="w-4 h-4 mr-2" />
            {isAnalyzing ? 'Analyzing...' : 'Analyze Players'}
          </Button>
          <Button 
            onClick={testADP} 
            variant="outline"
            size="sm"
          >
            Test ADP
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Players</span>
            </div>
            <div className="text-2xl font-bold">{players.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Crown className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Tier 1 Players</span>
            </div>
            <div className="text-2xl font-bold">
              {players.filter(p => p.tier === 1).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">High Upside</span>
            </div>
            <div className="text-2xl font-bold">
              {players.filter(p => p.upside === 'high').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Low Risk</span>
            </div>
            <div className="text-2xl font-bold">
              {players.filter(p => p.risk === 'low').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="rankings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rankings">Player Rankings</TabsTrigger>
          <TabsTrigger value="tiers">Tier Board</TabsTrigger>
          <TabsTrigger value="analysis">Position Analysis</TabsTrigger>
          <TabsTrigger value="strategy">Draft Strategy</TabsTrigger>
        </TabsList>

        <TabsContent value="rankings" className="space-y-4">
          <EnhancedPlayerRankings />
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4">
          <TierDraftBoard />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          {positionAnalyses.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {positionAnalyses.map((analysis) => (
                <Card key={analysis.position}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{analysis.position} Analysis</span>
                      <Badge className={getScarcityColor(analysis.scarcity)}>
                        {getScarcityIcon(analysis.scarcity)}
                        <span className="ml-1">{analysis.scarcity} scarcity</span>
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Players:</span>
                        <div className="font-semibold">{analysis.totalPlayers}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg ADP:</span>
                        <div className="font-semibold">{analysis.averageADP.toFixed(1)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Proj. Pts:</span>
                        <div className="font-semibold">{analysis.averageProjectedPoints.toFixed(1)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Recommended:</span>
                        <div className="font-semibold">
                          {draftStrategy?.recommendedRounds[analysis.position as keyof typeof draftStrategy.recommendedRounds]}
                        </div>
                      </div>
                    </div>

                    {analysis.valuePicks.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Value Picks</h4>
                        <div className="space-y-1">
                          {analysis.valuePicks.slice(0, 3).map((player) => (
                            <div key={player.playerId} className="flex justify-between text-sm">
                              <span>{player.name}</span>
                              <span className="text-muted-foreground">ADP: {player.adp.toFixed(1)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.sleepers.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Sleepers</h4>
                        <div className="space-y-1">
                          {analysis.sleepers.slice(0, 3).map((player) => (
                            <div key={player.playerId} className="flex justify-between text-sm">
                              <span>{player.name}</span>
                              <span className="text-muted-foreground">ADP: {player.adp.toFixed(1)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  {isAnalyzing ? 'Analyzing players...' : 'Click "Analyze Players" to see position analysis'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="strategy" className="space-y-4">
          {draftStrategy ? (
            <div className="space-y-6">
              {/* Overall Strategy */}
              <Card>
                <CardHeader>
                  <CardTitle>Draft Strategy</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{draftStrategy.strategy}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Position Priority</h4>
                      <div className="space-y-1">
                        {draftStrategy.positionPriority.map((pos, index) => (
                          <div key={pos} className="flex items-center gap-2">
                            <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                              {index + 1}
                            </Badge>
                            <span className="text-sm">{pos}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Recommended Rounds</h4>
                      <div className="space-y-1 text-sm">
                        {Object.entries(draftStrategy.recommendedRounds).map(([pos, rounds]) => (
                          <div key={pos} className="flex justify-between">
                            <span>{pos}:</span>
                            <span className="font-medium">{rounds}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Value Targets */}
              {draftStrategy.valueTargets.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Value Targets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {draftStrategy.valueTargets.map((player) => (
                          <div key={player.playerId} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-semibold">{player.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {player.position} • {player.team} • ADP: {player.adp.toFixed(1)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-green-600">
                                Value: {player.valueScore}/100
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {player.projectedPoints.toFixed(1)} pts
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Sleepers */}
              {draftStrategy.sleepers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Sleepers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {draftStrategy.sleepers.map((player) => (
                          <div key={player.playerId} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-semibold">{player.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {player.position} • {player.team} • ADP: {player.adp.toFixed(1)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-blue-600">
                                Upside: {player.upsideScore}/100
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {player.projectedPoints.toFixed(1)} pts
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  {isAnalyzing ? 'Generating draft strategy...' : 'Click "Analyze Players" to see draft strategy'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 