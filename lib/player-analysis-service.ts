import { Player } from '@/types/player';
import { adpService, PlayerRanking } from '@/lib/adp-service';

export interface PlayerAnalysis {
  playerId: string;
  name: string;
  position: string;
  team: string;
  adp: number;
  tier: number;
  projectedPoints: number;
  valueScore: number; // 0-100, higher is better value
  riskScore: number; // 0-100, lower is less risky
  upsideScore: number; // 0-100, higher is more upside
  recommendation: string;
  tags: string[];
  comparablePlayers: string[];
  draftRound: number;
  valueOverReplacement: number;
  positionScarcity: 'high' | 'medium' | 'low';
  teamContext: string;
  injuryRisk: string;
  breakoutPotential: 'high' | 'medium' | 'low';
}

export interface PositionAnalysis {
  position: string;
  totalPlayers: number;
  averageADP: number;
  averageProjectedPoints: number;
  scarcity: 'high' | 'medium' | 'low';
  topPlayers: PlayerAnalysis[];
  valuePicks: PlayerAnalysis[];
  sleepers: PlayerAnalysis[];
  busts: PlayerAnalysis[];
}

export interface DraftStrategy {
  recommendedRounds: {
    QB: string;
    RB: string;
    WR: string;
    TE: string;
    K: string;
    DEF: string;
  };
  positionPriority: string[];
  valueTargets: PlayerAnalysis[];
  avoidPlayers: PlayerAnalysis[];
  sleepers: PlayerAnalysis[];
  strategy: string;
}

class PlayerAnalysisService {
  private static instance: PlayerAnalysisService;

  private constructor() {}

  static getInstance(): PlayerAnalysisService {
    if (!PlayerAnalysisService.instance) {
      PlayerAnalysisService.instance = new PlayerAnalysisService();
    }
    return PlayerAnalysisService.instance;
  }

  /**
   * Analyze a single player comprehensively
   */
  async analyzePlayer(player: Player, allPlayers: Player[]): Promise<PlayerAnalysis> {
    const rankings = await adpService.generatePlayerRankings([player]);
    const ranking = rankings[0];
    
    const projectedPoints = player.projected_points || 0;
    const adp = ranking?.adp || 999;
    const tier = ranking?.tier || 5;
    
    // Calculate value score (0-100)
    const valueScore = this.calculateValueScore(player, adp, allPlayers);
    
    // Calculate risk score (0-100, lower is less risky)
    const riskScore = this.calculateRiskScore(player);
    
    // Calculate upside score (0-100)
    const upsideScore = this.calculateUpsideScore(player, adp);
    
    // Find comparable players
    const comparablePlayers = this.findComparablePlayers(player, allPlayers);
    
    // Calculate value over replacement
    const vor = this.calculateValueOverReplacement(player, allPlayers);
    
    // Determine position scarcity
    const scarcity = this.determinePositionScarcity(player.position, allPlayers);
    
    // Generate recommendation
    const recommendation = this.generateRecommendation(player, adp, valueScore, riskScore);
    
    // Determine draft round
    const draftRound = Math.ceil(adp / 12); // Assuming 12-team league
    
    // Analyze team context
    const teamContext = this.analyzeTeamContext(player);
    
    // Assess injury risk
    const injuryRisk = this.assessInjuryRisk(player);
    
    // Determine breakout potential
    const breakoutPotential = this.assessBreakoutPotential(player);
    
    return {
      playerId: player.id,
      name: player.name,
      position: player.position,
      team: player.team || 'FA',
      adp,
      tier,
      projectedPoints,
      valueScore,
      riskScore,
      upsideScore,
      recommendation,
      tags: ranking?.tags || [],
      comparablePlayers,
      draftRound,
      valueOverReplacement: vor,
      positionScarcity: scarcity,
      teamContext,
      injuryRisk,
      breakoutPotential
    };
  }

