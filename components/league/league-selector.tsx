"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { sleeperAPI } from '@/lib/sleeper-api';
import { League } from '@/types/league';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2 } from 'lucide-react';

interface LeagueSelectorProps {
  onLeagueSelect: (league: League) => void;
}

export default function LeagueSelector({ onLeagueSelect }: LeagueSelectorProps) {
  const [username, setUsername] = useState('');
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!username) return;

    try {
      setLoading(true);
      const user = await sleeperAPI.getUser(username);
      if (!user) {
        toast({
          title: "User Not Found",
          description: "Could not find a Sleeper user with that username",
          variant: "destructive",
        });
        return;
      }

      const userLeagues = await sleeperAPI.getUserLeagues(user.user_id, "2024");
      const formattedLeagues = userLeagues.map(league => {
        const scoringFormat: 'standard' | 'ppr' | 'half_ppr' = 
          league.scoring_settings.rec === 1 ? 'ppr' : 
          league.scoring_settings.rec === 0.5 ? 'half_ppr' : 
          'standard';

        return {
          id: league.league_id,
          name: league.name,
          totalRosters: league.total_rosters,
          status: league.status,
          season: league.season,
          scoringRules: [],
          rosterSettings: {
            QB: league.roster_positions.filter(pos => pos === 'QB').length,
            RB: league.roster_positions.filter(pos => pos === 'RB').length,
            WR: league.roster_positions.filter(pos => pos === 'WR').length,
            TE: league.roster_positions.filter(pos => pos === 'TE').length,
            FLEX: league.roster_positions.filter(pos => pos === 'FLEX').length,
            K: league.roster_positions.filter(pos => pos === 'K').length,
            DEF: league.roster_positions.filter(pos => pos === 'DEF').length,
            BENCH: league.roster_positions.filter(pos => pos === 'BN').length,
          },
          draftId: league.draft_id,
          scoringFormat,
          userId: user.user_id,
          username: user.username,
          displayName: user.display_name
        };
      });

      setLeagues(formattedLeagues);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch leagues. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Select Your League</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter Sleeper username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-8"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                autoComplete="off"
                data-1p-ignore
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Search
            </Button>
          </div>

          {leagues.length > 0 && (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {leagues.map((league) => (
                  <Card
                    key={league.id}
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => onLeagueSelect(league)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold">{league.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {league.season} • {league.scoringFormat}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {league.totalRosters} Teams
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}