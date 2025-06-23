## MCP CLIENT

* USE MCP
A lightweight React hook for connecting to Model Context Protocol (MCP) servers. Simplifies authentication and tool calling for AI systems implementing the MCP standard.

https://github.com/modelcontextprotocol/use-mcp

https://blog.cloudflare.com/connect-any-react-application-to-an-mcp-server-in-three-lines-of-code/

* OPENAI AGENTS
https://openai.github.io/openai-agents-js/guides/voice-agents/

https://x.com/OpenAIDevs/status/1929950678799266253

* AGENT PRODUCTION
https://github.com/NirDiamant/agents-towards-production

---------------------

SUPABASE CONNECTION

https://supabase.com/ui

https://supabase.com/ui/docs/getting-started/introduction


-----------------

This is an example implementation of the Model Context Protocol SDK's client code with the Vercel AI SDK which simplifies handling an LLM chat in the browser. Check out [how to make your own mcp servers quick here](https://mcp-framework.com)

## How It Works

1. Connect to an MCP server with SSE through the UI ( you can learn more about [creating mcp servers with SSE](https://mcp-framework.com/docs/Transports/sse))
2. The system automatically discovers available tools
3. Ask it to use the tool

## Getting Started

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Then go to `http://localhost:3000` 

### INSPECT

npx @modelcontextprotocol/inspector

### RESEARCH

https://component-playground-eight.vercel.app/

project management
https://github.com/ln-dev7/circle

SBA Supplier Portal
https://www.industrynet.com/madeinamerica/
https://www.thomasnet.com/suppliers/madeinamerica
https://i5services-20596380.hs-sites.com/made-in-america


### Documentation on modules
* SessionManager (useSessionManager)
Purpose: Manages the WebRTC connection lifecycle (connect, disconnect, audio playback) and provides the dataChannel.

Why Separate: WebRTC connections involve complex setup (e.g., fetching ephemeral keys, creating RTCPeerConnection, handling audio streams), which is isolated to avoid cluttering MetaAgent. This abstraction makes it reusable for other components needing WebRTC.

Collapse Potential: Could be partially inlined into MetaAgent if WebRTC is only used here, but this would make MetaAgent harder to maintain and test. Keeping it separate improves modularity.

* HandleServerEvent (useHandleServerEvent)
Purpose: Processes a wide range of ServerEvent types from the OpenAI Realtime API, updating transcriptItems, sessionStatus, or selectedAgentName.

Why Separate: The complexity of handling multiple event types (e.g., messages, transcriptions, function calls) justifies a dedicated hook. It encapsulates business logic and reduces MetaAgent’s responsibility to just wiring events to handlers.

Collapse Potential: Inlining into MetaAgent would bloat the component with a large switch statement, reducing readability and testability. A partial collapse (e.g., moving transcript-specific logic to useTranscript) is possible but would require restructuring useTranscript to handle raw ServerEvents.

* useTranscript (TranscriptContext)
Purpose: Manages the transcriptItems state and provides update functions for messages and breadcrumbs.

Why Separate: Using React Context allows transcriptItems to be shared across components (e.g., if another component needs access). It also centralizes state management, keeping MetaAgent focused on UI and orchestration.

Collapse Potential: If transcriptItems is only used in MetaAgent, the state and update functions could be moved to MetaAgent or a custom hook, eliminating the context. However, this assumes no other components need transcriptItems, which may not hold as the app grows.

* MessageHandler (useMessageHandler)
Purpose: Handles outgoing client events (e.g., sending user text, canceling assistant speech) and simulated messages.

Why Separate: Isolates the logic for sending WebRTC messages, ensuring MetaAgent doesn’t directly interact with dataChannel for sending events. This abstraction supports reusability and simplifies testing.

Collapse Potential: Could be inlined into MetaAgent, but this would mix UI logic with event-sending logic, reducing clarity. The hook’s small size makes it a lightweight abstraction.

* AgentSession (useAgentSession)
Purpose: Configures the OpenAI Realtime API session with agent-specific settings (e.g., instructions, tools, voice).

Why Separate: Session configuration is a distinct concern from UI rendering or event handling, and the logic (e.g., constructing session.update events) is complex enough to warrant isolation.

Collapse Potential: Inlining into MetaAgent would add more useEffect logic, making the component harder to read. A partial merge with MessageHandler (since both deal with sendClientEvent) is possible but would reduce clarity unless carefully structured.

* MappedMessages (useMappedMessages)
Purpose: Transforms transcriptItems and loggedEvents into Conversation and logs formats for potential use by AI agents.

Why Separate: The transformation logic is specific to agent requirements and may be reused elsewhere. It avoids cluttering MetaAgent with data mapping.

Collapse Potential: If logs and conversation are only used in MetaAgent and not by other components, the mapping could be done inline. However, keeping it separate supports future scalability (e.g., if other components need the mapped data).


