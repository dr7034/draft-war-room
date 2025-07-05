'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase-client';

export default function SupabaseDebug() {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const testConnection = async () => {
    try {
      setIsLoading(true);
      setConnectionStatus('idle');
      
      console.log('Testing Supabase connection...');
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('Supabase key available:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      
      const { data, error } = await supabase.from('players').select('count');
      
      if (error) {
        console.error('Supabase connection error:', error);
        setConnectionStatus('error');
        setResult(error);
      } else {
        console.log('Supabase connection successful:', data);
        setConnectionStatus('success');
        setResult(data);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setConnectionStatus('error');
      setResult(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const checkOpenAI = async () => {
    try {
      setIsLoading(true);
      
      const hasKey = !!process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      console.log('OpenAI API key available:', hasKey);
      
      setResult({ openai: { keyAvailable: hasKey } });
    } catch (error) {
      console.error('Error checking OpenAI:', error);
      setResult({ openai: { error } });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Supabase Debug Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectionStatus === 'success' && (
          <Alert className="bg-green-50 border-green-500 text-green-700">
            <AlertTitle>Connection Successful</AlertTitle>
            <AlertDescription>
              Successfully connected to Supabase.
            </AlertDescription>
          </Alert>
        )}
        
        {connectionStatus === 'error' && (
          <Alert className="bg-red-50 border-red-500 text-red-700">
            <AlertTitle>Connection Failed</AlertTitle>
            <AlertDescription>
              Failed to connect to Supabase. Check the console for details.
            </AlertDescription>
          </Alert>
        )}
        
        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded-md overflow-auto">
            <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button 
          onClick={testConnection} 
          className="w-full" 
          disabled={isLoading}
        >
          {isLoading ? 'Testing...' : 'Test Supabase Connection'}
        </Button>
        <Button 
          onClick={checkOpenAI} 
          className="w-full" 
          variant="outline" 
          disabled={isLoading}
        >
          Check OpenAI API Key
        </Button>
      </CardFooter>
    </Card>
  );
} 