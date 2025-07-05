'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function PlayerDatabaseUpdater() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [playerCount, setPlayerCount] = useState<number | null>(null);

  const updatePlayerDatabase = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/players/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setLastUpdated(new Date());
        setPlayerCount(data.count);
        toast.success(data.message || 'Player database updated successfully');
      } else {
        throw new Error(data.message || 'Failed to update player database');
      }
    } catch (error) {
      console.error('Error updating player database:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update player database');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Player Database
          {playerCount && <Badge variant="outline">{playerCount} Players</Badge>}
        </CardTitle>
        <CardDescription>
          Import and update the latest NFL player data from Sleeper.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">
          This will fetch active NFL players and update your local database. This process may take a few moments.
        </p>
        
        {lastUpdated && (
          <p className="text-xs text-muted-foreground">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        )}
        
        {/* Debug info */}
        <div className="mt-4 p-2 border border-dashed rounded text-xs">
          <p className="font-medium">Debug Info:</p>
          <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Defined' : '❌ Missing'}</p>
          <p>Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Defined' : '❌ Missing'}</p>
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col gap-2">
        <Button 
          onClick={updatePlayerDatabase} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating Players...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Update Player Database
            </>
          )}
        </Button>
        
        {/* Debug Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          onClick={() => {
            console.log('Debugging Supabase connection:');
            console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
            console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY defined:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
          }}
        >
          Debug Connection
        </Button>
      </CardFooter>
    </Card>
  );
} 