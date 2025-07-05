import React from 'react';
import PlayerDatabaseUpdater from '@/components/player-database-updater';
import SupabaseDebug from '@/components/supabase-debug';
import DirectImportButton from '@/components/direct-import-button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function PlayerManagerPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Player Database Management</h1>
      
      <div className="grid gap-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Update Player Database</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Standard Import</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Import players from Sleeper using the standard method.
                </p>
              </CardContent>
              <CardFooter>
                <PlayerDatabaseUpdater />
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Direct Import</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Import players directly from the Sleeper API without requiring a user account.
                </p>
              </CardContent>
              <CardFooter>
                <DirectImportButton />
              </CardFooter>
            </Card>
          </div>
        </section>
        
        <section>
          <h2 className="text-xl font-semibold mb-4">Connection Debugging</h2>
          <SupabaseDebug />
        </section>
        
        <section className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>
          <div className="bg-muted p-4 rounded-md">
            <h3 className="font-medium mb-2">If players aren&apos;t being stored:</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li>Make sure the Supabase URL and anon key are correctly set in your <code className="bg-background px-1.5 py-0.5 rounded text-sm">.env.local</code> file</li>
              <li>Run the database migration: <code className="bg-background px-1.5 py-0.5 rounded text-sm">npm run db:migrate</code></li>
              <li>Check the browser console for any error messages during import</li>
              <li>Verify the player table exists in your Supabase dashboard</li>
              <li>Make sure Row Level Security (RLS) policies allow writing to the table</li>
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
} 