import { NextRequest, NextResponse } from 'next/server';
import { adpService } from '@/lib/adp-service';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('Refreshing ADP data...');
    
    // Get fresh ADP data
    const adpData = await adpService.getADPData();
    
    if (adpData.length === 0) {
      return NextResponse.json(
        { error: 'No ADP data available' },
        { status: 500 }
      );
    }

    // Update players in database with new ADP data
    const updates = adpData.map(adp => ({
      sleeper_id: adp.playerId,
      adp: adp.adp,
      updated_at: new Date().toISOString()
    }));

    // Batch update players with new ADP values
    const { error: updateError } = await supabase
      .from('players')
      .upsert(updates, {
        onConflict: 'sleeper_id',
        ignoreDuplicates: false
      });

    if (updateError) {
      console.error('Error updating ADP data:', updateError);
      return NextResponse.json(
        { error: 'Failed to update ADP data in database' },
        { status: 500 }
      );
    }

    console.log(`Successfully updated ADP data for ${adpData.length} players`);
    
    return NextResponse.json({
      success: true,
      message: `Updated ADP data for ${adpData.length} players`,
      count: adpData.length,
      sources: Array.from(new Set(adpData.map(adp => adp.source)))
    });

  } catch (error) {
    console.error('Error refreshing ADP data:', error);
    return NextResponse.json(
      { error: 'Failed to refresh ADP data' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get current ADP data from cache
    const adpData = await adpService.getADPData();
    
    return NextResponse.json({
      success: true,
      count: adpData.length,
      sources: Array.from(new Set(adpData.map(adp => adp.source))),
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting ADP data:', error);
    return NextResponse.json(
      { error: 'Failed to get ADP data' },
      { status: 500 }
    );
  }
} 