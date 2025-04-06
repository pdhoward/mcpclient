import { NextResponse } from "next/server";
//import { serverManager } from "../../../server/route";

// Placeholder for serverManager
const serverManager = {
  getServerTools: async (serverId: string) => {
    console.log(`Fetching tools for server: ${serverId}`);
    return { message: `Placeholder response for server ${serverId}` };
  },
  callServerTool: async (id: any, obj: any) => {
    console.log("Calling server tools...");
    return { message: "Placeholder call response" };
  }
};
export async function GET(
  { params }: { params: { serverId: string } }
) {
  try {
    const { serverId } = await params;
    const response = await serverManager.getServerTools(serverId);
    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { serverId: string } }
) {
  try {
    const { serverId } = await params;
    const { name, args } = await request.json();
    
    const response = await serverManager.callServerTool(serverId, { name, args });
    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
