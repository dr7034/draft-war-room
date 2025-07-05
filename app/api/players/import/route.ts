import { NextRequest, NextResponse } from 'next/server';
import { importPlayersFromSleeper } from '@/lib/player-service';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    // Check for admin access or add some form of authentication here
    
    // Try direct connection to Supabase for debugging
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('Debug: Supabase URL defined:', !!supabaseUrl);
    console.log('Debug: Supabase key defined:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        message: 'Supabase credentials are missing'
      }, { status: 500 });
    }
    
    const result = await importPlayersFromSleeper();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully imported ${result.count} players from Sleeper`,
        count: result.count
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.error || 'Failed to import players'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error handling player import:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error'
    }, { status: 500 });
  }
} 