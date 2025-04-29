import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const url = 'https://chaotic.ngrok.io/agents';    

    // Attach the header with your client ID to the fetch request.
    const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    
    if (!res.ok) {
      throw new Error(`Agent Profile Fetch failed: ${res.statusText}`);
    }
    
    const data = await res.json();    
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
