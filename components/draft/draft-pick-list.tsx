"use client"

import { useDraftContext } from '@/context/draft-context';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Undo } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DraftPickList() {
  const { draftedPlayers, undoDraft } = useDraftContext();
  
  // Group picks by round
  const picks = draftedPlayers.sort((a, b) => 
    (a.draftPosition || 0) - (b.draftPosition || 0)
  );
  
  const getRoundNumber = (pickNumber: number = 0) => Math.ceil(pickNumber / 10);
  
  const groupedPicks: Record<number, typeof picks> = {};
  
  picks.forEach(pick => {
    const round = getRoundNumber(pick.draftPosition);
    if (!groupedPicks[round]) {
      groupedPicks[round] = [];
    }
    groupedPicks[round].push(pick);
  });
  
  return (
    <ScrollArea className="h-[520px]">
      <div className="space-y-6">
        {Object.keys(groupedPicks).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No players drafted yet.
          </div>
        ) : (
          Object.entries(groupedPicks).map(([round, picks]) => (
            <div key={round} className="space-y-2">
              <h3 className="font-medium">Round {round}</h3>
              <div className="space-y-2">
                {picks.map((player) => (
                  <div 
                    key={player.id} 
                    className="flex items-center justify-between p-2 rounded-md bg-muted/40 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-[40px] justify-center">
                        {player.draftPosition}
                      </Badge>
                      <div>
                        <p className="font-medium">{player.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {player.position} - {player.team}
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => undoDraft(player)}
                      className="h-8 w-8"
                    >
                      <Undo className="h-4 w-4" />
                      <span className="sr-only">Undo</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}