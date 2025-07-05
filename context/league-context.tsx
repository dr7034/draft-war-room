"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { League } from '@/types/league';

type LeagueContextType = {
  selectedLeague: League | null;
  setSelectedLeague: (league: League | null) => void;
  isLoading: boolean;
  clearLeague: () => void;
};

const defaultContext: LeagueContextType = {
  selectedLeague: null,
  setSelectedLeague: () => {},
  isLoading: true,
  clearLeague: () => {},
};

const LeagueContext = createContext<LeagueContextType>(defaultContext);

export const useLeagueContext = () => useContext(LeagueContext);

interface LeagueContextProviderProps {
  children: React.ReactNode;
}

export const LeagueContextProvider = ({ children }: LeagueContextProviderProps) => {
  const [selectedLeague, setSelectedLeagueState] = useState<League | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load league from localStorage on mount
  useEffect(() => {
    try {
      const savedLeague = localStorage.getItem('selectedLeague');
      if (savedLeague) {
        const parsedLeague = JSON.parse(savedLeague);
        setSelectedLeagueState(parsedLeague);
      }
    } catch (error) {
      console.error('Error loading league from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save league to localStorage whenever it changes
  const setSelectedLeague = (league: League | null) => {
    setSelectedLeagueState(league);
    if (league) {
      localStorage.setItem('selectedLeague', JSON.stringify(league));
    } else {
      localStorage.removeItem('selectedLeague');
    }
  };

  // Clear league and localStorage
  const clearLeague = () => {
    setSelectedLeagueState(null);
    localStorage.removeItem('selectedLeague');
  };

  return (
    <LeagueContext.Provider
      value={{
        selectedLeague,
        setSelectedLeague,
        isLoading,
        clearLeague,
      }}
    >
      {children}
    </LeagueContext.Provider>
  );
}; 