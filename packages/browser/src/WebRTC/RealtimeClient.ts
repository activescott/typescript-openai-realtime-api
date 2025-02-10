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
import {
  findConversationItem,
  findConversationItemContent,
  patchConversationItemWithCompletedTranscript,
} from "./items"
import { TypedEventTarget } from "typescript-event-target"
import { secondsToMilliseconds } from "../duration"
import {
  RealtimeServerEventEvent,
  SessionCreatedEvent,
  SessionUpdatedEvent,
  ConversationChangedEvent,
  RecordedAudioChangedEvent,
  EventTargetListener,
  RealtimeClientEventMap,
} from "./events"

const log = console

interface RealtimeClientOptions {
  /**
   * The duration in milliseconds of each recorded audio chunk. This will also determine the frequency of the recordedAudioChanged event.
   */
  recordedAudioChunkDuration: number
  /**
   * The model to use for the Realtime API.
   */
  model: string
  /**
   * The base URL for the Realtime API.
   */
  baseUrl: string
}

const RealtimeClientDefaultOptions: RealtimeClientOptions = {
  recordedAudioChunkDuration: secondsToMilliseconds(1),
  model: "gpt-4o-realtime-preview-2024-12-17",
  baseUrl: "https://api.openai.com/v1/realtime",
}

/**
 * A TypeScript client for the OpenAI Realtime API using WebRTC in the browser.
 */
export class RealtimeClient {
  private peerConnection: RTCPeerConnection | undefined = undefined
  private localMediaStream: MediaStream | undefined = undefined
  private dataChannel: RTCDataChannel | undefined = undefined
  private mediaRecorder: MediaRecorder | undefined = undefined
  private audioChunks: Blob[] = []
  private conversation: RealtimeConversationItem[] = []
  // Session as received from the server in create/update
  private session: RealtimeSession | undefined = undefined

  // NOTE: We use EventTarget rather than EventEmitter because EventTarget is standardized in the Browser and has one in Node.js (https://nodejs.org/api/events.html#class-eventtarget). I'm also not extending EventTarget as I don't wan't to expose the full EventTarget (untyped) interface at this time. We may consider exposing it in the future
  private emitter = new TypedEventTarget<RealtimeClientEventMap>()
  private readonly recordedAudioChunkDuration: number
  private readonly model: string
  private readonly baseUrl: string

  /**
   * Create a new client.
   * @param getRealtimeEphemeralAPIKey This is a function that you should implement to return the Ephemeral OpenAI API key that is used to authenticate with the OpenAI Realtime API. It should be an ephemeral key as described at https://platform.openai.com/docs/guides/realtime-webrtc#creating-an-ephemeral-token. You will probably need to make a call to your server here to fetch the key.
   * @param sessionRequested The session parameters you want from the Realtime API. If these are found to be different it will re-request them to try to match this session.
   */
  constructor(
    private readonly navigator: Navigator,
    private readonly getRealtimeEphemeralAPIKey: () => Promise<string> | string,
    private readonly audioElement: HTMLAudioElement,
    private readonly sessionRequested: RealtimeSessionCreateRequest,
    options: Partial<RealtimeClientOptions> = RealtimeClientDefaultOptions
  ) {
    const opt = { ...RealtimeClientDefaultOptions, ...options }
    this.recordedAudioChunkDuration = opt.recordedAudioChunkDuration
    this.model = opt.model
    this.baseUrl = opt.baseUrl
  }

  /**
   * Adds an event listener for the specified event.
   * NOTE: This is compatible with the DOM @see EventTarget.addEventListener method, but more strictly typed.
   */
  public addEventListener<TEventName extends keyof RealtimeClientEventMap>(
    event: TEventName,
    listener: EventTargetListener<RealtimeClientEventMap[TEventName]>
  ): void {
    this.emitter.addEventListener(event, listener)
  }

  async start(): Promise<void> {
    // clear conversation for a new session...
    this.conversation = []

    // Create a peer connection
    try {
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
    } catch (err) {
      log.error("Failed to start RealtimeClient", err)
      // call stop to cleanup anything partially initialized
      await this.stop()
      throw err
    }
  }

  private async initializePeerConnection() {
    this.peerConnection = new RTCPeerConnection()

    // Set up to play remote audio from the model
    this.peerConnection.ontrack = (e) => {
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
    this.setRecordedAudio([])

    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        this.addRecordedAudio(event.data)
      }
    }

