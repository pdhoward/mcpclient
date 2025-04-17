
import supertest from "supertest";
import { POST } from "@/app/api/chat/route"; // Adjust path to your API route
import { Message, ToolSchema, ToolsAndClient } from "@/lib/types";

// Mock dependencies
jest.mock("ai", () => ({
  generateText: jest.fn(),
}));
jest.mock("@/app/api/chat/helpers/fetchToolsAndClient", () => ({
  fetchToolsAndClient: jest.fn(),
}));
jest.mock("@/app/api/chat/helpers/getToolSchema", () => ({
  getToolSchema: jest.fn(),
}));
jest.mock("@/app/api/chat/helpers/getMissingParams", () => ({
  getMissingParams: jest.fn(),
}));
jest.mock("@/app/api/chat/helpers/extractParameters", () => ({
  extractParameters: jest.fn(),
}));
jest.mock("@/app/api/chat/helpers/detectToolIntent", () => ({
  detectToolIntent: jest.fn(),
}));
jest.mock("@/app/api/chat/helpers/handleContextSwitch", () => ({
  handleContextSwitch: jest.fn(),
}));
jest.mock("@/app/api/chat/helpers/handlePendingContextSwitch", () => ({
  handlePendingContextSwitch: jest.fn(),
}));

import { generateText } from "ai";
import { fetchToolsAndClient } from "@/app/api/chat/helpers/fetchToolsAndClient";
import { getToolSchema } from "@/app/api/chat/helpers/getToolSchema";
import { getMissingParams } from "@/app/api/chat/helpers/getMissingParams";
import { extractParameters } from "@/app/api/chat/helpers/extractParameters";
import { detectToolIntent } from "@/app/api/chat/helpers/detectToolIntent";
import { handleContextSwitch } from "@/app/api/chat/helpers/handleContextSwitch";
import { handlePendingContextSwitch } from "@/app/api/chat/helpers/handlePendingContextSwitch";

