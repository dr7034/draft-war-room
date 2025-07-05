import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Add this export to make the route fully dynamic
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Get data from request
    const data = await request.json();
    const { type, content, parameters, league_id, metadata } = data;
    
    // Check for required fields
    if (!type || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: type and content are required' },
        { status: 400 }
      );
    }
    
    // Check for Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials on server' },
        { status: 500 }
      );
    }
    
    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Insert analysis into database
    const { data: result, error } = await supabase
      .from('analyses')
      .insert({
        type,
        content,
        parameters,
        league_id,
        metadata,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error saving analysis:', error);
      return NextResponse.json(
        { error: `Failed to save analysis: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      id: result.id,
      message: 'Analysis saved successfully'
    });
  } catch (error) {
    console.error('Unexpected error saving analysis:', error);
    return NextResponse.json(
      { error: `Unexpected error: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 