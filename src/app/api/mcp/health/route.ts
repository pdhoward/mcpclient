import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const url = 'https://chaotic.ngrok.io/health';
    const clientId = 'clientA';

    // Attach the header with your client ID to the fetch request.
    const res = await fetch(url, {
      headers: {
        'x-client-id': clientId,
      },
    });
    
    if (!res.ok) {
      throw new Error(`Health check request failed: ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('MCP Server Health:', data);
    
    return NextResponse.json({ health: data });
  } catch (error: any) {
    console.error('Error fetching health check:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