describe("POST /api", () => {
  let request: supertest.SuperTest<supertest.Test>;

  // Mock Next.js request object
  const createRequest = (body: any): Request => {
    return {
      json: async () => body,
    } as Request;
  };

  // Mock tools and client
  const mockTools: Array<{ name: string; inputSchema: ToolSchema }> = [
    {
      name: "deployContract",
      inputSchema: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Contract owner address" },
          amount: { type: "number", description: "Initial amount" },
        },
        required: ["owner", "amount"],
      },
    },
  ];
  const mockClient = {
    executeTool: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fetchToolsAndClient as jest.Mock).mockResolvedValue({
      tools: mockTools,
      client: mockClient,
    });
    (getToolSchema as jest.Mock).mockImplementation((tools, toolName) =>
      tools.find((t: any) => t.name === toolName)?.inputSchema
    );
    (getMissingParams as jest.Mock).mockImplementation((schema, inputs) => {
      if (!schema) return [];
      const required = schema.required || [];
      return required.filter((param: any) => !inputs[param]);
    });
    (extractParameters as jest.Mock).mockResolvedValue({});
    (detectToolIntent as jest.Mock).mockResolvedValue(null);
    (handleContextSwitch as jest.Mock).mockResolvedValue({ response: null });
    (handlePendingContextSwitch as jest.Mock).mockResolvedValue({ response: null });
  });

  // ────────────────────────────────
  // tests
  // ────────────────────────────────

  it("returns error for empty messages", async () => {
    const res = await POST(createRequest({ messages: [] }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.content).toBe("No messages provided");
  });


  it("should detect tool intent and prompt for missing parameters", async () => {
    (detectToolIntent as jest.Mock).mockResolvedValue("deployContract");
    (extractParameters as jest.Mock).mockResolvedValue({ owner: "0x123" });
    (getMissingParams as jest.Mock).mockReturnValue(["amount"]);
    (generateText as jest.Mock).mockResolvedValue({
      text: "Please provide the initial amount.",
    });

    const messages: Message[] = [
      { role: "user", content: "Deploy a contract with owner 0x123", timestamp: Date.now() },
    ];
    const res  = await POST(createRequest({ messages }));
    const body = await res.json();
  
    expect(res.status).toBe(200);
    expect(body.content).toBe("Please provide the initial amount.");
    expect(body.annotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "tool-input-state",
          toolName: "deployContract",
          collectedInputs: { owner: "0x123" },
          finished: false,
        }),
      ]),
    );
  });       


  it("returns error for empty messages", async () => {
      const res = await POST(createRequest({ messages: [] }));
      const body = await res.json();
  
      expect(res.status).toBe(500);
      expect(body.content).toBe("No messages provided");
    });
  
  

  it("should indicate readiness when all parameters are collected", async () => {
    (detectToolIntent as jest.Mock).mockResolvedValue("deployContract");
    (extractParameters as jest.Mock).mockResolvedValue({
      owner: "0x123",
      amount: 100,
    });
    (getMissingParams as jest.Mock).mockReturnValue([]);

    const messages: Message[] = [
      { role: "user", content: "Deploy a contract with owner 0x123 and amount 100", timestamp: Date.now() },
    ];
    const res = await POST(createRequest({ messages }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.content).toBe(
      "✅ All parameters collected. Do you want to execute the tool? (e.g., say 'execute' or 'run')",
    );

    expect(body.annotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          toolName: "deployContract",
          collectedInputs: { owner: "0x123", amount: 100 },
          finished: true,
        }),
      ]),
    );
  });

  it("should execute tool when user confirms execution", async () => {
    (detectToolIntent as jest.Mock).mockResolvedValue("deployContract");
    (extractParameters as jest.Mock).mockResolvedValue({
      owner: "0x123",
      amount: 100,
    });
    (getMissingParams as jest.Mock).mockReturnValue([]);
    (mockClient.executeTool as jest.Mock).mockResolvedValue({ message: 'Contract deployed successfully' });

    const messages: Message[] = [
      { role: "user", content: "Deploy a contract with owner 0x123 and amount 100", timestamp: Date.now() },
      { role: "assistant", content: "All parameters collected.", timestamp: Date.now() },
      { role: "user", content: "Execute", timestamp: Date.now() },
    ];
    const res = await POST(createRequest({ messages }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.content).toBe("✅ Tool deployContract executed successfully: Contract deployed successfully");
    expect(mockClient.executeTool).toHaveBeenCalledWith("deployContract", { owner: "0x123", amount: 100 });
  });

  it("should recover state and continue collecting parameters", async () => {
    (getMissingParams as jest.Mock).mockReturnValue(["amount"]);
    (generateText as jest.Mock).mockResolvedValue({
      text: "Please provide the initial amount.",
    });

    const messages: Message[] = [
      {
        role: "assistant",
        content: "Please provide the owner.",
        annotations: [
          {
            type: "tool-input-state",
            toolName: "deployContract",
            collectedInputs: {},
            finished: false,
            contextStatePending: false,
            toolPending: undefined,
          },
        ],
        timestamp: Date.now(),
      },
      { role: "user", content: "Owner is 0x123", timestamp: Date.now() },
    ];
    (generateText as jest.Mock).mockResolvedValueOnce({
      text: JSON.stringify({ owner: "0x123" }),
    });

    const res = await POST(createRequest({ messages }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.content).toBe("Please provide the initial amount.");

    expect(body.annotations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          collectedInputs: { owner: "0x123" },
          finished: false,
        }),
      ]),
    );
  });

  it("should handle context switch response", async () => {
    (handleContextSwitch as jest.Mock).mockResolvedValue({
      response: {
        role: "assistant",
        content: "Switched to new tool.",
        timestamp: Date.now(),
      },
    });

    const messages: Message[] = [
      { role: "user", content: "Switch to another tool", timestamp: Date.now() },
    ];
    const res = await POST(createRequest({ messages }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.content).toBe("Switched to new tool.");
  });

  it("should return error for invalid tools", async () => {
    (fetchToolsAndClient as jest.Mock).mockResolvedValue({
      tools: [],
      client: mockClient,
    });

    const messages: Message[] = [
      { role: "user", content: "Deploy a contract", timestamp: Date.now() },
    ];
    const res = await POST(createRequest({ messages: [{ role: "user", content: "Deploy a contract", timestamp: Date.now() }] }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.content).toBe("No valid tools available after filtering");
  });
});