'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { importPlayersWithoutUser } from '@/lib/player-service';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DirectImportButton() {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleImport = async () => {
    try {
      setIsLoading(true);
      const result = await importPlayersWithoutUser();
      
      if (result.success) {
        toast.success(`Successfully imported ${result.count} players`);
      } else {
        toast.error(`Failed to import players: ${result.error}`);
      }
    } catch (error) {
      console.error('Error importing players:', error);
      toast.error('Failed to import players');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button 
      onClick={handleImport} 
      disabled={isLoading} 
      className="w-full"
      variant="secondary"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Importing...
        </>
      ) : (
        'Direct Import Players'
      )}
    </Button>
  );
} 