"use client"

import { Player } from '@/types/player';
import { Badge } from "@/components/ui/badge";
import { 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  Star, 
  AlertCircle,
  Zap,
  Shield 
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from '@/components/ui/card';
import * as NFLIcons from 'react-nfl-logos';

export interface PlayerCardProps {
  player: Player;
  showDetails?: boolean;
  onClick?: (player: Player) => void;
}

export default function PlayerCard({ player, showDetails = false, onClick }: PlayerCardProps) {
  const getTrendIcon = () => {
    switch (player.trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };
  
  const getPositionColor = () => {
    switch (player.position) {
      case 'QB':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'RB':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'WR':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'TE':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'K':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'DEF':
        return 'text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'text-gray-800 dark:text-gray-400';
    }
  };

  const getRiskColor = () => {
    switch (player.risk) {
      case 'low':
        return 'text-green-500';
      case 'medium':
        return 'text-yellow-500';
      case 'high':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getUpsideColor = () => {
    switch (player.upside) {
      case 'low':
        return 'text-gray-400';
      case 'medium':
        return 'text-blue-500';
      case 'high':
        return 'text-purple-500';
      default:
        return 'text-gray-400';
    }
  };
  
  const handleClick = () => {
    if (onClick) {
      onClick(player);
    }
  };

  // Glassmorphism/gradient style
  const cardBg = 'bg-gradient-to-br from-white/60 via-slate-100/60 to-blue-100/40 dark:from-slate-900/60 dark:via-slate-800/60 dark:to-blue-900/40 backdrop-blur shadow-xl border border-white/30 dark:border-slate-800/60';

  // Try to get the NFL logo component
  const TeamLogo = NFLIcons[player.team as keyof typeof NFLIcons];

  return (
    <Card 
      className={`relative overflow-hidden transition-transform duration-200 ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-2xl' : ''} ${cardBg}`}
      onClick={handleClick}
      style={{ borderRadius: 18 }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'linear-gradient(135deg, rgba(0,184,255,0.08) 0%, rgba(255,255,255,0.10) 100%)',
        zIndex: 0
      }} />
      <CardContent className="p-4 relative z-10">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/70 dark:bg-slate-900/70 shadow-md flex items-center justify-center" style={{ width: 48, height: 48 }}>
              {TeamLogo ? <TeamLogo size={40} /> : <Zap className="h-8 w-8 text-muted-foreground" />}
            </div>
          <div>
              <h3 className="font-semibold text-lg leading-tight">{player.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getPositionColor()}`}>{player.position}</span>
                {player.tags && player.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs px-2 py-0.5 animate-fade-in">{tag}</Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{player.team}</p>
            </div>
          </div>
          <Badge variant={player.status === 'Active' ? 'default' : 'destructive'} className="shadow animate-pop">
            {player.status || 'Unknown'}
          </Badge>
        </div>

        {showDetails && (
          <div className="mt-3 space-y-1 animate-fade-in">
            <div className="flex justify-between text-sm">
              <span>Projected:</span>
              <span className="font-semibold">{player.projected_points ? player.projected_points.toFixed(1) : 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>ADP:</span>
              <span className="font-semibold">{player.adp?.toFixed(1) || 'N/A'}</span>
            </div>
            {player.injury && (
              <div className="text-sm text-destructive flex items-center gap-1 animate-bounce">
                <AlertCircle className="h-4 w-4" />Injury: {player.injury}
              </div>
            )}
            {player.metadata?.projection_source && (
              <div className="text-xs text-muted-foreground mt-2">
                Source: {player.metadata.projection_source}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}