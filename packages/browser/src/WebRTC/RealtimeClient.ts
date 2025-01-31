import { Simplify } from "type-fest"
import type {
  RealtimeClientEventSessionUpdate,
  RealtimeConversationItem,
  RealtimeServerEvent,
  RealtimeServerEventConversationItemCreated,
  RealtimeServerEventResponseAudioTranscriptDelta,
  RealtimeServerEventResponseAudioTranscriptDone,
  RealtimeServerEventResponseDone,
  RealtimeServerEventSessionCreated,
  RealtimeServerEventSessionUpdated,
  RealtimeSession,
  RealtimeSessionCreateRequest,
} from "../types/openai"
import EventEmitter from "events"
import type TypedEmitter from "typed-emitter"
import {
  findConversationItem,
  findConversationItemContent,
  patchConversationItemWithCompletedTranscript,
} from "./items"

const log = console

type RealtimeEventMap = Simplify<
  {
    // server events
    event: (event: RealtimeServerEvent) => void
    /**
     * Emitted when the recorded audio changes.
     */
    recordedAudioChanged: () => void
    /**
     * Emitted when the session starts
     */
    sessionCreated: (session: RealtimeSession) => void
    /**
     * Emitted when the session is updated.
     */
    sessionUpdated: (session: RealtimeSession | undefined) => void
    /**
     * Emitted when the conversation
     * @param event
     * @returns
     */
    conversationChanged: (conversation: RealtimeConversationItem[]) => void
  } & {
    [EventType in RealtimeServerEvent["type"]]: (
      event: Extract<RealtimeServerEvent, { type: EventType }>
    ) => unknown
  }
>

// NOTE: this extends syntax from https://www.npmjs.com/package/typed-emitter

/**
 * A TypeScript client for the OpenAI Realtime API using WebRTC in the browser.
 */
export class RealtimeClient extends (EventEmitter as new () => TypedEmitter<RealtimeEventMap>) {
  private peerConnection: RTCPeerConnection | undefined = undefined
  private localMediaStream: MediaStream | undefined = undefined
  private dataChannel: RTCDataChannel | undefined = undefined
  private mediaRecorder: MediaRecorder | undefined = undefined
  private audioChunks: Blob[] = []
  private conversation: RealtimeConversationItem[] = []
  // Session as received from the server in create/update
  private session: RealtimeSession | undefined = undefined

  /**
   * Create a new client.
   * @param getRealtimeEphemeralAPIKey This is a function that you should implement to return the Ephemeral OpenAI API key that is used to authenticate with the OpenAI Realtime API. It should be an ephemeral key as described at https://platform.openai.com/docs/guides/realtime-webrtc#creating-an-ephemeral-token. You will probably need to make a call to your server here to fetch the key.
   * @param sessionRequested The session parameters you want from the Realtime API. If these are found to be different it will re-request them to try to match this session.
   */
  constructor(
    private readonly navigator: Navigator,
    private readonly getRealtimeEphemeralAPIKey: () => string,
    private readonly audioElement: HTMLAudioElement,
    private readonly sessionRequested: RealtimeSessionCreateRequest,
    private readonly model = "gpt-4o-realtime-preview-2024-12-17",
    private readonly baseUrl = "https://api.openai.com/v1/realtime"
  ) {
    super()
  }

  async start(): Promise<void> {
    // clear conversation for a new session...
    this.conversation = []

    // Create a peer connection
    try {
      await this.initializePeerConnection()
    } catch (err) {
      log.error("Failed to initialize peer connection", err)
      throw err
    }

    // Initialize MediaRecorder
    try {
      this.initializeMediaRecorder()
    } catch (err) {
      log.error("Failed to initialize media recorder", err)
      throw err
    }

    // Create a data channel from a peer connection
    try {
      this.initializeDataChannel()
    } catch (err) {
      log.error("Failed to initialize data channel", err)
      throw err
    }

    // Start the session using the Session Description Protocol (SDP)
    try {
      await this.initializeSession()
    } catch (err) {
      log.error("Failed to initialize session", err)
      throw err
    }
  }

  private async initializePeerConnection() {
    this.peerConnection = new RTCPeerConnection()

    // Set up to play remote audio from the model
    this.peerConnection.ontrack = (e) => {
      log.debug("ontrack sending stream to audioElement", e)
      this.audioElement.srcObject = e.streams[0]
      this.audioElement.muted = false
      this.audioElement.autoplay = true
    }

    // Add local audio track for microphone input in the browser
    this.localMediaStream = await this.navigator.mediaDevices.getUserMedia({
      audio: {
        // see https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
      },
    })
    const track = this.localMediaStream.getTracks()[0]
    this.peerConnection.addTrack(track)
  }

