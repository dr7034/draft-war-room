export interface PickAttributionMappings {
  userIdToRosterId: Record<string, number>;
  slotToUserId: Record<number, string>;
  slotToRosterId: Record<number, number>;
}

export interface PickOwnership {
  originalPicksBySlot: Record<string, number>;
  finalPickOwners: Record<string, number>;
}

export interface PickInfo {
  round: number;
  pick: number;
  fromTeam: string;
  toTeam: string;
  isTraded: boolean;
}

export class PickAttributionService {
  /**
   * Build robust pick attribution mappings from draft data and teams
   */
  static buildPickMappings(
    teams: any[],
    draftOrder: Record<string, any>
  ): PickAttributionMappings {
    // Build userIdToRosterId from teams
    const userIdToRosterId: Record<string, number> = {};
    teams.forEach(team => {
      if (team.user_id && team.roster_id !== undefined) {
        userIdToRosterId[team.user_id] = team.roster_id;
      }
    });

    // Build slotToUserId from draft order
    const slotToUserId: Record<number, string> = {};
    if (draftOrder) {
      Object.entries(draftOrder).forEach(([userId, slot]) => {
        slotToUserId[parseInt(slot as string)] = userId;
      });
    }

    // Build slotToRosterId using slotToUserId and userIdToRosterId
    const slotToRosterId: Record<number, number> = {};
    Object.entries(slotToUserId).forEach(([slot, userId]) => {
      const rosterId = userIdToRosterId[userId];
      if (rosterId !== undefined) {
        slotToRosterId[parseInt(slot)] = rosterId;
      }
    });

    return { userIdToRosterId, slotToUserId, slotToRosterId };
  }

  /**
   * Calculate original picks attribution
   */
  static calculateOriginalPicks(
    mappings: PickAttributionMappings,
    totalRounds: number,
    totalRosters: number
  ): Record<string, number> {
    const originalPicksBySlot: Record<string, number> = {};
    
    if (!mappings.slotToRosterId) return originalPicksBySlot;

    for (let round = 1; round <= totalRounds; round++) {
      for (let pick = 1; pick <= totalRosters; pick++) {
        const slot = pick;
        const rosterId = mappings.slotToRosterId[slot];
        if (rosterId !== undefined) {
          const pickKey = `${round}-${pick}`;
          originalPicksBySlot[pickKey] = rosterId;
        }
      }
    }

    return originalPicksBySlot;
  }

  /**
   * Apply trades to determine final ownership with proper chain tracking
   */
  static calculateFinalPickOwners(
    originalPicksBySlot: Record<string, number>,
    tradedPicks: any[]
  ): Record<string, number> {
    const finalPickOwners = { ...originalPicksBySlot };

    // Sort trades by creation time to apply them in chronological order
    const sortedTrades = [...tradedPicks].sort((a, b) => {
      const timeA = a.created || 0;
      const timeB = b.created || 0;
      return timeA - timeB;
    });

    // Apply all trades in chronological order
    sortedTrades.forEach((trade: any) => {
      // Handle both old and new trade formats
      const pickKey = `${trade.round}-${trade.pick || trade.roster_id}`;
      let newOwnerId: number | undefined;
      
      if (trade.new_owner_roster_id !== undefined) {
        // Old format
        newOwnerId = trade.new_owner_roster_id;
      } else if (trade.owner_id !== undefined) {
        // New format - owner_id is the current owner after the trade
        newOwnerId = trade.owner_id;
      }
      
      if (newOwnerId !== undefined) {
        finalPickOwners[pickKey] = newOwnerId;
      }
    });

    return finalPickOwners;
  }

