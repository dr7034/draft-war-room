"use client"

import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';

interface PositionAnalysisProps {
  analysis: string;
  isLoading: boolean;
  onRefresh: () => void;
}

// Helper to map a Sleeper transaction pick to a DraftPick
const mapTransactionPickToDraftPick = (pick: any, slotToRosterId: Record<number, number>, tradedPicks: any[]) => {
  const { round, pick: slot } = pick;
  const originalOwnerRosterId = slotToRosterId[slot];
  let currentOwnerRosterId = originalOwnerRosterId;
  const tradesForPick = tradedPicks
    .filter(tp => tp.round === round && tp.pick === slot)
    .sort((a, b) => (a.created && b.created ? a.created - b.created : 0));
  for (const trade of tradesForPick) {
    currentOwnerRosterId = trade.owner_id;
  }
  return {
    round,
    slot,
    previousOwnerRosterId: originalOwnerRosterId,
    currentOwnerRosterId,
  };
};

export default function PositionAnalysis({ analysis, isLoading, onRefresh }: PositionAnalysisProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Analysis
          </Button>
        </div>
        <ScrollArea className="h-[400px]">
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}