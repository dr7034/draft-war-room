import { Player } from '@/types/player';

// Helper to normalize player names for matching
const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

export function mergePlayerData(sleeperPlayers: any[], ffcPlayers: any[]): Player[] {
  // Build FFC map by normalized name+team
  const ffcMap: Record<string, any> = {};
  ffcPlayers.forEach((p: any) => {
    const key = `${normalize(p.name)}|${p.team}`;
    ffcMap[key] = p;
  });

  return sleeperPlayers.map((p: any) => {
    const key = `${normalize(p.full_name)}|${p.team}`;
    let ffc = ffcMap[key];
    if (!ffc) {
      const lastName = p.full_name.split(' ').slice(-1)[0];
      const fallbackKey = `${normalize(lastName)}|${p.team}`;
      ffc = ffcMap[fallbackKey];
    }
    return {
      id: p.player_id,
      sleeper_id: p.player_id,
      name: p.full_name,
      position: p.position,
      team: p.team,
      status: p.status,
      injury: p.injury_status,
      number: p.number,
      experience: p.years_exp,
      college: p.college,
      projected_points: p.projected_points,
      adp: ffc?.adp,
      tier: undefined,
      risk: undefined,
      upside: undefined,
      bye_week: ffc?.bye,
      stats: p.stats,
      metadata: p.metadata,
      updated_at: undefined,
      draftPosition: undefined,
      trend: undefined,
      notes: undefined,
      ecr: ffc?.ecr,
      fantasy_pros_ecr: undefined,
      recommendation: undefined,
      tags: ffc?.tags,
      depth_chart_position: p.depth_chart_position,
      times_drafted: ffc?.times_drafted,
      high: ffc?.high,
      low: ffc?.low,
      stdev: ffc?.stdev,
      age: p.age,
    };
  });
} 