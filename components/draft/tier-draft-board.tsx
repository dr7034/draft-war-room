"use client"

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDraftContext } from '@/context/draft-context';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Star, TrendingUp, AlertTriangle, Crown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TierGroup {
  tier: number;
  players: any[];
  color: string;
  label: string;
}

export default function TierDraftBoard() {
  const { players, draftPlayer } = useDraftContext();
  const [search, setSearch] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'adp' | 'projectedPoints'>('adp');

  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(search.toLowerCase()) ||
                           player.team?.toLowerCase().includes(search.toLowerCase());
      const matchesPosition = selectedPosition === 'all' || player.position.toLowerCase() === selectedPosition;
      return matchesSearch && matchesPosition;
    });
  }, [players, search, selectedPosition]);

  const tierGroups = useMemo(() => {
    const groups: TierGroup[] = [
      { tier: 1, players: [], color: 'bg-red-50 border-red-200', label: 'Elite Tier' },
      { tier: 2, players: [], color: 'bg-orange-50 border-orange-200', label: 'High Tier' },
      { tier: 3, players: [], color: 'bg-yellow-50 border-yellow-200', label: 'Mid Tier' },
      { tier: 4, players: [], color: 'bg-blue-50 border-blue-200', label: 'Value Tier' },
      { tier: 5, players: [], color: 'bg-gray-50 border-gray-200', label: 'Depth Tier' },
    ];

    // Group players by tier
    filteredPlayers.forEach(player => {
      const tier = player.tier || 5;
      const group = groups.find(g => g.tier === tier);
      if (group) {
        group.players.push(player);
      }
    });

    // Sort players within each tier
    groups.forEach(group => {
      group.players.sort((a, b) => {
        if (sortBy === 'adp') {
          return (a.adp || 999) - (b.adp || 999);
        } else {
          return (b.projected_points || 0) - (a.projected_points || 0);
        }
      });
    });

    return groups.filter(group => group.players.length > 0);
  }, [filteredPlayers, sortBy]);

  const getTierIcon = (tier: number) => {
    switch (tier) {
      case 1: return <Crown className="w-4 h-4 text-red-600" />;
      case 2: return <Star className="w-4 h-4 text-orange-600" />;
      case 3: return <TrendingUp className="w-4 h-4 text-yellow-600" />;
      case 4: return <AlertTriangle className="w-4 h-4 text-blue-600" />;
      default: return null;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'QB': return 'bg-blue-100 text-blue-800';
      case 'RB': return 'bg-green-100 text-green-800';
      case 'WR': return 'bg-purple-100 text-purple-800';
      case 'TE': return 'bg-orange-100 text-orange-800';
      case 'K': return 'bg-gray-100 text-gray-800';
      case 'DEF': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Players</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or team..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="w-full sm:w-48">
              <Label htmlFor="position">Position</Label>
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger>
                  <SelectValue placeholder="All Positions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="qb">QB</SelectItem>
                  <SelectItem value="rb">RB</SelectItem>
                  <SelectItem value="wr">WR</SelectItem>
                  <SelectItem value="te">TE</SelectItem>
                  <SelectItem value="k">K</SelectItem>
                  <SelectItem value="def">DEF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full sm:w-48">
              <Label htmlFor="sort">Sort By</Label>
              <Select value={sortBy} onValueChange={(value: 'adp' | 'projectedPoints') => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adp">ADP</SelectItem>
                  <SelectItem value="projectedPoints">Projected Points</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tier Groups */}
      <div className="space-y-4">
        {tierGroups.map((group) => (
          <Card key={group.tier} className={`${group.color} border-2`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                {getTierIcon(group.tier)}
                <span>{group.label} (Tier {group.tier})</span>
                <Badge variant="outline" className="ml-auto">
                  {group.players.length} players
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {group.players.map((player) => (
                    <Card key={player.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-semibold text-sm truncate">{player.name}</div>
                            <div className="text-xs text-muted-foreground">{player.team || 'FA'}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge className={getPositionColor(player.position)}>
                              {player.position}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-1 mb-3">
                                                     <div className="flex justify-between text-xs">
                             <span>ADP:</span>
                             <span className="font-medium">{player.adp && player.adp !== 999 ? player.adp.toFixed(1) : 'N/A'}</span>
                           </div>
                          <div className="flex justify-between text-xs">
                            <span>Proj. Pts:</span>
                            <span className="font-medium">
                              {player.projected_points ? player.projected_points.toFixed(1) : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span>Bye:</span>
                            <span className="font-medium">{player.bye_week || 'N/A'}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <Badge className={getRiskColor(player.risk || 'medium')} variant="outline">
                            {player.risk || 'medium'}
                          </Badge>
                          {player.upside === 'high' && (
                            <TrendingUp className="w-3 h-3 text-green-600" />
                          )}
                        </div>
                        
                                                 {player.tags && player.tags.length > 0 && (
                           <div className="flex flex-wrap gap-1 mb-3">
                             {player.tags.slice(0, 2).map((tag: string, index: number) => (
                               <Badge key={index} variant="outline" className="text-xs">
                                 {tag}
                               </Badge>
                             ))}
                             {player.tags.length > 2 && (
                               <Badge variant="outline" className="text-xs">
                                 +{player.tags.length - 2}
                               </Badge>
                             )}
                           </div>
                         )}
                        
                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() => draftPlayer(player)}
                        >
                          Draft Player
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>

      {tierGroups.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No players found matching your criteria.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 