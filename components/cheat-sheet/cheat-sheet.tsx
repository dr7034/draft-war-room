"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import PlayerCard from '@/components/players/player-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Position, Player } from '@/types/player';
import { Button } from '@/components/ui/button';
import { Database, Bug, Save, ChevronUp, ChevronDown, TrendingUp, AlertCircle, Sparkles, Trophy, Shield, Zap, Users, Star, Target, XCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from 'react-markdown';
import { useDraftContext } from '@/context/draft-context';
import { getAIAnalysis, generateLocalAnalysis, generateDraftStrategy } from '@/lib/analysis-service';
import { getAllPlayers, importPlayersFromSleeper } from '@/lib/player-service';
import { sleeperAPI } from '@/lib/sleeper-api';
import { supabase } from '@/lib/supabase-client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Separator } from "@/components/ui/separator";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { League } from '@/types/league';
import { Input } from '@/components/ui/input';

interface PositionInsight {
  tier: number;
  players: Player[];
  analysis: string;
  valueCliff: boolean;
  recommendation: string;
}

interface DraftInsight {
  round: number;
  bestAvailable: Player[];
  strategy: string;
  targetPositions: Position[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface BestValue {
  player: Player | null;
  diff: number;
}

interface CheatSheetProps {
  onPlayerSelect?: (player: Player) => void;
}

// DraftPrioritiesInput component
interface DraftPriorities {
  strategy: 'win_now' | 'rebuild' | 'trade_value' | 'balanced';
  positions: string[];
  risk: 'upside' | 'safe' | 'mix';
  tactics: string[];
  leagueContext: string[];
  other: {
    stack: boolean;
    handcuff: boolean;
    avoidByes: boolean;
    targetRookies: boolean;
    avoidTeams: string;
    notes: string;
  };
}

const defaultPriorities: DraftPriorities = {
  strategy: 'balanced',
  positions: [],
  risk: 'mix',
  tactics: [],
  leagueContext: [],
  other: {
    stack: false,
    handcuff: false,
    avoidByes: false,
    targetRookies: false,
    avoidTeams: '',
    notes: '',
  },
};

interface DraftPrioritiesInputProps {
  value: DraftPriorities;
  onChange: (val: DraftPriorities) => void;
}

const glassCard = 'bg-gradient-to-br from-white/60 via-slate-100/60 to-blue-100/40 dark:from-slate-900/60 dark:via-slate-800/60 dark:to-blue-900/40 backdrop-blur shadow-xl border border-white/30 dark:border-slate-800/60';

const badgeColors: Record<string, string> = {
  win_now: 'bg-yellow-200 text-yellow-800',
  rebuild: 'bg-blue-200 text-blue-800',
  trade_value: 'bg-green-200 text-green-800',
  balanced: 'bg-purple-200 text-purple-800',
  upside: 'bg-pink-200 text-pink-800',
  safe: 'bg-gray-200 text-gray-800',
  mix: 'bg-indigo-200 text-indigo-800',
};

const iconMap: Record<string, JSX.Element> = {
  win_now: <Trophy className="h-4 w-4 text-yellow-500" />,
  rebuild: <RefreshCw className="h-4 w-4 text-blue-500" />,
  trade_value: <Users className="h-4 w-4 text-green-500" />,
  balanced: <Star className="h-4 w-4 text-purple-500" />,
  upside: <Zap className="h-4 w-4 text-pink-500" />,
  safe: <Shield className="h-4 w-4 text-gray-500" />,
  mix: <Sparkles className="h-4 w-4 text-indigo-500" />,
};

const DraftPrioritiesInput: React.FC<DraftPrioritiesInputProps> = ({ value, onChange }) => {
  const handleChange = (field: keyof DraftPriorities, val: any) => {
    onChange({ ...value, [field]: val });
  };
  const handleOtherChange = (field: keyof DraftPriorities['other'], val: any) => {
    onChange({ ...value, other: { ...value.other, [field]: val } });
  };
  return (
    <div className={`mb-6 p-4 rounded-xl ${glassCard} animate-fade-in`}>
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-blue-400 animate-bounce" />
        <div className="font-semibold text-lg">Draft Strategy</div>
        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${badgeColors[value.strategy]}`}>{iconMap[value.strategy]} {value.strategy.replace('_', ' ').toUpperCase()}</span>
      </div>
      <div className="flex gap-4 mb-4">
        <label><input type="radio" name="strategy" checked={value.strategy === 'win_now'} onChange={() => handleChange('strategy', 'win_now')} /> Win Now</label>
        <label><input type="radio" name="strategy" checked={value.strategy === 'rebuild'} onChange={() => handleChange('strategy', 'rebuild')} /> Rebuild</label>
        <label><input type="radio" name="strategy" checked={value.strategy === 'trade_value'} onChange={() => handleChange('strategy', 'trade_value')} /> Maximize Trade Value</label>
        <label><input type="radio" name="strategy" checked={value.strategy === 'balanced'} onChange={() => handleChange('strategy', 'balanced')} /> Balanced</label>
      </div>
      <div className="mb-4">
        <div className="font-semibold mb-2 flex items-center gap-2"><Target className="h-4 w-4 text-green-500" />Positional Priorities</div>
        <div className="flex gap-2 flex-wrap">
          {value.positions.map(pos => (
            <Badge key={pos} className="bg-gradient-to-r from-blue-200 to-green-200 text-blue-900 animate-pop text-xs px-2 py-0.5">{pos.toUpperCase()}</Badge>
          ))}
        </div>
        <div className="flex gap-4 flex-wrap">
          <label><input type="checkbox" checked={value.positions.includes('zero_rb')} onChange={e => handleChange('positions', e.target.checked ? [...value.positions, 'zero_rb'] : value.positions.filter(p => p !== 'zero_rb'))} /> Zero RB</label>
          <label><input type="checkbox" checked={value.positions.includes('late_qb')} onChange={e => handleChange('positions', e.target.checked ? [...value.positions, 'late_qb'] : value.positions.filter(p => p !== 'late_qb'))} /> Late QB</label>
        </div>
      </div>
      <div className="mb-4">
        <div className="font-semibold mb-2 flex items-center gap-2"><Zap className="h-4 w-4 text-pink-500" />Risk Appetite</div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${badgeColors[value.risk]}`}>{iconMap[value.risk]} {value.risk.toUpperCase()}</span>
        <div className="flex gap-4">
          <label><input type="radio" name="risk" checked={value.risk === 'upside'} onChange={() => handleChange('risk', 'upside')} /> High Upside</label>
          <label><input type="radio" name="risk" checked={value.risk === 'safe'} onChange={() => handleChange('risk', 'safe')} /> Safe Floor</label>
          <label><input type="radio" name="risk" checked={value.risk === 'mix'} onChange={() => handleChange('risk', 'mix')} /> Mix</label>
        </div>
      </div>
      <div className="mb-4">
        <div className="font-semibold mb-2 flex items-center gap-2"><Star className="h-4 w-4 text-purple-500" />Draft Tactics</div>
        <div className="flex gap-2 flex-wrap">
          {value.tactics.map(tac => (
            <Badge key={tac} className="bg-gradient-to-r from-purple-200 to-pink-200 text-purple-900 animate-pop text-xs px-2 py-0.5">{tac.replace('_', ' ').toUpperCase()}</Badge>
          ))}
        </div>
        <div className="flex gap-4 flex-wrap">
          {['reach', 'strict_value', 'sleepers', 'avoid_injuries'].map(tac => (
            <label key={tac}><input type="checkbox" checked={value.tactics.includes(tac)} onChange={e => handleChange('tactics', e.target.checked ? [...value.tactics, tac] : value.tactics.filter(t => t !== tac))} /> {tac.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <div className="font-semibold mb-2 flex items-center gap-2"><Users className="h-4 w-4 text-green-500" />League Context</div>
        <div className="flex gap-2 flex-wrap">
          {value.leagueContext.map(ctx => (
            <Badge key={ctx} className="bg-gradient-to-r from-green-200 to-blue-200 text-green-900 animate-pop text-xs px-2 py-0.5">{ctx.replace('_', ' ').toUpperCase()}</Badge>
          ))}
        </div>
        <div className="flex gap-4 flex-wrap">
          {['keeper', 'dynasty', 'superflex', 'ppr', 'custom_scoring'].map(ctx => (
            <label key={ctx}><input type="checkbox" checked={value.leagueContext.includes(ctx)} onChange={e => handleChange('leagueContext', e.target.checked ? [...value.leagueContext, ctx] : value.leagueContext.filter(c => c !== ctx))} /> {ctx.replace('_', ' ').toUpperCase()}</label>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <div className="font-semibold mb-2 flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" />Other</div>
        <div className="flex gap-4 flex-wrap mb-2">
          <label><input type="checkbox" checked={value.other.stack} onChange={e => handleOtherChange('stack', e.target.checked)} /> Stack Teammates</label>
          <label><input type="checkbox" checked={value.other.handcuff} onChange={e => handleOtherChange('handcuff', e.target.checked)} /> Handcuff RBs</label>
          <label><input type="checkbox" checked={value.other.avoidByes} onChange={e => handleOtherChange('avoidByes', e.target.checked)} /> Avoid Stacking Byes</label>
          <label><input type="checkbox" checked={value.other.targetRookies} onChange={e => handleOtherChange('targetRookies', e.target.checked)} /> Target Rookies</label>
        </div>
        <div className="flex gap-4 flex-wrap mb-2">
          <label>Teams to Avoid: <input type="text" value={value.other.avoidTeams} onChange={e => handleOtherChange('avoidTeams', e.target.value)} className="border rounded px-2 py-1 ml-2" placeholder="e.g. NE, CHI" /></label>
        </div>
        <div>
          <label>Custom Notes: <input type="text" value={value.other.notes} onChange={e => handleOtherChange('notes', e.target.value)} className="border rounded px-2 py-1 ml-2 w-64" placeholder="Any other preferences..." /></label>
        </div>
      </div>
    </div>
  );
};

export default function CheatSheet({ onPlayerSelect }: CheatSheetProps) {
  const { players: contextPlayers, isLoading, league } = useDraftContext();
  const { toast } = useToast();
  const [selectedPosition, setSelectedPosition] = useState<Position | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [debugInfo, setDebugInfo] = useState({
    totalPlayers: 0,
    filteredCount: 0,
    lastUpdate: new Date().toISOString(),
    projectionSource: ''
  });
  const [priorities, setPriorities] = useState<DraftPriorities>(defaultPriorities);
  const [refreshKey, setRefreshKey] = useState(0);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Update debug info whenever players change
  useEffect(() => {
    if (!contextPlayers?.length) return;
    
    setDebugInfo(prev => ({
      ...prev,
      totalPlayers: contextPlayers.length,
      lastUpdate: new Date().toISOString(),
      projectionSource: contextPlayers[0]?.metadata?.projection_source || 'Unknown'
    }));
  }, [contextPlayers]);

  // Filter and sort players
  useEffect(() => {
    if (!contextPlayers) return;

    let filtered = [...contextPlayers];

    // Filter by position if not ALL
    if (selectedPosition !== 'ALL') {
      filtered = filtered.filter(player => player.position === selectedPosition);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(query) ||
        player.team?.toLowerCase().includes(query)
      );
    }

    // Sort by projected points and ADP
    filtered.sort((a, b) => {
      // First by projected points
      const projDiff = (b.projected_points || 0) - (a.projected_points || 0);
      if (projDiff !== 0) return projDiff;
      
      // Then by ADP if projections are equal
      return (a.adp || 999) - (b.adp || 999);
    });

    setFilteredPlayers(filtered);
    setDebugInfo(prev => ({
      ...prev,
      filteredCount: filtered.length
    }));
  }, [contextPlayers, selectedPosition, searchQuery]);

  const positions: (Position | 'ALL')[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'];

  // Helper: Generate AI prompt
  function generateAIPrompt() {
    return `You are a fantasy football draft assistant.\n\nLeague context: ${league?.name || ''}, ${league?.season || ''}, ${priorities.leagueContext.join(', ')}\n\nUser strategy: ${priorities.strategy}\nPositional priorities: ${priorities.positions.join(', ')}\nRisk: ${priorities.risk}\nTactics: ${priorities.tactics.join(', ')}\nOther: ${Object.entries(priorities.other).map(([k, v]) => `${k}: ${v}`).join(', ')}\n\nPlease provide a round-by-round draft plan, including players to target, players to avoid, and any advice for maximizing value in this context.`;
  }

  // Mock AI call (replace with real LLM API later)
  async function getAIDraftAdvice(prompt: string): Promise<string> {
    // Simulate network/LLM delay
    await new Promise(res => setTimeout(res, 1200));
    return `AI Draft Advice (mock):\n\nBased on your strategy (${priorities.strategy}), prioritize these positions: ${priorities.positions.join(', ') || 'none'}.\n\n- Round 1: Target best available RB/WR.\n- Round 2: Consider stacking teammates if possible.\n- Round 3: Look for value at QB or TE.\n- Later rounds: Target sleepers and handcuffs.\n\nCustom notes: ${priorities.other.notes || 'None.'}`;
  }

  async function handleGetAdvice() {
    setAiLoading(true);
    setAiError(null);
    setAiAdvice('');
    try {
      const prompt = generateAIPrompt();
      const advice = await getAIDraftAdvice(prompt);
      setAiAdvice(advice);
    } catch (err: any) {
      setAiError('Failed to get AI advice.');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Card className={`mb-6 p-4 rounded-2xl shadow-2xl ${glassCard} animate-fade-in`}>
        <DraftPrioritiesInput value={priorities} onChange={setPriorities} />
      </Card>
      <Card className={`mb-6 p-4 rounded-2xl shadow-2xl ${glassCard} animate-fade-in`}>
        <div className="mb-6">
          <Button onClick={handleGetAdvice} disabled={aiLoading}>
            {aiLoading ? 'Getting AI Draft Advice...' : 'Get AI Draft Advice'}
          </Button>
        </div>
        {aiError && <div className="mb-4 text-red-500">{aiError}</div>}
        {aiAdvice && (
          <div className="whitespace-pre-line">
            {aiAdvice}
          </div>
        )}
      </Card>
      <div className="flex gap-4 mb-4">
        <div className="flex gap-2">
          {positions.map(pos => (
            <Button
              key={pos}
              variant={selectedPosition === pos ? "default" : "outline"}
              onClick={() => setSelectedPosition(pos)}
            >
              {pos}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Player grid area: show loading/error/empty only here */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 min-h-[120px]">
        {isLoading && (
          <div className="col-span-full flex items-center justify-center text-muted-foreground">Loading players...</div>
        )}
        {!isLoading && filteredPlayers.length === 0 && (
          <div className="col-span-full flex items-center justify-center text-muted-foreground">No players found.</div>
        )}
        {!isLoading && filteredPlayers.length > 0 && filteredPlayers.map(player => (
          <PlayerCard 
            key={player.id} 
            player={player} 
            showDetails 
            onClick={() => onPlayerSelect?.(player)}
          />
        ))}
      </div>
      {/* Optionally, add a refresh button if loading fails or no players */}
      {!isLoading && filteredPlayers.length === 0 && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => setRefreshKey(k => k + 1)}>
            Refresh Players
          </Button>
        </div>
      )}

      {/* Debug info */}
      <div className="mt-4 text-sm text-gray-500">
        <p>Total Players: {debugInfo.totalPlayers}</p>
        <p>Filtered Count: {debugInfo.filteredCount}</p>
        <p>Last Update: {debugInfo.lastUpdate}</p>
        <p>Projection Source: {debugInfo.projectionSource}</p>
      </div>
    </div>
  );
}