  /**
   * Get the complete trade chain for a specific pick
   */
  static getPickTradeChain(
    round: number,
    pickNumber: number,
    tradedPicks: any[],
    originalOwner: number
  ): { chain: any[], finalOwner: number } {
    const chain: any[] = [];
    let currentOwner = originalOwner;

    // Find all trades for this specific pick
    const tradesForPick = tradedPicks
      .filter(trade => {
        const tradePickNumber = trade.pick || trade.roster_id;
        return trade.round === round && tradePickNumber === pickNumber;
      })
      .sort((a, b) => {
        const timeA = a.created || 0;
        const timeB = b.created || 0;
        return timeA - timeB;
      });

    // Build the chain of ownership changes
    tradesForPick.forEach(trade => {
      const fromOwner = currentOwner;
      const toOwner = trade.owner_id || trade.new_owner_roster_id;
      
      if (toOwner !== undefined) {
        chain.push({
          from: fromOwner,
          to: toOwner,
          trade: trade,
          timestamp: trade.created
        });
        currentOwner = toOwner;
      }
    });

    return { chain, finalOwner: currentOwner };
  }

  /**
   * Get complete pick ownership information
   */
  static getPickOwnership(
    teams: any[],
    draftOrder: Record<string, any>,
    totalRounds: number,
    totalRosters: number,
    tradedPicks: any[]
  ): PickOwnership {
    const mappings = this.buildPickMappings(teams, draftOrder);
    const originalPicksBySlot = this.calculateOriginalPicks(mappings, totalRounds, totalRosters);
    const finalPickOwners = this.calculateFinalPickOwners(originalPicksBySlot, tradedPicks);

    return { originalPicksBySlot, finalPickOwners };
  }

  /**
   * Get team name by roster ID
   */
  static getTeamNameByRosterId(rosterId: number, teams: any[]): string {
    const team = teams.find(t => t.roster_id === rosterId);
    return team?.display_name || team?.username || `Team ${rosterId}`;
  }

  /**
   * Format pick information for display
   */
  static formatPickInfo(
    pick: any,
    originalPicksBySlot: Record<string, number>,
    finalPickOwners: Record<string, number>,
    teams: any[]
  ): PickInfo {
    const pickKey = `${pick.round}-${pick.pick || pick.roster_id}`;
    const originalOwner = originalPicksBySlot[pickKey];
    const finalOwner = finalPickOwners[pickKey];
    
    // Handle both old and new trade formats
    const currentOwnerId = pick.owner_id || pick.new_owner_roster_id;
    
    return {
      round: pick.round,
      pick: pick.pick || pick.roster_id,
      fromTeam: originalOwner ? this.getTeamNameByRosterId(originalOwner, teams) : 'Unknown',
      toTeam: currentOwnerId ? this.getTeamNameByRosterId(currentOwnerId, teams) : 'Unknown',
      isTraded: originalOwner !== currentOwnerId
    };
  }

  /**
   * Get all picks for a specific team with proper trade chain handling
   */
  static getTeamPicks(
    teamId: number,
    teams: any[],
    draftOrder: Record<string, any>,
    totalRounds: number,
    totalRosters: number,
    tradedPicks: any[]
  ): { owned: any[], sent: any[] } {
    const { originalPicksBySlot, finalPickOwners } = this.getPickOwnership(
      teams, draftOrder, totalRounds, totalRosters, tradedPicks
    );

    const owned: any[] = [];
    const sent: any[] = [];

    for (let round = 1; round <= totalRounds; round++) {
      for (let pick = 1; pick <= totalRosters; pick++) {
        const pickKey = `${round}-${pick}`;
        const originalOwner = originalPicksBySlot[pickKey];
        const finalOwner = finalPickOwners[pickKey];

        if (finalOwner === teamId) {
          // Get the trade chain to show the full history
          const { chain } = this.getPickTradeChain(round, pick, tradedPicks, originalOwner);
          
          owned.push({
            round,
            slot: pick,
            previousOwnerRosterId: originalOwner,
            currentOwnerRosterId: finalOwner,
            tradeChain: chain
          });
        } else if (originalOwner === teamId && finalOwner !== teamId) {
          // This team originally owned the pick but no longer does
          const { chain } = this.getPickTradeChain(round, pick, tradedPicks, originalOwner);
          
          sent.push({
            round,
            slot: pick,
            previousOwnerRosterId: originalOwner,
            currentOwnerRosterId: finalOwner,
            tradeChain: chain
          });
        }
      }
    }

    return { owned, sent };
  }
} 