"use client"

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDraftContext } from '@/context/draft-context';
import { Position } from '@/types/player';
import { calculatePositionScarcity, calculateValueOverReplacement } from '@/lib/draft-utils';
import {
  Chart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  LineChart
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DownloadIcon, FileText } from "lucide-react";

export default function AnalyticsPanel() {
  const { players, draftedPlayers } = useDraftContext();
  const [selectedScarcityPosition, setSelectedScarcityPosition] = useState<Position>('RB');
  
  // Calculate position scarcity
  const scarcityData = calculatePositionScarcity(players, selectedScarcityPosition);
  
  // Calculate value over replacement (VOR)
  const vorData = ['QB', 'RB', 'WR', 'TE'].map(pos => {
    const position = pos as Position;
    const topPlayers = players
      .filter(p => p.position === position)
      .sort((a, b) => b.projectedPoints - a.projectedPoints)
      .slice(0, 10);
    
    return {
      position,
      players: topPlayers.map(p => ({
        name: p.name,
        vor: calculateValueOverReplacement(p, players),
      })),
    };
  });
  
  // Generate draft trend data
  const positionCounts = {
    'QB': 0,
    'RB': 0,
    'WR': 0,
    'TE': 0,
    'K': 0,
    'DEF': 0,
  };
  
  const draftTrendData = draftedPlayers
    .sort((a, b) => (a.draftPosition || 0) - (b.draftPosition || 0))
    .reduce((acc: any[], player) => {
      positionCounts[player.position]++;
      return [
        ...acc,
        {
          pick: player.draftPosition,
          position: player.position,
          name: player.name,
          QB: positionCounts['QB'],
          RB: positionCounts['RB'],
          WR: positionCounts['WR'],
          TE: positionCounts['TE'],
          K: positionCounts['K'],
          DEF: positionCounts['DEF'],
        },
      ];
    }, []);
  
  const COLORS = {
    'QB': 'hsl(var(--chart-1))',
    'RB': 'hsl(var(--chart-2))',
    'WR': 'hsl(var(--chart-3))',
    'TE': 'hsl(var(--chart-4))',
    'K': 'hsl(var(--chart-5))',
    'DEF': 'hsl(var(--primary))',
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Position Scarcity Analysis</CardTitle>
          <CardDescription>
            See how player value drops off by position to identify scarcity
          </CardDescription>
          <TabsList className="mt-2">
            <TabsTrigger 
              value="RB"
              onClick={() => setSelectedScarcityPosition('RB')}
              className={selectedScarcityPosition === 'RB' ? 'bg-primary text-primary-foreground' : ''}
            >
              RB
            </TabsTrigger>
            <TabsTrigger 
              value="WR"
              onClick={() => setSelectedScarcityPosition('WR')}
              className={selectedScarcityPosition === 'WR' ? 'bg-primary text-primary-foreground' : ''}
            >
              WR
            </TabsTrigger>
            <TabsTrigger 
              value="QB"
              onClick={() => setSelectedScarcityPosition('QB')}
              className={selectedScarcityPosition === 'QB' ? 'bg-primary text-primary-foreground' : ''}
            >
              QB
            </TabsTrigger>
            <TabsTrigger 
              value="TE"
              onClick={() => setSelectedScarcityPosition('TE')}
              className={selectedScarcityPosition === 'TE' ? 'bg-primary text-primary-foreground' : ''}
            >
              TE
            </TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={scarcityData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rank" label={{ value: 'Player Rank', position: 'insideBottomRight', offset: -5 }} />
                <YAxis label={{ value: 'Projected Points', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={COLORS[selectedScarcityPosition]} 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Value Over Replacement (VOR)</CardTitle>
          <CardDescription>
            See which players offer the most value compared to replacement-level players at their position
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="RB">
            <TabsList className="mb-4">
              <TabsTrigger value="QB">QB</TabsTrigger>
              <TabsTrigger value="RB">RB</TabsTrigger>
              <TabsTrigger value="WR">WR</TabsTrigger>
              <TabsTrigger value="TE">TE</TabsTrigger>
            </TabsList>
            
            {vorData.map(({ position, players }) => (
              <TabsContent key={position} value={position}>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={players}
                      margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        height={70}
                      />
                      <YAxis label={{ value: 'VOR Points', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Bar dataKey="vor" fill={COLORS[position]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Draft Trend Analysis</CardTitle>
            <CardDescription>
              Track how positions are being drafted throughout the rounds
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={draftTrendData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="pick" label={{ value: 'Pick Number', position: 'insideBottomRight', offset: -5 }} />
                <YAxis label={{ value: 'Players Drafted', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="QB" stroke={COLORS['QB']} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="RB" stroke={COLORS['RB']} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="WR" stroke={COLORS['WR']} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="TE" stroke={COLORS['TE']} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}