  /**
   * Analyze all players by position
   */
  async analyzePositions(players: Player[]): Promise<PositionAnalysis[]> {
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
    const analyses: PositionAnalysis[] = [];
    
    for (const position of positions) {
      const positionPlayers = players.filter(p => p.position === position);
      if (positionPlayers.length === 0) continue;
      
      const playerAnalyses = await Promise.all(
        positionPlayers.map(player => this.analyzePlayer(player, players))
      );
      
      // Sort by ADP
      playerAnalyses.sort((a, b) => a.adp - b.adp);
      
      const averageADP = playerAnalyses.reduce((sum, p) => sum + p.adp, 0) / playerAnalyses.length;
      const averageProjectedPoints = playerAnalyses.reduce((sum, p) => sum + p.projectedPoints, 0) / playerAnalyses.length;
      
      const scarcity = this.determinePositionScarcity(position, players);
      
      // Find top players (top 20% by ADP)
      const topCount = Math.max(1, Math.floor(playerAnalyses.length * 0.2));
      const topPlayers = playerAnalyses.slice(0, topCount);
      
      // Find value picks (high value score, mid-late ADP)
      const valuePicks = playerAnalyses
        .filter(p => p.valueScore > 70 && p.adp > 50)
        .sort((a, b) => b.valueScore - a.valueScore)
        .slice(0, 5);
      
      // Find sleepers (high upside, late ADP)
      const sleepers = playerAnalyses
        .filter(p => p.upsideScore > 70 && p.adp > 100)
        .sort((a, b) => b.upsideScore - a.upsideScore)
        .slice(0, 5);
      
      // Find potential busts (high risk, early ADP)
      const busts = playerAnalyses
        .filter(p => p.riskScore > 70 && p.adp < 50)
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 5);
      
      analyses.push({
        position,
        totalPlayers: playerAnalyses.length,
        averageADP,
        averageProjectedPoints,
        scarcity,
        topPlayers,
        valuePicks,
        sleepers,
        busts
      });
    }
    
