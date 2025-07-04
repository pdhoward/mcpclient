'use client';

import { useRef } from 'react';
import { ServerEvent, SessionStatus, AgentConfig } from '@/lib/types';
import { useTranscript } from '@/contexts/TranscriptContext';
import { useEvent } from '@/contexts/EventContext';

export interface UseHandleServerEventParams {
  setSessionStatus: (status: SessionStatus) => void;
  selectedAgentName: string;
  selectedAgentConfigSet: AgentConfig[] | null;
  sendClientEvent: (eventObj: any, eventNameSuffix?: string) => void;
  setSelectedAgentName: (name: string) => void;
  setComponentId: (id: string) => void; // New
  shouldForceResponse?: boolean;
}

export function useHandleServerEvent({
  setSessionStatus,
  selectedAgentName,
  selectedAgentConfigSet,
  sendClientEvent,
  setSelectedAgentName,
  setComponentId,
}: UseHandleServerEventParams) {

  const {
    transcriptItems,
    addTranscriptBreadcrumb,
    addTranscriptMessage,
    updateTranscriptMessage,
    updateTranscriptItemStatus,
  } = useTranscript();
  
  const { logServerEvent } = useEvent();

  // Track processed call_ids to prevent recursive loops
  const processedCallIds = useRef(new Set<string>());

  //////////////////////////////////////////////////////////////
  /////            Event Listeners for Tool Calls           ///
  //// triggered by 'response.function_call_arguments.done' //
  ///////////////////////////////////////////////////////////
  type ComponentName = 'menu' | 'room' | 'billing' | 'spa_pricing' | 'waterfall_video' | 'PLACEHOLDER';
  const visualStageResponses: Record<ComponentName, string>  = {
        menu: 'Here is the menu from our executive chef. Let me know if you have any questions!',
        room: 'Here’s a look at our luxury villas. Would you like to book one?',
        billing: 'Here’s your billing summary. Let me know if you have any questions.',
        spa_pricing: 'Here are our spa treatment prices. Would you like me to explain any of them?',
        waterfall_video: 'Here’s a video of our signature 50-foot waterfall. Enjoy!',
        PLACEHOLDER: "for future components that may require a server call"
      };

  const handleFunctionCall = async (functionCallParams: {
    name: string;
    call_id?: string;
    arguments: string;
  }) => {
    const { name, call_id, arguments: argsString } = functionCallParams;
    let args;
    try {
      args = JSON.parse(argsString);
    } catch (error) {
      console.error(`Failed to parse function call arguments for ${name}:`, error);
      return;
    }

    // Prevent recursive loop by checking call_id
    if (call_id && processedCallIds.current.has(call_id)) {
      console.warn(`Skipping duplicate function call: ${name}, call_id: ${call_id}`);
      return;
    }

    if (call_id) {
      processedCallIds.current.add(call_id);
    }

    // Log function call details for debugging
    console.log(`Processing function call: ${name}, call_id: ${call_id}, args:`, args);
    addTranscriptBreadcrumb(`Function call: ${name}`, { call_id, args });

    // Handles visual component rendering requests (e.g., show_menu, show_room)
    // Updates VisualStage with componentId and triggers a contextual voice response
    if (name === 'show_component') {
      const { component_name }: { component_name: ComponentName } = JSON.parse(argsString);
      setComponentId(component_name);

      let responseText = visualStageResponses[component_name] || `Your requested information!`;
      
       if (component_name === 'PLACEHOLDER') {
        const response = await fetch('/api/mcp/execute-tool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolName: 'show_component', args: { component_name } }),
        });
        const result = await response.json();
        responseText = `Here are our spa treatment prices: ${result.prices.join(', ')}. Would you like me to explain any of them?`;
      }
      sendClientEvent({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: visualStageResponses[component_name] || 'Here’s the requested information!' }]
        }
      });
      sendClientEvent({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'], // Request both text and audio
          instructions: `Speak the following: ${visualStageResponses[component_name]}`,
        },
      })
      console.log(`show_component called with component_name: ${component_name}`);
      return;
    }

    // Handle special case for agent transfer
    if (name === 'transferAgents') {
      const destinationAgent = args.destination_agent;
      const newAgentConfig = selectedAgentConfigSet?.find((a) => a.name === destinationAgent) || null;
      if (newAgentConfig) {
        setSelectedAgentName(destinationAgent);
      }
      const functionCallOutput = {
        destination_agent: destinationAgent,
        did_transfer: !!newAgentConfig,
      };
      sendClientEvent({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id,
          output: JSON.stringify(functionCallOutput),
        },
      });
      addTranscriptBreadcrumb(`Transfer agents response`, functionCallOutput);
      return;
    }

    try {
      // filter transcript log for relevent messages only
      const filteredTranscriptLogs = transcriptItems
        .filter((item) => item.type === 'MESSAGE' && !item.isHidden)
        .map(({ itemId, type, role, title, timestamp, createdAtMs, status }) => ({
          itemId,
          type,
          role,
          transcript: title,
          timestamp,
          createdAtMs,
          status,
        }))
      
      const response = await fetch('/api/mcp/execute-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: name,
          args: {
            relevantContextFromLastUserMessage: args.relevantContextFromLastUserMessage || '',
            transcriptLogs: filteredTranscriptLogs,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Failed to execute tool ${name}`);
      }
      console.log(`Tool ${name} executed, result:`, result);
      sendClientEvent({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id,
          output: JSON.stringify(result),
        },
      });
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      sendClientEvent({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id,
          output: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
        },
      });
    }
    
    ///////////////////////////////////////////////////
    /// prompts openai to respond with tool output  //
    /////////////////////////////////////////////////
    sendClientEvent({
      type: 'response.create',
      response: {
        tool_choice: 'auto',
      },
    });
  };
  ////////////////////////////////////////////////////////////
  ///   Process Server Events from OpenAI Realtime API    ///
  //////////////////////////////////////////////////////////
  const handleServerEvent = async (serverEvent: ServerEvent) => {
    // Log all server events for debugging
    logServerEvent(serverEvent);
   
    switch (serverEvent.type) {
      // Session created with initial configuration
      case 'session.created': {
        console.log('Session created:', JSON.stringify(serverEvent.session, null, 2));
        if (serverEvent.session?.id) {
          console.log(`Setting session status to CONNECTED for session: ${serverEvent.session.id}`);
          setSessionStatus('CONNECTED');
          addTranscriptBreadcrumb(
            `Session ID: ${serverEvent.session.id}\nStarted at: ${new Date().toLocaleString()}`
          );
        }
        break;
      }

      // Session updated with new configuration
      case 'session.updated': {
        console.log('Session updated');
        break;
      }

      // New conversation item created (e.g., user/assistant message)
      case 'conversation.item.created': {
        console.log('Conversation item created:', serverEvent.item);
        const text =
          serverEvent.item?.content?.[0]?.text ||
          serverEvent.item?.content?.[0]?.transcript ||
          '';
        const role = serverEvent.item?.role as 'user' | 'assistant';
        const itemId = serverEvent.item?.id;

        if (itemId && transcriptItems.some((item) => item.itemId === itemId)) {
          console.log(`Skipping duplicate item: ${itemId}`);
          break;
        }

        if (itemId && role) {
          const displayText = role === 'user' && !text ? '[Transcribing...]' : text;
          console.log(`Adding transcript message: ${itemId}, role: ${role}, text: ${displayText}`);
          addTranscriptMessage(itemId, role, displayText);
        }
        break;
      }

      // User audio transcription completed
      case 'conversation.item.input_audio_transcription.completed': {
        const itemId = serverEvent.item_id;
        const finalTranscript =
          !serverEvent.transcript || serverEvent.transcript.trim() === ''
            ? '[No transcription available]'
            : serverEvent.transcript;
        if (itemId) {
          console.log(`Updating transcription: ${itemId}, text: ${finalTranscript}`);
          updateTranscriptMessage(itemId, finalTranscript, false);
          updateTranscriptItemStatus(itemId, 'DONE');
        } else {
          console.warn('Missing item_id for transcription.completed:', serverEvent);
        }
        break;
      }

      // Transcription delta for audio output
      case 'response.audio_transcript.delta': {
        const itemId = serverEvent.item_id;
        const deltaText = serverEvent.delta || '';
        if (itemId) {
          console.log(`Appending transcript delta: ${itemId}, delta: ${deltaText}`);
          updateTranscriptMessage(itemId, deltaText, true);
        }
        break;
      }

      // Response creation started
      case 'response.created': {
        console.log('Response created:', serverEvent.response);
        break;
      }

      // Output item added to response
      case 'response.output_item.added': {
        console.log('Output item added:', serverEvent.item);
        break;
      }

      // Content part added to item
      case 'response.content_part.added': {
        console.log('Content part added:', serverEvent.part);
        break;
      }

      // Content part streaming completed
      case 'response.content_part.done': {
        console.log('Content part done:', serverEvent.part);
        break;
      }

      // Text delta for response
      case 'response.text.delta': {
        const itemId = serverEvent.item_id;
        const deltaText = serverEvent.delta || '';
        if (itemId) {
          console.log(`Appending text delta: ${itemId}, delta: ${deltaText}`);
          updateTranscriptMessage(itemId, deltaText, true);
        }
        break;
      }

      // Text streaming completed
      case 'response.text.done': {
        const itemId = serverEvent.item_id;
        const finalText = serverEvent.text || '';
        if (itemId) {
          console.log(`Text done: ${itemId}, text: ${finalText}`);
          updateTranscriptMessage(itemId, finalText, false);
        }
        break;
      }

      // Function call arguments delta
      case 'response.function_call_arguments.delta': {
        console.log('Function call arguments delta:', serverEvent);
        const { call_id, name, delta } = serverEvent;
        addTranscriptBreadcrumb(`Function call delta: ${name}`, { call_id, delta });
        break;
      }

      //////////////////////////////////////////////////////////////
      ////    case for intercepting and detecting intent      /////
      ////////////////////////////////////////////////////////////
      case 'response.function_call_arguments.done': {
        console.log('Function call arguments done:', serverEvent);
        const { call_id, name, arguments: args } = serverEvent;
        addTranscriptBreadcrumb(`Function call done: ${name}`, { call_id, args });
        await handleFunctionCall({ name, call_id, arguments: args });
        break;
      }

      // Response streaming completed
      case 'response.done': {
        console.log('Response done:', JSON.stringify(serverEvent.response, null, 2));
        if (serverEvent.response?.status === 'failed') {
          console.error('Response failed:', serverEvent.response.status_details);
        }
        if (serverEvent.response?.output) {
          serverEvent.response.output.forEach((outputItem: any) => {
            console.log('Output item:', outputItem);
            if (
              outputItem.type === 'function_call' &&
              outputItem.name &&
              outputItem.arguments
            ) {
              console.log('Function call detected:', outputItem);
              handleFunctionCall({
                name: outputItem.name,
                call_id: outputItem.call_id,
                arguments: outputItem.arguments,
              });
            }
          });
        }
        break;
      }

      // Output item streaming completed
      case 'response.output_item.done': {
        const itemId = serverEvent.item?.id;
        if (itemId) {
          console.log(`Marking item as DONE: ${itemId}`);
          updateTranscriptItemStatus(itemId, 'DONE');
        }
        break;
      }

      // Speech detection started (VAD)
      case 'input_audio_buffer.speech_started': {
        console.log('Speech started:', serverEvent);
        addTranscriptBreadcrumb(
          `Speech started at ${serverEvent.audio_start_ms}ms`,
          { item_id: serverEvent.item_id }
        );
        break;
      }

      // Speech detection stopped (VAD)
      case 'input_audio_buffer.speech_stopped': {
        console.log('Speech stopped:', serverEvent);
        addTranscriptBreadcrumb(
          `Speech stopped at ${serverEvent.audio_end_ms}ms`,
          { item_id: serverEvent.item_id }
        );
        break;
      }

      // Input audio buffer committed
      case 'input_audio_buffer.committed': {
        console.log('Audio buffer committed:', serverEvent);
        addTranscriptBreadcrumb(
          `Audio buffer committed for item ${serverEvent.item_id}`,
          { previous_item_id: serverEvent.previous_item_id }
        );
        break;
      }

      // Input audio buffer cleared
      case 'input_audio_buffer.cleared': {
        console.log('Audio buffer cleared:', serverEvent);
        addTranscriptBreadcrumb('Audio buffer cleared');
        break;
      }

      // Rate limits updated
      case 'rate_limits.updated': {
        console.log('Rate limits updated:', serverEvent.rate_limits);
        addTranscriptBreadcrumb('Rate limits updated', serverEvent.rate_limits);
        break;
      }

      // Error from server
      case 'error': {
        console.error('Server error:', JSON.stringify(serverEvent.error, null, 2));
        addTranscriptBreadcrumb('Error occurred', serverEvent.error);
        break;
      }

      // Unhandled events
      default:
        console.log(`Unhandled server event: ${serverEvent.type}`);
        break;
    }
  };

  // Use useRef to maintain a stable handler reference
  const handleServerEventRef = useRef(handleServerEvent);
  handleServerEventRef.current = handleServerEvent;

  return handleServerEventRef;
}