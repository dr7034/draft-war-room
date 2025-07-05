"use client"

import { useDraftContext } from '@/context/draft-context';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, TrendingDown, Target } from "lucide-react";
import { Position } from '@/types/player';

interface PositionInsight {
  position: Position;
  scarcity: number;
  trend: 'up' | 'down' | 'stable';
  recommendation: string;
}

export default function DraftInsights() {
  const { players, draftedPlayers, currentPick } = useDraftContext();
  
  // Calculate position scarcity
  const getPositionScarcity = (position: Position): number => {
    const availablePlayers = players.filter(p => p.position === position);
    const draftedCount = draftedPlayers.filter(p => p.position === position).length;
    return Math.round((draftedCount / (availablePlayers.length + draftedCount)) * 100);
  };
  
  // Generate position insights
  const positionInsights: PositionInsight[] = [
    'QB', 'RB', 'WR', 'TE', 'K', 'DEF'
  ].map(pos => {
    const position = pos as Position;
    const scarcity = getPositionScarcity(position);
    
    // Determine trend based on recent picks
    const recentPicks = draftedPlayers.slice(-5);
    const recentPositionPicks = recentPicks.filter(p => p.position === position).length;
    const trend = recentPositionPicks >= 2 ? 'up' : recentPositionPicks === 0 ? 'down' : 'stable';
    
    // Generate recommendation
    let recommendation = '';
    if (scarcity > 70) {
      recommendation = `${position} getting very scarce - consider prioritizing if needed`;
    } else if (trend === 'up') {
      recommendation = `${position} run in progress - may want to join or wait`;
    } else if (trend === 'down') {
      recommendation = `Good value opportunity for ${position}`;
    }
    
    return { position, scarcity, trend, recommendation };
  });
  
  // Calculate current round
  const currentRound = Math.ceil(currentPick / 10);
  
  // Generate round-specific strategy
  const getRoundStrategy = () => {
    if (currentRound <= 2) {
      return "Focus on securing elite talent regardless of position";
    } else if (currentRound <= 5) {
      return "Target high-upside players with defined roles";
    } else if (currentRound <= 8) {
      return "Fill starting roster gaps and acquire depth";
    } else {
      return "Look for sleepers and high-upside lottery tickets";
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Draft Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Round {currentRound} Strategy: {getRoundStrategy()}
            </AlertDescription>
          </Alert>
          
          <div>
            <h3 className="font-medium mb-3">Position Analysis</h3>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {positionInsights.map(insight => (
                  <div key={insight.position} className="p-3 bg-muted/40 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge>{insight.position}</Badge>
                        <span className="text-sm font-medium">
                          Scarcity: {insight.scarcity}%
                        </span>
                      </div>
                      {insight.trend === 'up' && (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      )}
                      {insight.trend === 'down' && (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {insight.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Quick Tips</h3>
            <ul className="space-y-2 text-sm">
              <li>• Best available players are trending towards RB/WR</li>
              <li>• QB value sweet spot approaching in 2-3 rounds</li>
              <li>• Consider handcuffing your RB1 soon</li>
              <li>• Multiple sleeper TEs still available late</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}