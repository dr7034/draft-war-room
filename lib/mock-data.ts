import { Player } from '@/types/player';
import { Team } from '@/types/team';
import { League } from '@/types/league';

export const mockPlayers: Player[] = [
  {
    id: '1',
    name: 'Christian McCaffrey',
    position: 'RB',
    team: 'SF',
    projectedPoints: 328.4,
    adp: 1.2,
    tier: 1,
    byeWeek: 9,
    stats: {
      rushingYards: 1459,
      rushingTDs: 14,
      receptions: 67,
      receivingYards: 564,
      receivingTDs: 7,
    },
    trend: 'stable',
    risk: 'low',
    upside: 'high',
    recommendation: 'Elite RB1 with massive upside in Kyle Shanahan\'s offense',
  },
  {
    id: '2',
    name: 'Tyreek Hill',
    position: 'WR',
    team: 'MIA',
    projectedPoints: 310.7,
    adp: 4.1,
    tier: 1,
    byeWeek: 10,
    stats: {
      receptions: 119,
      receivingYards: 1799,
      receivingTDs: 13,
    },
    trend: 'up',
    risk: 'low',
    upside: 'high',
    recommendation: 'Elite WR1 with game-breaking speed and consistent production',
  },
  {
    id: '3',
    name: 'Patrick Mahomes',
    position: 'QB',
    team: 'KC',
    projectedPoints: 380.6,
    adp: 25.7,
    tier: 1,
    byeWeek: 6,
    stats: {
      passingYards: 5250,
      passingTDs: 38,
      interceptions: 14,
      rushingYards: 358,
      rushingTDs: 4,
    },
    trend: 'stable',
    risk: 'low',
    upside: 'high',
    recommendation: 'Elite QB1 with consistent high-end production',
  },
  {
    id: '4',
    name: 'Travis Kelce',
    position: 'TE',
    team: 'KC',
    projectedPoints: 262.8,
    adp: 8.9,
    tier: 1,
    byeWeek: 6,
    stats: {
      receptions: 93,
      receivingYards: 984,
      receivingTDs: 10,
    },
    trend: 'down',
    risk: 'medium',
    upside: 'high',
    recommendation: 'Elite TE1 with massive positional advantage',
  },
  {
    id: '5',
    name: 'JaMarr Chase',
    position: 'WR',
    team: 'CIN',
    projectedPoints: 294.3,
    adp: 7.1,
    tier: 1,
    byeWeek: 7,
    stats: {
      receptions: 100,
      receivingYards: 1513,
      receivingTDs: 10,
    },
    trend: 'stable',
    risk: 'low',
    upside: 'high',
    recommendation: 'Elite WR1 with massive ceiling in Bengals offense',
  }
];

export const mockTeams: Team[] = [
  {
    id: 'user',
    name: 'Your Team',
    logo: '',
    picks: [],
  },
  {
    id: 'team1',
    name: 'Team Alpha',
    logo: '',
    picks: [],
  },
  {
    id: 'team2',
    name: 'Team Beta',
    logo: '',
    picks: [],
  },
];

export const mockLeagues: League[] = [
  {
    id: 'league1',
    name: 'Mock Draft League',
    totalRosters: 12,
    status: 'drafting',
    season: '2025',
    scoringRules: [],
    rosterSettings: {
      QB: 1,
      RB: 2,
      WR: 2,
      TE: 1,
      FLEX: 2,
      K: 1,
      DEF: 1,
      BENCH: 7,
    },
    scoringFormat: 'ppr',
  }
];

export const mockAiRecommendations = {
  topPicks: [
    {
      name: "Justin Jefferson",
      position: "WR",
      team: "MIN",
      priority: "High",
      reasoning: "Elite WR talent available at your draft position. Jefferson has consistently been a top producer and offers tremendous upside in the Vikings offense."
    },
    {
      name: "Bijan Robinson",
      position: "RB",
      team: "ATL",
      priority: "Medium",
      reasoning: "Top rookie RB with three-down potential. The scarcity at RB position makes this a solid pick, though slightly riskier as a rookie."
    },
    {
      name: "Travis Kelce",
      position: "TE",
      team: "KC",
      priority: "Medium",
      reasoning: "Massive positional advantage at TE. Kelce produces WR1 numbers at the scarce TE position, creating matchup advantages weekly."
    }
  ],
  positionalAdvice: "Your roster currently lacks RB depth. Consider targeting a high-volume RB in the next 1-2 rounds to establish a strong foundation. The WR position has more depth later in the draft.",
  strategyAdvice: "Based on current draft trends, QBs are being selected earlier than ADP. You may want to secure a top-tier QB earlier than planned, or commit to streaming the position and focus on RB/WR value."
};