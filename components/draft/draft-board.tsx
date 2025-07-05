"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDraftContext } from '@/context/draft-context';
import { ScrollArea } from "@/components/ui/scroll-area";
import PlayerCard from '@/components/players/player-card';
import DraftPickList from '@/components/draft/draft-pick-list';
import DraftInsights from '@/components/draft/draft-insights';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, RefreshCw, Search, X } from 'lucide-react';
import RecommendationPanel from '@/components/ai/recommendation-panel';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { sleeperAPI } from '@/lib/sleeper-api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Player } from '@/types/player';
import { League } from '@/types/league';
import { generateDraftStrategy } from '@/lib/analysis-utils';

interface DraftAnalysis {
  topPicks: Array<{
    name: string;
    position: string;
    team: string;
    priority: 'High' | 'Medium' | 'Low';
    reasoning: string;
  }>;
  positionalAdvice: string;
  strategyAdvice: string;
}

interface Team {
  id: string;
  name: string;
  picks: Array<{
    id: string;
    name: string;
    position: string;
    team: string;
    draftPosition?: number;
  }>;
  logo: string;
}

export default function DraftBoard() {
  const { toast } = useToast();
  const { players, draftedPlayers, userTeam, currentPick, isLoading, league, draftPlayer, undoDraft, syncDraft } = useDraftContext();
  const [search, setSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [activeTab, setActiveTab] = useState('available');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const filteredPlayers = players
    .filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(search.toLowerCase());
      const matchesTeam = player.team.toLowerCase().includes(teamSearch.toLowerCase());
      // Remove the projection filter to show all players regardless of projection status
      return matchesSearch && matchesTeam;
    })
    .sort((a, b) => (a.adp || 999) - (b.adp || 999)); // Sort by ADP, lowest first (best players)

  const filteredDraftedPlayers = draftedPlayers.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(search.toLowerCase());
    const matchesTeam = player.team.toLowerCase().includes(teamSearch.toLowerCase());
    return matchesSearch && matchesTeam;
  });

  const renderPlayerCard = (player: Player) => (
    <Card key={player.id}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold">{player.name}</h3>
            <p className="text-sm text-muted-foreground">{player.position} - {player.team || 'FA'}</p>
            <p className="text-xs text-muted-foreground">ADP: {player.adp !== undefined ? player.adp : 'N/A'}</p>
          </div>
          <Button
            onClick={() => draftPlayer(player)}
            size="sm"
          >
            Draft
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderDraftedPlayerCard = (player: Player) => (
    <Card key={player.id}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold">{player.name}</h3>
            <p className="text-sm text-muted-foreground">{player.position} - {player.team || 'FA'}</p>
            <p className="text-sm text-muted-foreground">Pick #{player.draftPosition}</p>
            <p className="text-xs text-muted-foreground">ADP: {player.adp !== undefined ? player.adp : 'N/A'}</p>
          </div>
          <Button
            onClick={() => undoDraft(player)}
            variant="destructive"
            size="sm"
          >
            Undo
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const handleSync = async () => {
    try {
      await syncDraft();
      toast({
        title: "Success",
        description: "Draft synced successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to sync draft",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!players.length || !league) return;

    setError(null);

    try {
      // Generate draft strategy based on league settings and available players
      const strategy = generateDraftStrategy(league, players);
      setAnalysis(strategy);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, [userTeam.picks, players, league]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Draft Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Draft Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-2/3">
          <div className="flex gap-4 mb-4">
            <Input
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Input
              type="text"
              placeholder="Search teams..."
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              className="flex-1"
            />
          </div>
          
          <div className="flex gap-4 mb-4">
            <Button
              onClick={() => setActiveTab('available')}
              variant={activeTab === 'available' ? 'default' : 'secondary'}
            >
              Available Players
            </Button>
            <Button
              onClick={() => setActiveTab('drafted')}
              variant={activeTab === 'drafted' ? 'default' : 'secondary'}
            >
              Drafted Players
            </Button>
            <Button
              onClick={() => setShowAIRecommendations(true)}
              variant="outline"
              className="ml-auto"
            >
              <Brain className="h-4 w-4 mr-2" />
              Get AI Recommendations
            </Button>
          </div>

          {showAIRecommendations && (
            <RecommendationPanel onClose={() => setShowAIRecommendations(false)} />
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTab === 'available' ? (
                filteredPlayers.map(renderPlayerCard)
              ) : (
                filteredDraftedPlayers.map(renderDraftedPlayerCard)
              )}
            </div>
          )}
        </div>

        <div className="w-full md:w-1/3">
          <Card>
            <CardHeader>
              <CardTitle>Your Team</CardTitle>
            </CardHeader>
            <CardContent>
              {userTeam.picks.length === 0 ? (
                <p className="text-muted-foreground">No players drafted yet</p>
              ) : (
                <div className="space-y-4">
                  {userTeam.picks.map(pick => (
                    <div key={pick.id} className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{pick.name}</h3>
                        <p className="text-sm text-muted-foreground">{pick.position} - {pick.team || 'FA'}</p>
                      </div>
                      <Button
                        onClick={() => undoDraft(players.find(p => p.id === pick.id)!)}
                        variant="destructive"
                        size="sm"
                      >
                        Undo
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {analysis && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Draft Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                      League Settings Impact
                    </h3>
                    <div className="text-sm space-y-2">
                      <div dangerouslySetInnerHTML={{ 
                        __html: analysis.split('## League Settings Impact')[1]?.split('##')[0] || '' 
                      }} />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                      Round-by-Round Approach
                    </h3>
                    <div className="text-sm space-y-2">
                      <div dangerouslySetInnerHTML={{ 
                        __html: analysis.split('## Round-by-Round Approach')[1]?.split('##')[0] || '' 
                      }} />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                      Position Priority
                    </h3>
                    <div className="text-sm space-y-2">
                      <div dangerouslySetInnerHTML={{ 
                        __html: analysis.split('## Position Priority')[1] || '' 
                      }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-4">
            <Button
              onClick={handleSync}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}