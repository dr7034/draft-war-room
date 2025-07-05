import { createClient } from 'npm:@supabase/supabase-js@2.39.8';
import { Configuration, OpenAIApi } from 'npm:openai@4.28.0';

// Define types for better TypeScript support
type Player = {
  name: string;
  position: string;
  team?: string;
  projectedPoints?: number;
  stats?: Record<string, number>;
  risk?: string;
  upside?: string;
};

type League = {
  scoringFormat?: string;
  rosterSettings?: {
    QB: number;
    RB: number;
    WR: number;
    TE: number;
    FLEX: number;
  };
};

// Updated CORS headers with explicit methods and headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

// Serve the function
Deno.serve(async (req: Request) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    console.log("Request received");
    
    // Parse the request body with error handling
    let players: Player[] = [];
    let league: League = {};
    
    try {
      const body = await req.json();
      players = Array.isArray(body.players) ? body.players : [];
      league = typeof body.league === 'object' ? body.league : {};
      console.log(`Received ${players.length} players and league data`);
    } catch (e) {
      console.error("Error parsing request:", e);
      throw new Error('Invalid JSON in request body');
    }

    // Skip analysis if there are no players with positive projections
    if (!players.length) {
      console.error("No players provided");
      throw new Error('Invalid request data: players are required');
    }

    // Get OpenAI API key from request header
    const openaiKey = req.headers.get('x-openai-key');
    if (!openaiKey) {
      console.error("No OpenAI API key provided");
      throw new Error('OpenAI API key not provided');
    }

    console.log("Initializing OpenAI");
    
    // Initialize OpenAI
    const openai = new OpenAIApi(new Configuration({
      apiKey: openaiKey,
    }));

    // Generate analysis for each position
    const positions = ['QB', 'RB', 'WR', 'TE'];
    const analyses = await Promise.all(positions.map(async (position) => {
      console.log(`Analyzing ${position} players`);
      const positionPlayers = players.filter(p => p.position === position);
      
      if (positionPlayers.length === 0) {
        return {
          position,
          analysis: `# ${position} Analysis\n\nNo ${position} players to analyze.`,
        };
      }
      
      // Sort by projected points and limit to top 10 to reduce token usage
      const topPlayers = positionPlayers
        .sort((a, b) => (b.projectedPoints || 0) - (a.projectedPoints || 0))
        .slice(0, 10);
      
      // Create a more concise prompt
      const prompt = `
        Analyze these top ${position} players for fantasy football in ${league.scoringFormat || 'standard'} scoring:
        ${topPlayers.map((p, i) => `
          ${i+1}. ${p.name || 'Unknown'} (${p.team || 'Unknown'}): ${p.projectedPoints || 0} pts, Risk: ${p.risk || 'medium'}, Upside: ${p.upside || 'medium'}
        `).join('')}

        Provide a concise analysis covering:
        1. Top 3-5 players worth drafting
        2. Sleeper/breakout candidates
        3. Players to avoid
        4. Draft strategy tips for this position
        
        Format your response in markdown with clear sections.
      `;

      try {
        const completion = await openai.createChatCompletion({
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000, // Limit response size
        });
        
        return {
          position,
          analysis: completion.choices[0].message.content,
        };
      } catch (error: any) {
        console.error(`Error analyzing ${position}:`, error);
        return {
          position,
          analysis: `# ${position} Analysis\n\nUnable to generate analysis: ${error.message}`,
        };
      }
    }));

    // Generate overall draft strategy
    console.log("Generating draft strategy");
    
    const rosterSettings = league.rosterSettings || {
      QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1
    };
    
    const strategyPrompt = `
      Create a concise fantasy football draft strategy based on these settings:
      - Format: ${league.scoringFormat || 'standard'} scoring
      - Roster: QB:${rosterSettings.QB || 1}, RB:${rosterSettings.RB || 2}, WR:${rosterSettings.WR || 2}, TE:${rosterSettings.TE || 1}, FLEX:${rosterSettings.FLEX || 1}
      
      Focus on:
      1. First 3 rounds approach
      2. Position prioritization
      3. Key strategy tips
      
      Keep it brief and actionable with markdown formatting.
    `;

    let draftStrategy = "";
    try {
      const strategyCompletion = await openai.createChatCompletion({
        model: "gpt-4",
        messages: [{ role: "user", content: strategyPrompt }],
        max_tokens: 800, // Limit the response size
      });
      draftStrategy = strategyCompletion.choices[0].message.content;
    } catch (error: any) {
      console.error("Error generating draft strategy:", error);
      draftStrategy = "# Draft Strategy\n\nUnable to generate strategy: " + error.message;
    }

    console.log("Analysis complete, returning response");
    
    return new Response(
      JSON.stringify({
        positionAnalyses: analyses,
        draftStrategy: draftStrategy,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error: any) {
    console.error('Edge function error:', error);

    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      {
        status: error.message === 'Method not allowed' ? 405 : 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});