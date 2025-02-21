import { ReactNode, useCallback, useRef, useState } from "react"
import {
  RealtimeSessionView,
  StartSessionOptions,
} from "../components/RealtimeSessionView"
import { RealtimeClient } from "@tsorta/browser/WebRTC"
import { PageProps } from "./props"
import { RealtimeConversationItem } from "@tsorta/browser/openai"

export function WebRTCExample({
  apiKey,
  sessionStatus,
  onSessionStatusChanged,
}: PageProps): ReactNode {
  const audioElementRef = useRef<HTMLAudioElement>(null)

  const [client, setClient] = useState<RealtimeClient | undefined>(undefined)
  const [events, setEvents] = useState<any[]>([])
  const [conversation, setConversation] = useState<RealtimeConversationItem[]>(
    []
  )

  const startSession = useCallback(
    async function startSession({
      sessionRequest,
    }: StartSessionOptions): Promise<void> {
      if (!apiKey) {
        throw new Error("API key is required")
      }
      if (!audioElementRef?.current) {
        throw new Error("Audio element not found")
      }

      console.debug("Starting session with request", {
        sessionRequest,
      })

      const client = new RealtimeClient(
        navigator,
        // @ts-expect-error TS6133: 'sessionRequested' is declared but its value is never read.
        ({ sessionRequested }) => {
          // NOTE: For the sake of the example, we're using a "real" OpenAI API
          //   key rather than a Realtime API Session ephemeral key, as you
          //   should do in a production app. So this sessionRequested argument
          //   isn't useful in the example, but in a production app you can use
          //   it to request a session with the these parameters.
          return apiKey
        },
        audioElementRef.current,
        sessionRequest
      )
      setClient(client)

      client.addEventListener("serverEvent", (event) => {
        console.debug("serverEvent event:", event)
        setEvents((events) => [...events, event.event])
      })

      client.addEventListener("conversationChanged", (event) => {
        console.debug("conversationChanged event:", event.conversation)
        setConversation(event.conversation)
      })

      await client.start()

      onSessionStatusChanged("recording")
    },
    [apiKey, audioElementRef, onSessionStatusChanged, navigator]
  )

  const stopSession = useCallback(
    async function stopSession(): Promise<void> {
      await client?.stop()
      onSessionStatusChanged("stopped")
    },
    [client, onSessionStatusChanged]
  )

  return (
    <div className="container">
      <h1>WebRTC Example</h1>
      <p>
        This example demonstrates how to use the OpenAI Realtime API directly.
        It is using the TypeScript client from the article{" "}
        <a href="https://scott.willeke.com/ai-typescript-client-for-openai-realtime-api">
          AI Learns to Listen: TypeScript Client for OpenAI's Realtime API
        </a>{" "}
        by Scott Willeke.
      </p>
      <audio ref={audioElementRef}></audio>

      <RealtimeSessionView
        startSession={startSession}
        stopSession={stopSession}
        sessionStatus={sessionStatus}
        events={events}
      />
    </div>
  )
}