  private initializeMediaRecorder() {
    if (!this.localMediaStream) {
      throw new Error("No local media stream")
    }

    this.mediaRecorder = new MediaRecorder(this.localMediaStream)
    this.audioChunks = []
    this.emit("recordedAudioChanged")

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data)
        this.emit("recordedAudioChanged")
      }
    }

    // Record in small chunks for better handling
    const MILLISECONDS_PER_SECOND = 1000
    this.mediaRecorder.start(MILLISECONDS_PER_SECOND * 10)
  }

  private async initializeSession() {
    if (!this.peerConnection) {
      throw new Error("No peer connection")
    }
    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)

    let apiKey: string
    try {
      apiKey = this.getRealtimeEphemeralAPIKey()
    } catch (err) {
      throw new Error("getRealtimeEphemeralAPIKey handler failed.", {
        cause: err,
      })
    }

    const sdpResponse = await fetch(`${this.baseUrl}?model=${this.model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/sdp",
      },
    })

    const answer: RTCSessionDescriptionInit = {
      type: "answer",
      sdp: await sdpResponse.text(),
    }

    log.debug("calling setRemoteDescription with answer", answer)

    await this.peerConnection.setRemoteDescription(answer)
  }

  private initializeDataChannel() {
    if (!this.peerConnection) {
      throw new Error("No peer connection")
    }

    this.dataChannel = this.peerConnection.createDataChannel("oai-events")

    // Listen for server-sent events on the data channel
    this.dataChannel.addEventListener(
      "message",
      this.receiveServerMessage.bind(this)
    )
  }

  /**
   * Internal handler for server events from OpenAI Realtime API.
   */
  private receiveServerMessage(e: MessageEvent<any>) {
    const parsedEvent = JSON.parse(e.data) as RealtimeServerEvent

    this.processServerEvent(parsedEvent)

    // dispatch it to any listeners
    // TODO: remove use of any
    type TypedEvent = Extract<
      RealtimeServerEvent,
      { type: typeof parsedEvent.type }
    >
    this.emit(parsedEvent.type as TypedEvent["type"], parsedEvent as any)
    this.emit("event", parsedEvent as any)
  }

  private processServerEvent(event: RealtimeServerEvent) {
    const handler = RealtimeClient.ServerEventHandlers[event.type]
    if (handler) {
      handler(this, event)
    }
  }

  public sendClientEvent(event: any): void {
    if (!this.dataChannel) {
      throw new Error("Data channel not initialized")
    }
    this.dataChannel.send(JSON.stringify(event))
  }

  public async stop(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop()
    }
    if (this.localMediaStream) {
      this.localMediaStream.getTracks().forEach((track) => track.stop())
      this.localMediaStream = undefined
    }
    if (this.audioElement) {
      // stop the existing audio element:
      this.audioElement.srcObject = null
      this.audioElement.muted = true
    }
    if (this.dataChannel) {
      this.dataChannel.close()
      this.dataChannel = undefined
    }
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = undefined
    }
    if (this.session) {
      this.session = undefined
      this.emit("sessionUpdated", this.session)
    }
  }

  // TODO: make these events provide typed events.
  private static ServerEventHandlers: Partial<
    Record<RealtimeServerEvent["type"], RealtimeClientServerEventHandler>
  > = {
    "session.created": (client, event) => {
      // when a conversation is created, set the conversation state:
      const sessionEvent = event as RealtimeServerEventSessionCreated

      client.session = sessionEvent.session
      log.info("Session created:", sessionEvent.session)
      client.emit("sessionCreated", sessionEvent.session)

      if (!client.sessionRequested) {
        throw new Error("No session request")
      }

      // NOTE: When we create a session with OpenAI, it ignores things like input_audio_transcription?.model !== "whisper-1"; So we update it again if it doesn't match the session.
      let updatedSession: RealtimeSessionCreateRequest = {
        ...client.sessionRequested,
      }
      let hasSessionMismatch = false

      for (const key of Object.keys(client.sessionRequested) as Array<
        keyof RealtimeSessionCreateRequest
      >) {
        const requestValue = client.sessionRequested[key]
        const sessionValue = sessionEvent.session[key]
        if (requestValue === sessionValue) {
          delete updatedSession[key]
          continue
        }
        hasSessionMismatch = true
      }
      if (hasSessionMismatch) {
        log.warn(
          "Updating mismatched session to match requested session: %o",
          updatedSession
        )
        const updateSessionEvent: RealtimeClientEventSessionUpdate = {
          type: "session.update",
          session: updatedSession,
        }
        client.sendClientEvent(updateSessionEvent)
      }
    },
    "session.updated": (client, event) => {
      const sessionEvent = event as RealtimeServerEventSessionUpdated
      client.session = sessionEvent.session
      log.debug("session.updated:", sessionEvent.session)
      client.emit("sessionUpdated", sessionEvent.session)
    },
    "conversation.item.created": (client, event) => {
      const conversationEvent =
        event as RealtimeServerEventConversationItemCreated
      log.debug("Conversation Item Received:", conversationEvent.item)
      client.conversation.push(conversationEvent.item)
      client.emit("conversationChanged", client.conversation)
    },
    "response.audio_transcript.delta": (client, event) => {
      const deltaEvent =
        event as RealtimeServerEventResponseAudioTranscriptDelta
      const { foundContent, foundItem } = findConversationItemContent(
        { log },
        client.conversation,
        deltaEvent.item_id,
        deltaEvent.content_index,
        deltaEvent
      )
      if (!foundItem) {
        // error was logged in findConversationItemContent
        return
      }
      if (!foundContent) {
        log.debug(
          `${event.type} Patching in NEW content item for audio transcript`
        )
        if (!foundItem.content) {
          foundItem.content = []
        }
        foundItem.content.push({
          type: "input_audio",
          transcript: deltaEvent.delta,
        })
      } else {
        if (foundContent.type !== "input_audio") {
          log.error(
            `${event.type} Unexpected content type ${foundContent.type} for audio transcript`
          )
          return
        }
        log.debug(
          `${event.type} Patching transcript into foundContent: transcript: %s, foundContent: %o`,
          deltaEvent.delta,
          foundContent
        )
        foundContent.transcript += deltaEvent.delta
      }
      client.emit("conversationChanged", client.conversation)
    },
    "response.text.delta": (client, event) => {
      log.error(
        `${event.type} TODO: Need to handle event to support text streaming.`
      )
      // TODO: use these to stream the messages: https://platform.openai.com/docs/api-reference/realtime-server-events/response/text/delta & https://platform.openai.com/docs/api-reference/realtime-server-events/response/audio_transcript/delta
    },
    "response.done": (client, event) => {
      const responseEvent = event as RealtimeServerEventResponseDone

      // https://platform.openai.com/docs/api-reference/realtime-server-events/response/done
      // for each response content item, find the conversation item patch it up:
      const response = responseEvent.response
      if (!response.output) {
        log.error("No output in response.done")
        return
      }
      for (const output of response.output) {
        if (output.type != "message") {
          // function?
          log.error(`Unexpected output type ${output.type} in response.done`)
          continue
        }
        if (!output.content) {
          log.error("No content in output in response.done")
          continue
        }
        const conversationItem = findConversationItem(
          { log },
          client.conversation,
          output.id!,
          event
        )
        if (!conversationItem) {
          // TODO: findConversationItem already logged an error, we should probably pass in a value that tells it not to log
          // no existing item is there, for some reason maybe we missed it in the stream somehow? We'll just add it:
          log.debug("response.done: Adding new conversation item:", output)
          client.conversation.push(output)
          client.emit("conversationChanged", client.conversation)
          continue
        }
        // TODO: we probably need to handle this better. Probably we need to overwrite the existing item with this new one since it is now "done".
        // patch up the conversation item with the provided output:
        if (!conversationItem.content) {
          conversationItem.content = []
        }
        for (const outputItem of output.content) {
          log.debug("Patching up conversation item:", conversationItem)
          conversationItem.content.push(outputItem)
        }
        // force update the conversation state:
        client.emit("conversationChanged", client.conversation)
      }
    },
    "response.audio_transcript.done": (client, event) => {
      patchConversationItemWithCompletedTranscript(
        { log },
        client.conversation,
        event as RealtimeServerEventResponseAudioTranscriptDone
      )
      client.emit("conversationChanged", client.conversation)
    },
    "conversation.item.input_audio_transcription.completed": (
      client,
      event
    ) => {
      patchConversationItemWithCompletedTranscript(
        { log },
        client.conversation,
        event as RealtimeServerEventResponseAudioTranscriptDone
      )
      client.emit("conversationChanged", client.conversation)
    },
  }
}

type RealtimeClientServerEventHandler = (
  client: RealtimeClient,
  event: RealtimeServerEvent
) => void
