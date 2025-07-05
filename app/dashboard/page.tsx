'use client';

import { useEffect, useState } from "react";
import { DatabaseIcon, UsersIcon, ClockIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataRefreshButton } from "@/components/data-refresh-button";
import { useDataStore } from "@/lib/use-data-store";
import { format } from "date-fns";

export default function DashboardPage() {
  const { players, lastUpdated } = useDataStore();
  const [formattedTime, setFormattedTime] = useState<string>("Never");
  
  useEffect(() => {
    if (lastUpdated?.players) {
      setFormattedTime(format(new Date(lastUpdated.players), "PPpp"));
    }
  }, [lastUpdated]);
  
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <DataRefreshButton />
      </div>
      
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Players</CardTitle>
            <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{players.length}</div>
            <p className="text-xs text-muted-foreground">
              Available for drafting
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{formattedTime}</div>
            <p className="text-xs text-muted-foreground">
              Player data refresh
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className={`h-3 w-3 rounded-full mr-2 ${players.length > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div className="text-sm font-medium">
                {players.length > 0 ? 'Data Available' : 'No Data'}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for analysis
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 