    return analyses;
  }

  /**
   * Generate draft strategy recommendations
   */
  async generateDraftStrategy(players: Player[]): Promise<DraftStrategy> {
    const positionAnalyses = await this.analyzePositions(players);
    
    // Determine position priority based on scarcity
    const positionPriority = positionAnalyses
      .sort((a, b) => {
        const scarcityOrder = { high: 3, medium: 2, low: 1 };
        return scarcityOrder[b.scarcity] - scarcityOrder[a.scarcity];
      })
      .map(analysis => analysis.position);
    
    // Find overall value targets
    const allAnalyses = await Promise.all(
      players.map(player => this.analyzePlayer(player, players))
    );
    
    const valueTargets = allAnalyses
      .filter(p => p.valueScore > 75)
      .sort((a, b) => b.valueScore - a.valueScore)
      .slice(0, 10);
    
    const avoidPlayers = allAnalyses
      .filter(p => p.riskScore > 80)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);
    
    const sleepers = allAnalyses
      .filter(p => p.upsideScore > 80 && p.adp > 100)
      .sort((a, b) => b.upsideScore - a.upsideScore)
      .slice(0, 10);
    
    // Generate recommended draft rounds
    const recommendedRounds = {
      QB: this.getRecommendedRounds('QB', positionAnalyses),
      RB: this.getRecommendedRounds('RB', positionAnalyses),
      WR: this.getRecommendedRounds('WR', positionAnalyses),
      TE: this.getRecommendedRounds('TE', positionAnalyses),
      K: this.getRecommendedRounds('K', positionAnalyses),
      DEF: this.getRecommendedRounds('DEF', positionAnalyses)
    };
    
    // Generate overall strategy
    const strategy = this.generateOverallStrategy(positionAnalyses, valueTargets, avoidPlayers);
    
    return {
      recommendedRounds,
      positionPriority,
      valueTargets,
      avoidPlayers,
      sleepers,
      strategy
    };
  }

  private calculateValueScore(player: Player, adp: number, allPlayers: Player[]): number {
    const projectedPoints = player.projected_points || 0;
    const position = player.position;
    
    // Get average projected points for position
    const positionPlayers = allPlayers.filter(p => p.position === position);
    const avgPoints = positionPlayers.reduce((sum, p) => sum + (p.projected_points || 0), 0) / positionPlayers.length;
    
    // Calculate value based on ADP vs projected points
    let valueScore = 50; // Base score
    
    // Bonus for high projected points relative to ADP
    if (adp <= 24 && projectedPoints > avgPoints * 1.2) valueScore += 20;
    if (adp <= 48 && projectedPoints > avgPoints * 1.1) valueScore += 15;
    if (adp <= 72 && projectedPoints > avgPoints * 1.05) valueScore += 10;
    
    // Bonus for late-round value
    if (adp > 100 && projectedPoints > avgPoints * 0.9) valueScore += 15;
    
    // Penalty for overvalued players
    if (adp <= 50 && projectedPoints < avgPoints * 0.8) valueScore -= 20;
    
    return Math.max(0, Math.min(100, valueScore));
  }

  private calculateRiskScore(player: Player): number {
    let riskScore = 30; // Base risk
    
    // Injury risk
    if (player.injury) riskScore += 30;
    if (player.experience && player.experience < 2) riskScore += 15;
    if (player.experience && player.experience > 8) riskScore += 10;
    
    // Team context risk
    const riskyTeams = ['NYJ', 'CHI', 'CAR', 'NE', 'NYG'];
    if (player.team && riskyTeams.includes(player.team)) riskScore += 10;
    
    // Position-specific risk
    if (player.position === 'RB' && (player.projected_points || 0) > 250) riskScore += 5;
    if (player.position === 'QB' && (player.projected_points || 0) > 350) riskScore += 5;
    
    return Math.max(0, Math.min(100, riskScore));
  }

  private calculateUpsideScore(player: Player, adp: number): number {
    let upsideScore = 50; // Base score
    
    const projectedPoints = player.projected_points || 0;
    const position = player.position;
    
    // High projected points relative to ADP
    if (adp > 100 && projectedPoints > 150) upsideScore += 20;
    if (adp > 150 && projectedPoints > 120) upsideScore += 15;
    
    // Young player upside
    if (player.experience && player.experience < 3) upsideScore += 10;
    
    // High-powered offense upside
    const highPowerTeams = ['KC', 'BUF', 'CIN', 'MIA', 'SF', 'PHI'];
    if (player.team && highPowerTeams.includes(player.team)) upsideScore += 10;
    
    // Position-specific upside
    if (position === 'WR' && projectedPoints > 200) upsideScore += 10;
    if (position === 'RB' && projectedPoints > 250) upsideScore += 10;
    if (position === 'QB' && projectedPoints > 300) upsideScore += 10;
    
    return Math.max(0, Math.min(100, upsideScore));
  }

  private findComparablePlayers(player: Player, allPlayers: Player[]): string[] {
    const position = player.position;
    const projectedPoints = player.projected_points || 0;
    
    return allPlayers
      .filter(p => 
        p.position === position && 
        p.id !== player.id &&
        Math.abs((p.projected_points || 0) - projectedPoints) < 20
      )
      .sort((a, b) => Math.abs((a.projected_points || 0) - projectedPoints) - Math.abs((b.projected_points || 0) - projectedPoints))
      .slice(0, 3)
      .map(p => p.name);
  }

  private calculateValueOverReplacement(player: Player, allPlayers: Player[]): number {
    const position = player.position;
    const projectedPoints = player.projected_points || 0;
    
    // Find replacement level player (varies by position)
    const replacementLevels = {
      QB: 12,
      RB: 30,
      WR: 36,
      TE: 12,
      K: 12,
      DEF: 12
    };
    
    const replacementIndex = replacementLevels[position as keyof typeof replacementLevels] - 1;
    const positionPlayers = allPlayers
      .filter(p => p.position === position)
      .sort((a, b) => (b.projected_points || 0) - (a.projected_points || 0));
    
    if (replacementIndex >= positionPlayers.length) {
      return projectedPoints;
    }
    
    const replacementPlayer = positionPlayers[replacementIndex];
    return projectedPoints - (replacementPlayer.projected_points || 0);
  }

  private determinePositionScarcity(position: string, allPlayers: Player[]): 'high' | 'medium' | 'low' {
    const positionPlayers = allPlayers.filter(p => p.position === position);
    const totalPlayers = allPlayers.length;
    const positionPercentage = positionPlayers.length / totalPlayers;
    
    const scarcityThresholds = {
      QB: { high: 0.08, medium: 0.12 },
      RB: { high: 0.15, medium: 0.25 },
      WR: { high: 0.20, medium: 0.30 },
      TE: { high: 0.08, medium: 0.12 },
      K: { high: 0.08, medium: 0.12 },
      DEF: { high: 0.08, medium: 0.12 }
    };
    
    const thresholds = scarcityThresholds[position as keyof typeof scarcityThresholds];
    if (!thresholds) return 'medium';
    
    if (positionPercentage < thresholds.high) return 'high';
    if (positionPercentage < thresholds.medium) return 'medium';
    return 'low';
  }

  private generateRecommendation(player: Player, adp: number, valueScore: number, riskScore: number): string {
    const recommendations: string[] = [];
    
    if (adp <= 24) {
      recommendations.push('Early round foundation player');
    } else if (adp <= 72) {
      recommendations.push('Mid-round value target');
    } else if (adp <= 120) {
      recommendations.push('Late-round sleeper candidate');
    } else {
      recommendations.push('Deep league target');
    }
    
    if (valueScore > 80) {
      recommendations.push('Excellent value at current ADP');
    } else if (valueScore < 30) {
      recommendations.push('Consider waiting or avoiding');
    }
    
    if (riskScore > 70) {
      recommendations.push('High risk - draft with caution');
    } else if (riskScore < 30) {
      recommendations.push('Low risk, safe floor');
    }
    
    if (player.injury) {
      recommendations.push(`Monitor injury status: ${player.injury}`);
    }
    
    return recommendations.join('. ');
  }

  private getRecommendedRounds(position: string, positionAnalyses: PositionAnalysis[]): string {
    const analysis = positionAnalyses.find(a => a.position === position);
    if (!analysis) return 'Late rounds';
    
    switch (analysis.scarcity) {
      case 'high':
        return analysis.position === 'QB' ? 'Rounds 4-6' : 'Rounds 1-3';
      case 'medium':
        return analysis.position === 'QB' ? 'Rounds 6-8' : 'Rounds 3-6';
      case 'low':
        return 'Rounds 8+';
      default:
        return 'Mid rounds';
    }
  }

  private analyzeTeamContext(player: Player): string {
    const team = player.team;
    if (!team) return 'Free agent';
    
    const highPowerTeams = ['KC', 'BUF', 'CIN', 'MIA', 'SF', 'PHI'];
    const riskyTeams = ['NYJ', 'CHI', 'CAR', 'NE', 'NYG'];
    
    if (highPowerTeams.includes(team)) {
      return 'High-powered offense - favorable scoring environment';
    } else if (riskyTeams.includes(team)) {
      return 'Questionable offense - limited scoring upside';
    }
    
    return 'Average offensive environment';
  }

  private assessInjuryRisk(player: Player): string {
    if (player.injury) {
      return `High - ${player.injury}`;
    }
    
    if (player.experience && player.experience > 8) {
      return 'Moderate - veteran player';
    }
    
    if (player.experience && player.experience < 2) {
      return 'Moderate - young player';
    }
    
    return 'Low - established player in prime';
  }

  private assessBreakoutPotential(player: Player): 'high' | 'medium' | 'low' {
    if (player.experience && player.experience < 3) {
      return 'high';
    }
    
    const highPowerTeams = ['KC', 'BUF', 'CIN', 'MIA', 'SF', 'PHI'];
    if (player.team && highPowerTeams.includes(player.team)) {
      return 'medium';
    }
    
    return 'low';
  }

  private generateOverallStrategy(
    positionAnalyses: PositionAnalysis[],
    valueTargets: PlayerAnalysis[],
    avoidPlayers: PlayerAnalysis[]
  ): string {
    const highScarcityPositions = positionAnalyses.filter(a => a.scarcity === 'high');
    const valueCount = valueTargets.length;
    const avoidCount = avoidPlayers.length;
    
    let strategy = 'Draft Strategy: ';
    
    if (highScarcityPositions.length > 0) {
      strategy += `Prioritize ${highScarcityPositions.map(p => p.position).join(', ')} early due to scarcity. `;
    }
    
    if (valueCount > 5) {
      strategy += `Focus on value picks in mid-late rounds (${valueCount} identified). `;
    }
    
    if (avoidCount > 0) {
      strategy += `Avoid ${avoidCount} high-risk players. `;
    }
    
    strategy += 'Balance upside and safety based on your draft position.';
    
    return strategy;
  }
}

export const playerAnalysisService = PlayerAnalysisService.getInstance(); 