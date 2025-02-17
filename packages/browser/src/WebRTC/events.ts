import { Simplify } from "type-fest"
import type {
  RealtimeServerEvent,
  RealtimeConversationItem,
  RealtimeSession,
} from "../openai"

// Add this index signature allows the key to be string
// & {
//   /**
//    * Emitted for each of the specified Realtime Server event type.
//    */
//   [EventType in RealtimeServerEvent["type"]]: RealtimeServerEventEvent<
//     RealtimeServerEventTypeMap[EventType]
//   >
// }
type RealtimeClientEventNames = keyof RealtimeClientEventMap
type RealtimeClientEventObjects =
  RealtimeClientEventMap[RealtimeClientEventNames]

class BaseEvent<
  TType extends keyof RealtimeClientEventMap | RealtimeServerEvent["type"],
> extends Event {
  constructor(public readonly type: TType) {
    super(type)
  }
}

export class RealtimeServerEventEvent<
  T extends RealtimeServerEvent = RealtimeServerEvent,
> extends BaseEvent<"serverEvent"> {
  constructor(public readonly event: T) {
    super("serverEvent")
  }
}

export class ConversationChangedEvent extends BaseEvent<"conversationChanged"> {
  constructor(public readonly conversation: RealtimeConversationItem[]) {
    super("conversationChanged")
    this.conversation = conversation
  }
}

export class RecordedAudioChangedEvent extends BaseEvent<"recordedAudioChanged"> {
  constructor(public readonly recordedAudioChunks: Blob[]) {
    super("recordedAudioChanged")
  }
}

export class SessionUpdatedEvent extends BaseEvent<"sessionUpdated"> {
  constructor(public readonly session: RealtimeSession | undefined) {
    super("sessionUpdated")
  }
}

export class SessionCreatedEvent extends BaseEvent<"sessionCreated"> {
  constructor(public readonly session: RealtimeSession) {
    super("sessionCreated")
  }
}

export interface EventTargetListener<
  TEvent extends RealtimeClientEventObjects,
> {
  (evt: TEvent): void
}
/**
 * Used to map the each event name to its corresponding Event type.
 */

export type RealtimeClientEventMap = Simplify<{
  /**
   * Emitted for all of the Realtime Server events.
   */
  serverEvent: RealtimeServerEventEvent<RealtimeServerEvent>
  /**
   * Emitted when the session starts
   */
  sessionCreated: SessionCreatedEvent
  /**
   * Emitted when the session is updated.
   */
  sessionUpdated: SessionUpdatedEvent
  /**
   * Emitted when the conversation changes
   * @param event
   * @returns
   */
  conversationChanged: ConversationChangedEvent
  /**
   * Emitted when the recorded audio changes.
   */
  recordedAudioChanged: RecordedAudioChangedEvent
}>
