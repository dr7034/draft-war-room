"use client"

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Header } from '@/components/layout/header';

import TeamRoster from '@/components/team/team-roster';
import AnalyticsPanel from '@/components/analytics/analytics-panel';
import CheatSheet from '@/components/cheat-sheet/cheat-sheet';
import LeagueRosters from '@/components/league/league-rosters';
import PreDraftMessage from '@/components/dashboard/pre-draft-message';
import { useState, useEffect } from 'react';
import { useDraftContext } from '@/context/draft-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import * as NFLIcons from 'react-nfl-logos';
import { Zap, LayoutDashboard, ClipboardList, Users, BarChart2, User, ListChecks } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';

// Helper: get team logo URL (use static or fallback)
const getTeamLogo = (team: string) => {
  if (!team || team === 'FA') return '/assets/football.svg'; // fallback icon
  return `/logos/nfl/${team.toLowerCase()}.svg`;
};

// Helper: map team names to NFL icon abbreviations
const getTeamAbbreviation = (teamName: string): string | null => {
  const teamMap: Record<string, string> = {
    'Arizona Cardinals': 'ARI',
    'Atlanta Falcons': 'ATL', 
    'Baltimore Ravens': 'BAL',
    'Buffalo Bills': 'BUF',
    'Carolina Panthers': 'CAR',
    'Chicago Bears': 'CHI',
    'Cincinnati Bengals': 'CIN',
    'Cleveland Browns': 'CLE',
    'Dallas Cowboys': 'DAL',
    'Denver Broncos': 'DEN',
    'Detroit Lions': 'DET',
    'Green Bay Packers': 'GB',
    'Houston Texans': 'HOU',
    'Indianapolis Colts': 'IND',
    'Jacksonville Jaguars': 'JAX',
    'Kansas City Chiefs': 'KC',
    'Las Vegas Raiders': 'LV',
    'Los Angeles Chargers': 'LAC',
    'Los Angeles Rams': 'LAR',
    'Miami Dolphins': 'MIA',
    'Minnesota Vikings': 'MIN',
    'New England Patriots': 'NE',
    'New Orleans Saints': 'NO',
    'New York Giants': 'NYG',
    'New York Jets': 'NYJ',
    'Philadelphia Eagles': 'PHI',
    'Pittsburgh Steelers': 'PIT',
    'San Francisco 49ers': 'SF',
    'Seattle Seahawks': 'SEA',
    'Tampa Bay Buccaneers': 'TB',
    'Tennessee Titans': 'TEN',
    'Washington Commanders': 'WAS'
  };
  return teamMap[teamName] || null;
};

interface SleeperPlayer {
  player_id: string;
  full_name: string;
  position: string;
  team: string;
  projected_points?: number;
  adp?: number;
  bye?: number;
  times_drafted?: number;
  high?: number;
  low?: number;
  stdev?: number;
  years_exp?: number;
  injury_status?: string;
  depth_chart_position?: string;
  depth_chart_order?: number;
  age?: number;
  college?: string;
  status?: string;
}

const glassCard = 'bg-gradient-to-br from-white/60 via-slate-100/60 to-blue-100/40 dark:from-slate-900/60 dark:via-slate-800/60 dark:to-blue-900/40 backdrop-blur shadow-xl border border-white/30 dark:border-slate-800/60';

// Helper to normalize player names for matching
const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

