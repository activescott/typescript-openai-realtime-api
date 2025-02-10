import type { components } from "./openapi"
import type { IterableElement, Simplify } from "type-fest"

// NOTE: these types are generated and in the openai node/JS SDK repo, but they're not in the published package. See https://github.com/openai/openai-node/blob/master/src/resources/beta/realtime/realtime.ts.
//       However, OpenAI seems to regularly update the OpenAI spec and they are there: https://github.com/openai/openai-openapi and it's trivial to generate them.

/**
 * All the keys of components["schemas"] that begins with "RealtimeClientEvent"
 */
type RealtimeClientEventKeys = Extract<
  keyof components["schemas"],
  `RealtimeClientEvent${string}`
>

/**
 * All of the RealtimeClientEvent messages/events.
 * These are sent to the OpenAI server by the client.
 */
export type RealtimeClientEvent = components["schemas"][RealtimeClientEventKeys]

export type RealtimeClientEventSessionUpdate =
  components["schemas"]["RealtimeClientEventSessionUpdate"]

export type RealtimeClientEventConversationItemCreate =
  components["schemas"]["RealtimeClientEventConversationItemCreate"]

export type RealtimeClientEventResponseCreate =
  components["schemas"]["RealtimeClientEventResponseCreate"]

//#region Server Events Message Types
/**
 * All the keys of components["schemas"] that begins with "RealtimeServerEvent"
 */
type RealTimeServerEventKeys = Extract<
  keyof components["schemas"],
  `RealtimeServerEvent${string}`
>

/**
 * All of the RealtimeServerEvent messages/events.
 * These are received by the client from the OpenAI server.
 */
export type RealtimeServerEvent = components["schemas"][RealTimeServerEventKeys]

export type RealtimeServerEventTypes = RealtimeServerEvent["type"]

/**
 * A map of the @see RealtimeServerEvent.type to the actual type of the event.
 */
export type RealtimeServerEventTypeMap = {
  [K in RealtimeServerEventTypes]: Extract<RealtimeServerEvent, { type: K }>
}

export type RealtimeServerEventConversationItemCreated =
  components["schemas"]["RealtimeServerEventConversationItemCreated"]

export type RealtimeServerEventSessionCreated =
  components["schemas"]["RealtimeServerEventSessionCreated"]
export type RealtimeServerEventSessionUpdated =
  components["schemas"]["RealtimeServerEventSessionUpdated"]
export type RealtimeServerEventResponseDone =
  components["schemas"]["RealtimeServerEventResponseDone"]

export type RealtimeServerEventConversationItemInputAudioTranscriptionCompleted =
  components["schemas"]["RealtimeServerEventConversationItemInputAudioTranscriptionCompleted"]
export type RealtimeServerEventResponseAudioTranscriptDone =
  components["schemas"]["RealtimeServerEventResponseAudioTranscriptDone"]

/** Returned when the model-generated transcription of audio output is updated. */
export type RealtimeServerEventResponseAudioTranscriptDelta =
  components["schemas"]["RealtimeServerEventResponseAudioTranscriptDelta"]
/**
 * A type with the common properties of the events that include a completed transcript.
 */
export type RealtimeServerEventWithCompletedTranscript =
  | RealtimeServerEventConversationItemInputAudioTranscriptionCompleted
  | RealtimeServerEventResponseAudioTranscriptDone

//#endregion Server Events Message Types

//#region Server Event Message Data
// These types are part of the server event messages that the realtime API uses.

/**
 * This is the main message type that the realtime API uses.
 */
export type RealtimeConversationItem =
  components["schemas"]["RealtimeConversationItem"]

/** The session found on events from the server such as session created or session updated. */
export type RealtimeSession = components["schemas"]["RealtimeSession"]
/**
 * Session creation/update session
 */
export type RealtimeSessionCreateRequest =
  components["schemas"]["RealtimeSessionCreateRequest"]

export type RealTimeSessionModels = RealtimeSessionCreateRequest["model"]

/** Part of the @see RealtimeServerEventResponseDone event and others.
 */
export type RealtimeResponse = components["schemas"]["RealtimeResponse"]

export type RealtimeConversationItemContentElement = IterableElement<
  RealtimeConversationItem["content"]
>

//#region RealtimeConversationItem.content Types
/**
 * The content of a conversation item when type="input_audio".
 */
export type RealtimeConversationItemContentInputAudio = Simplify<
  {
    type: "input_audio"
  } & Pick<RealtimeConversationItemContentElement, "audio" | "transcript">
>
/**
 * The content of a conversation item when type="input_text".
 */
export type RealtimeConversationItemContentInputText = Simplify<
  {
    type: "input_text"
  } & Pick<RealtimeConversationItemContentElement, "text">
>
/**
 * The content of a conversation item when type="item_reference".
 * NOTE: this is only used in conversation items created with https://platform.openai.com/docs/api-reference/realtime-client-events/response/create
 */
export type RealtimeConversationItemContentItemReference = Simplify<
  {
    type: "item_reference"
  } & Pick<RealtimeConversationItemContentElement, "id">
>
/**
 * The content of a conversation item when type="input_text".
 */
export type RealtimeConversationItemContentText = Simplify<
  {
    type: "text"
  } & Pick<RealtimeConversationItemContentElement, "text">
>

/**
 * A more specific type for the @see RealtimeConversationItem.content field.
 */
export type RealtimeConversationItemContent =
  | RealtimeConversationItemContentInputAudio
  | RealtimeConversationItemContentInputText
  | RealtimeConversationItemContentItemReference
  | RealtimeConversationItemContentText
//#endregion RealtimeConversationItemContent Types

//#endregion Server Event Message Data
