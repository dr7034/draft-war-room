export interface ScoringRule {
  category: string;
  points: number;
  threshold?: number;
  description?: string;
}

export interface RosterSettings {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  FLEX: number;
  SFLEX?: number;
  K?: number;
  DEF?: number;
  BENCH?: number;
}

export interface Roster {
  id: number;
  ownerId: string;
  starters: string[];
  players: string[];
  reserve: string[];
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fptsAgainst: number;
    waiverPosition: number;
    waiverBudgetUsed: number;
    totalMoves: number;
  };
}

export interface League {
  id: string;
  name: string;
  totalRosters: number;
  status: string;
  season: string;
  scoringRules: ScoringRule[];
  rosterSettings: RosterSettings;
  draftId?: string;
  draftOrder?: string[];
  currentPick?: number;
  scoringFormat: 'standard' | 'ppr' | 'half_ppr';
  rosters?: Roster[];
  userId?: string;
  username?: string;
  displayName?: string;
  totalRounds: number;
}

export interface KeeperValue {
  playerId: string;
  originalRound: number;
  keeperRound: number;
  cost: number;
}