"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Users, Trophy, Target, X } from "lucide-react";

interface PreDraftMessageProps {
  leagueName: string;
  totalRosters: number;
  season: string;
  onDismiss: () => void;
}

export default function PreDraftMessage({ leagueName, totalRosters, season, onDismiss }: PreDraftMessageProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Message */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 border-blue-200 dark:border-blue-800 relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="absolute top-2 right-2 h-8 w-8 p-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        >
          <X className="h-4 w-4" />
        </Button>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Clock className="h-5 w-5" />
            Draft Not Started Yet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-blue-800 dark:text-blue-200">
            Your draft for <strong>{leagueName}</strong> ({season}) hasn&apos;t started yet. 
            This is your pre-draft war room where you can prepare your strategy.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-blue-600" />
              <span>{totalRosters} Teams</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4 text-blue-600" />
              <span>Season {season}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-blue-600" />
              <span>Draft Prep Mode</span>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Tips */}
      <Card className="bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-950 dark:to-yellow-900 border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-amber-900 dark:text-amber-100">💡 Pre-Draft Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-amber-800 dark:text-amber-200">
          <div className="flex gap-3">
            <span className="font-semibold">1.</span>
            <span>Use the Cheat Sheet tab to get AI-powered draft advice</span>
          </div>
          <div className="flex gap-3">
            <span className="font-semibold">2.</span>
            <span>Browse the Draft Board tab to research players and ADP</span>
          </div>
          <div className="flex gap-3">
            <span className="font-semibold">3.</span>
            <span>Check League Rosters to see your team and league settings</span>
          </div>
          <div className="flex gap-3">
            <span className="font-semibold">4.</span>
            <span>Explore Analytics for insights on scoring and trends</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 