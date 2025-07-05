"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, CircleXIcon, Loader2, X } from "lucide-react";
import { Player } from '@/types/player';
import { useDraftContext } from '@/context/draft-context';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";

interface RecommendationPanelProps {
  onClose: () => void;
}

interface AIRecommendation {
  name: string;
  position: string;
  team: string;
  priority: string;
  reasoning: string;
}

interface AIAnalysis {
  topPicks: AIRecommendation[];
  positionalAdvice: string;
  strategyAdvice: string;
}

export default function RecommendationPanel({ onClose }: RecommendationPanelProps) {
  const { userTeam, currentPick, league, draftedPlayers } = useDraftContext();
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<AIAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    const generateRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get available players (not drafted)
        const availablePlayers = draftedPlayers.filter(p => !p.team);
        
        if (!league?.scoringFormat || !league?.rosterSettings) {
          throw new Error('League settings are not properly configured');
        }

        // Make API call to OpenAI
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            players: availablePlayers,
            league: {
              scoringFormat: league.scoringFormat,
              rosterSettings: league.rosterSettings,
              currentPick,
              userTeam: {
                picks: userTeam.picks.map(p => ({
                  name: p.name,
                  position: p.position,
                  team: p.team
                }))
              }
            }
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to get AI recommendations');
        }

        setRecommendations(data);
      } catch (error) {
        console.error('Error generating recommendations:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate AI recommendations';
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    generateRecommendations();
  }, [userTeam, currentPick, league, draftedPlayers, toast]);
  
  if (loading) {
    return (
      <Card className="mb-4 relative">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
        <CardContent className="pt-6 pb-4 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-center text-muted-foreground">
            Analyzing draft situation and generating AI recommendations...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-4 relative">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
        <CardContent className="pt-6 pb-4">
          <div className="flex flex-col items-center text-center">
            <div className="rounded-full bg-destructive/15 p-3 mb-2">
              <X className="h-6 w-6 text-destructive" />
            </div>
            <p className="font-medium text-destructive mb-1">Error Generating Recommendations</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mb-4 relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-2 right-2"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3 mb-4">
          <Brain className="h-6 w-6 text-primary mt-1" />
          <div>
            <h3 className="font-semibold text-lg">AI Recommendations</h3>
            <p className="text-sm text-muted-foreground">
              Based on your current roster, draft position, and available players
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Top Recommendations</h4>
            <div className="space-y-2">
              {recommendations?.topPicks.map((player, index) => (
                <div key={index} className="p-3 bg-muted/40 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{player.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {player.position} - {player.team}
                      </div>
                    </div>
                    <Badge variant={player.priority === 'High' ? 'destructive' : player.priority === 'Medium' ? 'default' : 'secondary'}>
                      {player.priority}
                    </Badge>
                  </div>
                  <p className="text-sm mt-2">{player.reasoning}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Position Analysis</h4>
            <p className="text-sm">{recommendations?.positionalAdvice}</p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Draft Strategy Insight</h4>
            <p className="text-sm">{recommendations?.strategyAdvice}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}