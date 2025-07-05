import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { analyzeTeamLocally } from '@/lib/analysis-utils';

// Force dynamic rendering to allow header usage
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { players, league } = body;

    // Validate required data
    if (!players || !league) {
      console.error('Missing required data:', { hasPlayers: !!players, hasLeague: !!league });
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      );
    }

    // Try OpenAI first if API key is configured
    if (process.env.OPENAI_API_KEY) {
      try {
        // Initialize OpenAI
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });

        // Format the input data as a structured message
        const input = `
League Settings:
- Format: ${league.scoringFormat || 'Standard'}
- Roster: QB:${league.rosterSettings?.QB || 1}, RB:${league.rosterSettings?.RB || 2}, WR:${league.rosterSettings?.WR || 2}, TE:${league.rosterSettings?.TE || 1}, FLEX:${league.rosterSettings?.FLEX || 1}
${league.rosterSettings?.SFLEX ? `- Superflex: ${league.rosterSettings.SFLEX}` : ''}

Current Team:
${league.userTeam?.picks?.map((p: any) => `${p.name} (${p.position} - ${p.team})`).join('\n') || 'No players drafted yet'}

Available Players:
${players.slice(0, 20).map((p: any) => {
  try {
    return `${p.name || 'Unknown'} (${p.position || '?'} - ${p.team || '?'}) - ${p.projectedPoints || 0} pts`;
  } catch (e) {
    console.error('Error mapping player:', p, e);
    return '';
  }
}).filter(Boolean).join('\n')}`;

        // Call OpenAI with the chat completion API
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are a fantasy football expert providing draft recommendations. Analyze the draft situation and provide recommendations in JSON format with the following structure:
{
  "topPicks": [
    {
      "name": "Player Name",
      "position": "Position",
      "team": "Team",
      "priority": "High/Medium/Low",
      "reasoning": "Detailed reasoning"
    }
  ],
  "positionalAdvice": "Analysis of position needs",
  "strategyAdvice": "Draft strategy recommendations"
}`
            },
            {
              role: "user",
              content: input
            }
          ],
          temperature: 0.7,
          max_tokens: 1500,
          response_format: { type: "json_object" }
        });

        // Parse the response
        const response = completion.choices[0].message?.content;
        if (!response) {
          throw new Error('No response from OpenAI');
        }

        // Parse the JSON response
        let analysis = JSON.parse(response);
        
        // Validate the response structure
        if (!analysis.topPicks || !analysis.positionalAdvice || !analysis.strategyAdvice) {
          throw new Error('Invalid response format');
        }

        return NextResponse.json(analysis);
      } catch (error: any) {
        console.warn('OpenAI API failed, falling back to local analysis:', error.message);
        // Fall through to local analysis
      }
    }

    // Use local analysis as fallback
    const currentTeam = league.userTeam?.picks || [];
    const analysis = analyzeTeamLocally(currentTeam, players, league);
    
    return NextResponse.json(analysis);

  } catch (error: any) {
    console.error('Error in analyze route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate analysis' },
      { status: 500 }
    );
  }
} 