import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
    });
    return NextResponse.json(response.choices[0].message);
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}