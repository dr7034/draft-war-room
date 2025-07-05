import { NextRequest, NextResponse } from 'next/server';
import { importPlayersWithoutUser } from '@/lib/player-service';

// Force dynamic rendering to allow header usage
export const dynamic = 'force-dynamic';

// Secret token for securing the endpoint
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  try {
    // Verify secret token to secure the endpoint
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!CRON_SECRET || token !== CRON_SECRET) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    console.log('Running daily player refresh...');
    const result = await importPlayersWithoutUser();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Daily refresh: Imported ${result.count} players`,
        count: result.count,
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error(result.error || 'Unknown error during player refresh');
    }
  } catch (error: any) {
    console.error('Error during daily player refresh:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 