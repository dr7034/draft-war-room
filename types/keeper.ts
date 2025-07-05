import { Player } from './player';

export interface Keeper {
  id: string;
  playerId: string;
  leagueId: string;
  userId: string;
  player: Player;
  round: number;
  cost?: number;
  created_at: string;
  updated_at: string;
} 