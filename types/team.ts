import { Player } from './player';
import { Roster } from './league';

export interface Team {
  id: string;
  name: string;
  logo: string;
  picks: Player[];
  roster?: Roster;
}

export interface League {
  id: string;
  name: string;
  teams: Team[];
  draftOrder: string[];
  currentPick: number;
  scoringFormat: 'standard' | 'ppr' | 'half_ppr';
  roster: {
    QB: number;
    RB: number;
    WR: number;
    TE: number;
    FLEX: number;
    K: number;
    DEF: number;
    BENCH: number;
  };
}