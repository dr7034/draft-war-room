"use client"

import { useState, useEffect } from 'react';
import { ModeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Bell, Menu, X, LogOut, Settings } from 'lucide-react';
import { useDraftContext } from '@/context/draft-context';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Link from 'next/link';
import { useLeagueContext } from "@/context/league-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { currentPick } = useDraftContext();
  const { selectedLeague, clearLeague } = useLeagueContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] sm:w-[300px]">
              <nav className="flex flex-col gap-4 mt-8">
                <Link href="#" className="text-lg font-semibold">
                  Draft Board
                </Link>
                <Link href="#" className="text-lg font-semibold">
                  Player Rankings
                </Link>
                <Link href="#" className="text-lg font-semibold">
                  Your Team
                </Link>
                <Link href="#" className="text-lg font-semibold">
                  Analytics
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xl">Fantasy War Room</span>
          </div>
        </div>
        
        <div className="hidden md:flex items-center space-x-4">
          <span className="text-sm font-medium">Pick #{currentPick}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
          </Button>
          <ModeToggle />
          
          {selectedLeague && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={clearLeague}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Switch League
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}