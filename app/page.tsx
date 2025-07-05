"use client"

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import Dashboard from '@/components/dashboard/dashboard';
import { DraftContextProvider } from '@/context/draft-context';
import { useLeagueContext } from '@/context/league-context';
import { League } from '@/types/league';
import { Sparkles, Trophy, LogOut } from 'lucide-react';
import { sleeperAPI } from '@/lib/sleeper-api';

interface SleeperUser {
  username: string;
  user_id: string;
  display_name: string;
  avatar?: string;
}

const glassCard = 'bg-gradient-to-br from-white/60 via-slate-100/60 to-blue-100/40 dark:from-slate-900/60 dark:via-slate-800/60 dark:to-blue-900/40 backdrop-blur shadow-xl border border-white/30 dark:border-slate-800/60';

export default function OnboardingPage() {
  const { selectedLeague, setSelectedLeague, isLoading: leagueLoading, clearLeague } = useLeagueContext();
  const [username, setUsername] = useState('');
  const [user, setUser] = useState<SleeperUser | null>(null);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const currentSeason = new Date().getFullYear().toString();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setUser(null);
    setLeagues([]);
    try {
      // Fetch user profile
      const userRes = await fetch(`https://api.sleeper.app/v1/user/${username}`);
      if (!userRes.ok) throw new Error('User not found');
      const userData = await userRes.json();
      setUser(userData);
      
      // Fetch leagues
      const leaguesRes = await fetch(`https://api.sleeper.app/v1/user/${userData.user_id}/leagues/nfl/${currentSeason}`);
      if (!leaguesRes.ok) throw new Error('Could not fetch leagues');
      const leaguesData = await leaguesRes.json();
      
      // Convert to our League format
      const formattedLeagues: League[] = leaguesData.map((league: any) => {
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
            QB: league.roster_positions.filter((pos: string) => pos === 'QB').length,
            RB: league.roster_positions.filter((pos: string) => pos === 'RB').length,
            WR: league.roster_positions.filter((pos: string) => pos === 'WR').length,
            TE: league.roster_positions.filter((pos: string) => pos === 'TE').length,
            FLEX: league.roster_positions.filter((pos: string) => pos === 'FLEX').length,
            K: league.roster_positions.filter((pos: string) => pos === 'K').length,
            DEF: league.roster_positions.filter((pos: string) => pos === 'DEF').length,
            BENCH: league.roster_positions.filter((pos: string) => pos === 'BN').length,
          },
          draftId: league.draft_id,
          scoringFormat,
          userId: userData.user_id,
          username: userData.username,
          displayName: userData.display_name
        };
      });
      
      setLeagues(formattedLeagues);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLeagueSelect = (league: League) => {
    setSelectedLeague(league);
  };

  // Show loading state while league context is initializing
  if (leagueLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If league is selected, show dashboard
  if (selectedLeague) {
    return (
      <main className="min-h-screen">
        <DraftContextProvider league={selectedLeague}>
          <Dashboard />
        </DraftContextProvider>
      </main>
    );
  }

  // Show onboarding
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 z-0 animate-gradient bg-gradient-to-br from-blue-100 via-slate-100 to-purple-200 dark:from-slate-900 dark:via-blue-900 dark:to-purple-900 opacity-80" style={{ filter: 'blur(8px)' }} />
      <Card className={`w-full max-w-lg p-6 rounded-2xl shadow-2xl ${glassCard} animate-fade-in relative z-10`}>
        <CardHeader>
          <CardTitle className="flex flex-col items-center gap-2">
            <span className="flex items-center gap-2 text-2xl font-bold">
              <Sparkles className="h-6 w-6 text-blue-400 animate-bounce" />
              Fantasy War Room
              <Trophy className="h-6 w-6 text-yellow-400 animate-pop" />
            </span>
            <span className="text-base font-normal text-muted-foreground">AI-powered draft helper for Sleeper leagues</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">Enter your Sleeper username</label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. sleeperuser"
                required
                disabled={loading}
                className="focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-shadow"
              />
            </div>
            <Button type="submit" disabled={loading || !username} className="w-full active:scale-95 transition-transform">
              {loading ? 'Loading...' : 'Continue'}
            </Button>
          </form>
          {error && <div className="mt-4 text-red-500 text-sm animate-pop">{error}</div>}
          {user && (
            <div className="mt-6 flex flex-col items-center gap-2 animate-fade-in">
              <Avatar className="h-16 w-16">
                {user.avatar ? (
                  <img
                    src={`https://sleepercdn.com/avatars/${user.avatar}`}
                    alt={user.display_name || user.username}
                    className="rounded-full"
                  />
                ) : (
                  <span className="text-2xl">👤</span>
                )}
              </Avatar>
              <div className="font-semibold text-lg">{user.display_name || user.username}</div>
              <div className="text-muted-foreground text-sm">@{user.username}</div>
            </div>
          )}
          {leagues.length > 0 && (
            <div className="mt-8">
              <div className="font-semibold mb-2">Your Leagues</div>
              <div className="grid grid-cols-1 gap-3">
                {leagues.map((league: League) => (
                  <button
                    key={league.id}
                    className={`flex items-center gap-3 p-3 rounded border transition hover:bg-accent ${selectedLeague?.id === league.id ? 'border-primary bg-accent' : 'border-border'} animate-pop`}
                    onClick={() => handleLeagueSelect(league)}
                    type="button"
                  >
                    <Avatar className="h-10 w-10">
                      <span className="text-xl">🏈</span>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{league.name}</span>
                      <span className="text-xs text-muted-foreground">Season: {league.season} | Status: {league.status}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}