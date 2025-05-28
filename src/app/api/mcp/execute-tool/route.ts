// app/api/mcp/execute-tool/route.ts
import { NextRequest, NextResponse } from 'next/server';

const origin = 'https://chaotic.ngrok.io';

export async function POST(request: NextRequest) {
  const { toolName, args } = await request.json();

  if (!toolName || !args) {
    return NextResponse.json(
      { error: 'Missing toolName or args' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${origin}/execute-tool`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toolName,
        args,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Failed to execute tool ${toolName}`);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Tool execution failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}