const PlayerList: React.FC = () => {
  const [players, setPlayers] = useState<SleeperPlayer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string>('ALL');
  const [sortColumn, setSortColumn] = useState<string>('adp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { league } = useDraftContext();
  const scoringTypeFromLeague = league?.scoringFormat || 'ppr';
  const [adpType, setAdpType] = useState<string>(scoringTypeFromLeague);

  useEffect(() => {
    const fetchPlayersAndADP = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch Sleeper players
        const res = await fetch('https://api.sleeper.app/v1/players/nfl');
        if (!res.ok) throw new Error('Failed to fetch players');
        const data = await res.json();
        // Only keep active players with a team and position and status === 'Active' and rotoworld_id is not null
        let playerArr = Object.values(data)
          .filter((p: any) =>
            p.status === 'Active' &&
            p.position &&
            ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(p.position) &&
            p.full_name &&
            p.team &&
            p.rotoworld_id
          )
          .map((p: any) => ({
            player_id: p.player_id,
            full_name: p.full_name,
            position: p.position,
            team: p.team,
            projected_points: p.projected_points,
            adp: undefined,
            bye: undefined,
            times_drafted: undefined,
            high: undefined,
            low: undefined,
            stdev: undefined,
            years_exp: p.years_exp,
            injury_status: p.injury_status,
            depth_chart_position: p.depth_chart_position,
            depth_chart_order: p.depth_chart_order,
            age: p.age,
            college: p.college,
            status: p.status,
          }));

        // Build ADP API URL dynamically
        const year = league?.season || new Date().getFullYear();
        const teams = league?.totalRosters || 12;
        const adpUrl = `/api/adp-proxy?type=${adpType}&teams=${teams}&year=${year}`;
        const adpRes = await fetch(adpUrl);
        if (!adpRes.ok) throw new Error('Failed to fetch ADP');
        const adpJson = await adpRes.json();
        const adpPlayers = adpJson.players || [];
        // Build FFC map by normalized name+team
        const ffcMap: Record<string, any> = {};
        adpPlayers.forEach((p: any) => {
          const key = `${normalize(p.name)}|${p.team}`;
          ffcMap[key] = p;
        });

        playerArr = playerArr.map((p: any) => {
          const key = `${normalize(p.full_name)}|${p.team}`;
          let ffc = ffcMap[key];
          // Fallback: last name + team
          if (!ffc) {
            const lastName = p.full_name.split(' ').slice(-1)[0];
            const fallbackKey = `${normalize(lastName)}|${p.team}`;
            ffc = ffcMap[fallbackKey];
          }
          // Merge Sleeper fields
          return {
            ...p,
            adp: ffc?.adp,
            bye: ffc?.bye,
            times_drafted: ffc?.times_drafted,
            high: ffc?.high,
            low: ffc?.low,
            stdev: ffc?.stdev,
            years_exp: p.years_exp,
            injury_status: p.injury_status,
            depth_chart_position: p.depth_chart_position,
            depth_chart_order: p.depth_chart_order,
            age: p.age,
            college: p.college,
          };
        });

        // Now sort by ADP (lowest first, undefined last)
        playerArr = playerArr.sort((a, b) => (a.adp ?? 9999) - (b.adp ?? 9999));
        setPlayers(playerArr);
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchPlayersAndADP();
  }, [adpType, league]);

  // Position filter logic
  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K'];
  let filteredPlayers = players.filter(
    (p) =>
      p.position !== 'DEF' &&
      (
        p.status === 'Active' ||
        p.status === 'Injured Reserve' ||
        p.status === 'Suspended'
      ) &&
      (selectedPosition === 'ALL' || p.position === selectedPosition) &&
      (p.full_name.toLowerCase().includes(search.toLowerCase()) ||
        p.team.toLowerCase().includes(search.toLowerCase()) ||
        p.position.toLowerCase().includes(search.toLowerCase()))
  );

  // Sorting logic
  filteredPlayers = [...filteredPlayers].sort((a, b) => {
    let aVal = a[sortColumn as keyof SleeperPlayer];
    let bVal = b[sortColumn as keyof SleeperPlayer];
    if (aVal === undefined || aVal === null) aVal = '';
    if (bVal === undefined || bVal === null) bVal = '';
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  return (
    <Card className={`mb-6 rounded-2xl shadow-2xl ${glassCard} animate-fade-in`}>
      <CardHeader>
        <CardTitle>Player Search</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 w-48">
          <Select value={adpType} onValueChange={setAdpType}>
            <SelectTrigger>
              <SelectValue placeholder="ADP Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ppr">PPR</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="2qb">2QB</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          placeholder="Search players by name, team, or position..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-4"
        />
        {/* Position Filter Pills */}
        <div className="flex gap-2 mb-4">
          {positions.map(pos => (
            <button
              key={pos}
              className={`px-3 py-1 rounded-full font-semibold text-sm transition-all shadow-md backdrop-blur border border-blue-200 dark:border-blue-800
                ${selectedPosition === pos
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white scale-105 shadow-lg'
                  : 'bg-white/30 dark:bg-slate-900/40 text-blue-900 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800'}
              `}
              onClick={() => setSelectedPosition(pos)}
            >
              {pos}
            </button>
          ))}
        </div>
        {/* Table View */}
        <div className="overflow-x-auto rounded-xl bg-white/40 dark:bg-slate-900/40 shadow border border-blue-100 dark:border-blue-800">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                {['adp', 'full_name', 'position', 'team', 'bye', 'depth_chart', 'exp'].map(col => (
                  <th
                    key={col}
                    className="px-3 py-2 font-bold text-left cursor-pointer select-none hover:text-blue-600 dark:hover:text-blue-300 transition"
                    onClick={() => {
                      if (sortColumn === col) {
                        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortColumn(col);
                        setSortDirection('asc');
                      }
                    }}
                  >
                    {col === 'adp' && 'ADP'}
                    {col === 'full_name' && 'Name'}
                    {col === 'position' && 'Pos'}
                    {col === 'team' && 'Team'}
                    {col === 'bye' && 'Bye'}
                    {col === 'depth_chart' && 'Depth'}
                    {col === 'exp' && 'Exp'}
                    {sortColumn === col && (
                      <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.slice(0, 100).map(player => (
                <tr
                  key={player.player_id}
                  className="hover:bg-blue-100/40 dark:hover:bg-blue-900/30 transition cursor-pointer"
                  onClick={() => { setSelectedPlayer(player); setShowModal(true); }}
                >
                  <td className="px-3 py-2">{player.adp ?? 'N/A'}</td>
                  <td className="px-3 py-2 font-medium">{player.full_name}</td>
                  <td className="px-3 py-2">{player.position}</td>
                  <td className="px-3 py-2">{player.team}</td>
                  <td className="px-3 py-2">{player.bye ?? 'N/A'}</td>
                  <td className="px-3 py-2">{player.depth_chart_position && player.depth_chart_order ? `${player.depth_chart_position}${player.depth_chart_order}` : 'N/A'}</td>
                  <td className="px-3 py-2">{player.years_exp ?? 'N/A'}</td>
                </tr>
              ))}
              {filteredPlayers.length === 0 && !loading && (
                <tr><td colSpan={7} className="text-center text-muted-foreground py-4">No players found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Player Details Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-md w-full rounded-2xl shadow-2xl bg-gradient-to-br from-white/80 via-blue-100/80 to-purple-100/80 dark:from-slate-900/80 dark:via-blue-900/80 dark:to-purple-900/80 backdrop-blur border border-blue-300 dark:border-blue-800 animate-modal-pop">
            <DialogHeader>
              <DialogTitle className="text-2xl font-extrabold text-primary flex items-center gap-2">
                {selectedPlayer?.full_name}
                <span className="ml-2 px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-xs font-bold uppercase tracking-wide">{selectedPlayer?.position}</span>
                <span className="ml-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-bold uppercase tracking-wide">{selectedPlayer?.team}</span>
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground mb-2">
                {selectedPlayer?.status || ''}
              </DialogDescription>
            </DialogHeader>
            {selectedPlayer && (
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div className="flex items-center gap-2"><span className="font-bold">ADP:</span> <span>{selectedPlayer.adp ?? 'N/A'}</span></div>
                <div className="flex items-center gap-2"><span className="font-bold">Bye:</span> <span>{selectedPlayer.bye ?? 'N/A'}</span></div>
                <div className="flex items-center gap-2"><span className="font-bold">Drafted:</span> <span>{selectedPlayer.times_drafted ?? 'N/A'}</span></div>
                <div className="flex items-center gap-2"><span className="font-bold">High/Low:</span> <span>{selectedPlayer.high ?? 'N/A'} / {selectedPlayer.low ?? 'N/A'}</span></div>
                <div className="flex items-center gap-2"><span className="font-bold">Stdev:</span> <span>{selectedPlayer.stdev ?? 'N/A'}</span></div>
                <div className="flex items-center gap-2"><span className="font-bold">Exp:</span> <span>{selectedPlayer.years_exp ?? 'N/A'}</span></div>
                <div className="flex items-center gap-2"><span className="font-bold">Injury:</span> <span>{selectedPlayer.injury_status ?? 'N/A'}</span></div>
                <div className="flex items-center gap-2"><span className="font-bold">Depth:</span> <span>{selectedPlayer.depth_chart_position && selectedPlayer.depth_chart_order ? `${selectedPlayer.depth_chart_position}${selectedPlayer.depth_chart_order}` : 'N/A'}</span></div>
                <div className="flex items-center gap-2"><span className="font-bold">Age:</span> <span>{selectedPlayer.age ?? 'N/A'}</span></div>
                <div className="flex items-center gap-2"><span className="font-bold">College:</span> <span>{selectedPlayer.college ?? 'N/A'}</span></div>
              </div>
            )}
            <DialogClose asChild>
              <button className="mt-4 px-6 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold shadow-lg hover:scale-105 transition-transform">Close</button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

const DraftBoard: React.FC = () => {
  const { league, userTeam } = useDraftContext();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [picks, setPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchDraft = async () => {
      if (!league?.id) return;
      
      setLoading(true);
      setError(null);
      try {
        const draftsRes = await fetch(`https://api.sleeper.app/v1/league/${league.id}/drafts`);
        if (!draftsRes.ok) throw new Error('Failed to fetch drafts');
        const drafts = await draftsRes.json();
        if (!drafts.length) throw new Error('No drafts found');
        
        if (!isMounted) return;
        setDraftId(drafts[0].draft_id);
        
        // Get draft order and teams
        if (drafts[0].draft_order) {
          const order = Object.entries(drafts[0].draft_order)
            .sort(([,a], [,b]) => (a as number) - (b as number))
            .map(([userId]) => userId);
          if (isMounted) setDraftOrder(order);
        }
        
        // Fetch league users for team info
        const usersRes = await fetch(`https://api.sleeper.app/v1/league/${league.id}/users`);
        const users = usersRes.ok ? await usersRes.json() : [];
        if (isMounted) setTeams(users);
        
        // Fetch picks
        const picksRes = await fetch(`https://api.sleeper.app/v1/draft/${drafts[0].draft_id}/picks`);
        if (!picksRes.ok) throw new Error('Failed to fetch picks');
        const picksData = await picksRes.json();
        if (isMounted) setPicks(picksData);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'An error occurred');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchDraft();
    return () => { isMounted = false; };
  }, [league?.id]); // Only depend on league.id

  // Build draft board grid
  let board: any[][] = [];
  let teamSlots: any[] = [];
  let rounds = 0;
  if (picks.length > 0) {
    teamSlots = Array.from(new Set(picks.map(p => p.draft_slot))).sort((a, b) => a - b);
    rounds = Math.max(...picks.map(p => p.round));
    board = Array.from({ length: rounds }, (_, r) =>
      teamSlots.map(slot => picks.find(p => p.round === r + 1 && p.draft_slot === slot))
    );
  } else if (draftOrder.length > 0 && teams.length > 0) {
    // Show empty draft board with draft order
    teamSlots = draftOrder;
    rounds = league.totalRounds || 15;
    board = Array.from({ length: rounds }, () => Array(teamSlots.length).fill(null));
  }

  // Round navigation
  const handleRoundChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRound(Number(e.target.value));
  };

  const displayedRounds = selectedRound ? [selectedRound - 1] : Array.from({ length: rounds }, (_, r) => r);

  return (
    <Card className={`mb-6 rounded-2xl shadow-2xl ${glassCard} animate-fade-in`}>
      <CardHeader>
        <CardTitle>Draft Board</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div>Loading draft board...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {!loading && !error && board.length > 0 && (
          <div className="overflow-x-auto">
            <div className="mb-2 flex items-center gap-2">
              <label htmlFor="round-select" className="text-sm font-medium">Jump to round:</label>
              <select
                id="round-select"
                className="border rounded px-2 py-1 text-sm"
                value={selectedRound || ''}
                onChange={handleRoundChange}
              >
                <option value="">All</option>
                {Array.from({ length: rounds }, (_, r) => (
                  <option key={r} value={r + 1}>Round {r + 1}</option>
                ))}
              </select>
            </div>
            <table className="min-w-full border text-sm">
              <thead>
                <tr>
                  <th className="border px-2 py-1 bg-muted">Round</th>
                  {teamSlots.map((slot, idx) => {
                    const team = teams.find(t => t.user_id === slot);
                    const abbr = team?.team || team?.metadata?.team || 'FA';
                    const Icon = abbr && NFLIcons[abbr as keyof typeof NFLIcons];
                    let logoEl = Icon ? <Icon size={28} /> : <img src="/assets/football.svg" alt="fallback" />;
                    
                    return (
                      <th key={slot} className="border px-2 py-1 bg-background animate-fade-in">
                        <div className="flex flex-col items-center gap-1">
                          {logoEl}
                          <span className="text-xs font-medium">{team?.display_name || `Team ${idx + 1}`}</span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {displayedRounds.map((rIdx) => (
                  <tr key={rIdx} className="animate-fade-in">
                    <td className="border px-2 py-1 font-bold bg-muted">{rIdx + 1}</td>
                    {board[rIdx].map((pick, cIdx) => {
                      const team = teams.find(t => t.user_id === teamSlots[cIdx]);
                      const abbr = team?.team || team?.metadata?.team || 'FA';
                      const Icon = abbr && NFLIcons[abbr as keyof typeof NFLIcons];
                      let logoEl = Icon ? <Icon size={24} /> : <img src="/assets/football.svg" alt="fallback" />;
                      
                      const isUserPick = pick && userTeam && pick.picked_by === userTeam.id;
                      return (
                        <td
                          key={cIdx}
                          className={`border px-2 py-1 min-w-[160px] ${isUserPick ? 'bg-green-100 dark:bg-green-900' : ''} animate-pop`}
                        >
                          {pick ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                {logoEl}
                                <span className="font-medium">{pick.metadata?.first_name} {pick.metadata?.last_name}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Pos: {pick.metadata?.position || '-'} | Team: {pick.metadata?.team || '-'} | Bye: {pick.metadata?.bye_week || '-'}
                              </div>
                              <div className="text-xs">
                                Pick #{pick.pick_no} | Proj: {pick.metadata?.projected_points ?? 'N/A'} | ADP: {pick.metadata?.adp ?? 'N/A'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && board.length === 0 && (
          <div className="text-muted-foreground py-4">Your league draft has not started yet.</div>
        )}
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("cheatsheet");
  const [preDraftMessageDismissed, setPreDraftMessageDismissed] = useState(false);
  const { league, draftStarted, isLoading } = useDraftContext();
  
  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 z-0 animate-gradient bg-gradient-to-br from-blue-100 via-slate-100 to-purple-200 dark:from-slate-900 dark:via-blue-900 dark:to-purple-900 opacity-80" style={{ filter: 'blur(8px)' }} />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 relative z-10">
        {/* Show pre-draft message if draft hasn't started */}
        {!isLoading && !draftStarted && league && !preDraftMessageDismissed && (
          <div className="mb-8">
            <PreDraftMessage 
              leagueName={league.name}
              totalRosters={league.totalRosters}
              season={league.season}
              onDismiss={() => setPreDraftMessageDismissed(true)}
            />
          </div>
        )}
        
        <Tabs 
          defaultValue="cheatsheet" 
          className="w-full"
          onValueChange={setActiveTab}
        >
          <TabsList className="flex justify-center gap-3 mb-10 rounded-3xl bg-white/30 dark:bg-slate-900/40 shadow-2xl backdrop-blur-lg border border-blue-300 dark:border-blue-800 p-2">
            <TabsTrigger value="cheatsheet" className="group flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-base transition-all
              data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500
              data-[state=active]:text-white data-[state=active]:shadow-2xl data-[state=active]:scale-110
              hover:scale-105 hover:shadow-lg">
              <ClipboardList className="w-5 h-5 group-data-[state=active]:text-white text-blue-700 dark:text-blue-300 transition-colors" />
              Cheat Sheet
            </TabsTrigger>
            <TabsTrigger value="draft" className="group flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-base transition-all
              data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500
              data-[state=active]:text-white data-[state=active]:shadow-2xl data-[state=active]:scale-110
              hover:scale-105 hover:shadow-lg">
              <LayoutDashboard className="w-5 h-5 group-data-[state=active]:text-white text-blue-700 dark:text-blue-300 transition-colors" />
              Draft Board
            </TabsTrigger>
            <TabsTrigger value="rosters" className="group flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-base transition-all
              data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500
              data-[state=active]:text-white data-[state=active]:shadow-2xl data-[state=active]:scale-110
              hover:scale-105 hover:shadow-lg">
              <Users className="w-5 h-5 group-data-[state=active]:text-white text-blue-700 dark:text-blue-300 transition-colors" />
              League Rosters
            </TabsTrigger>
            <TabsTrigger value="analytics" className="group flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-base transition-all
              data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500
              data-[state=active]:text-white data-[state=active]:shadow-2xl data-[state=active]:scale-110
              hover:scale-105 hover:shadow-lg">
              <BarChart2 className="w-5 h-5 group-data-[state=active]:text-white text-blue-700 dark:text-blue-300 transition-colors" />
              Analytics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="cheatsheet" className="space-y-4">
            <CheatSheet />
          </TabsContent>
          
          <TabsContent value="draft" className="space-y-4">
            <PlayerList />
            <DraftBoard />
          </TabsContent>
          
          <TabsContent value="rosters" className="space-y-4">
            {league?.id && league?.userId ? (
              <LeagueRosters leagueId={league.id} userId={league.userId} />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[300px] py-8">
                <svg className="animate-spin h-8 w-8 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                <div className="text-lg font-semibold text-muted-foreground">{!league?.id ? 'Select a league to view rosters.' : 'Loading league rosters...'}</div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-4">
            <AnalyticsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}