    // Record in small chunks for better handling
    this.mediaRecorder.start(this.recordedAudioChunkDuration)
  }

  private addRecordedAudio(...audioChunks: Blob[]) {
    this.audioChunks.push(...audioChunks)
    this.emitter.dispatchTypedEvent(
      "recordedAudioChanged",
      new RecordedAudioChangedEvent(this.audioChunks)
    )
  }

  private setRecordedAudio(audioChunks: Blob[]) {
    this.audioChunks = audioChunks
    this.emitter.dispatchTypedEvent(
      "recordedAudioChanged",
      new RecordedAudioChangedEvent(this.audioChunks)
    )
  }

  private async initializeSession() {
    if (!this.peerConnection) {
      throw new Error("No peer connection")
    }
    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)

    let apiKey: string
    try {
      apiKey = await this.getRealtimeEphemeralAPIKey()
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
      this.audioElement.muted = true
      this.audioElement.srcObject = null
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
      this.emitter.dispatchTypedEvent(
        "sessionUpdated",
        new SessionUpdatedEvent(this.session)
      )
    }
  }

  /**
   * Internal handler for server events from OpenAI Realtime API.
   */
  private receiveServerMessage(e: MessageEvent<any>) {
    const parsedEvent = JSON.parse(e.data) as RealtimeServerEvent

    this.processServerEvent(parsedEvent)

    this.emitter.dispatchTypedEvent(
      "serverEvent",
      new RealtimeServerEventEvent(parsedEvent)
    )
  }

  private processServerEvent(event: RealtimeServerEvent) {
    const handler = RealtimeClient.privateServerEventHandlers[event.type]
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

  /**
   * Returns the current hydrated conversation accumulated from the server events received from the Realtime API.
   */
  public getConversation(): RealtimeConversationItem[] {
    return this.conversation
  }

  /**
   * Indicates if recorded audio is available via @see getRecordedAudio.
   * @returns true if there is recorded audio available, false otherwise.
   */
  public hasRecordedAudioAvailable(): boolean {
    return this.audioChunks.length > 0
  }

  /**
   * Gets the recorded audio as a Blob.
   * @returns Promise that resolves with the audio Blob or null if no audio was recorded
   */
  public async getRecordedAudio(): Promise<Blob | null> {
    if (this.audioChunks.length === 0) {
      return null
    }
    // TODO: is this always the correct type? don't we need to check the source stream?
    return new Blob(this.audioChunks, { type: "audio/webm" })
  }

  // TODO: make these events provide typed events.
  private static privateServerEventHandlers: Partial<
    Record<RealtimeServerEvent["type"], RealtimeClientServerEventHandler>
  > = {
    "session.created": (client, event) => {
      // when a conversation is created, set the conversation state:
      const sessionEvent = event as RealtimeServerEventSessionCreated

      client.session = sessionEvent.session
      client.emitter.dispatchTypedEvent(
        "sessionCreated",
        new SessionCreatedEvent(sessionEvent.session)
      )

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
      client.emitter.dispatchTypedEvent(
        "sessionUpdated",
        new SessionUpdatedEvent(sessionEvent.session)
      )
    },
    "conversation.item.created": (client, event) => {
      const conversationEvent =
        event as RealtimeServerEventConversationItemCreated
      client.conversation.push(conversationEvent.item)
      client.emitter.dispatchTypedEvent(
        "conversationChanged",
        new ConversationChangedEvent(client.conversation)
      )
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
        foundContent.transcript += deltaEvent.delta
      }
      client.emitter.dispatchTypedEvent(
        "conversationChanged",
        new ConversationChangedEvent(client.conversation)
      )
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
          client.conversation.push(output)
          client.emitter.dispatchTypedEvent(
            "conversationChanged",
            new ConversationChangedEvent(client.conversation)
          )
          continue
        }
        // TODO: we probably need to handle this better. Probably we need to overwrite the existing item with this new one since it is now "done".
        // patch up the conversation item with the provided output:
        if (!conversationItem.content) {
          conversationItem.content = []
        }
        for (const outputItem of output.content) {
          conversationItem.content.push(outputItem)
        }
        // force update the conversation state:
        client.emitter.dispatchTypedEvent(
          "conversationChanged",
          new ConversationChangedEvent(client.conversation)
        )
      }
    },
    "response.audio_transcript.done": (client, event) => {
      patchConversationItemWithCompletedTranscript(
        { log },
        client.conversation,
        event as RealtimeServerEventResponseAudioTranscriptDone
      )
      client.emitter.dispatchTypedEvent(
        "conversationChanged",
        new ConversationChangedEvent(client.conversation)
      )
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
      client.emitter.dispatchTypedEvent(
        "conversationChanged",
        new ConversationChangedEvent(client.conversation)
      )
    },
  }
}

type RealtimeClientServerEventHandler = (
  client: RealtimeClient,
  event: RealtimeServerEvent
) => void
