import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'ppr';
  const teams = searchParams.get('teams') || '12';
  const year = searchParams.get('year') || new Date().getFullYear().toString();
  const url = `https://fantasyfootballcalculator.com/api/v1/adp/${type}?teams=${teams}&year=${year}`;
  const response = await fetch(url);
  const data = await response.json();
  return NextResponse.json(data);
} 