import { Player } from '../types/player';

export interface StandardizedPlayer extends Omit<Player, 'projected_points' | 'bye_week'> {
  projectedPoints: number;
  byeWeek: number | null;
}

export function standardizePlayer(player: Player): StandardizedPlayer {
  const { projected_points, bye_week, ...rest } = player;
  return {
    ...rest,
    projectedPoints: projected_points,
    byeWeek: bye_week,
  };
}

export function destandardizePlayer(player: StandardizedPlayer): Player {
  const { projectedPoints, byeWeek, ...rest } = player;
  return {
    ...rest,
    projected_points: projectedPoints,
    bye_week: byeWeek,
  };
}

export function standardizePlayers(players: Player[]): StandardizedPlayer[] {
  return players.map(standardizePlayer);
}

export function destandardizePlayers(players: StandardizedPlayer[]): Player[] {
  return players.map(destandardizePlayer);
} 