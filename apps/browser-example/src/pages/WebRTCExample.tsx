import { ReactNode, useCallback, useRef, useState } from "react"
import { RealtimeSessionView } from "../components/RealtimeSessionView"
import { RealtimeClient } from "@tsorta/browser/WebRTC"
import { PageProps } from "./props"

export function WebRTCExample({
  apiKey,
  sessionStatus,
  onSessionStatusChanged,
  events,
  onServerEvent,
}: PageProps): ReactNode {
  const audioElementRef = useRef<HTMLAudioElement>(null)

  const [client, setClient] = useState<RealtimeClient | undefined>(undefined)

  const startSession = useCallback(
    async function startSession(): Promise<void> {
      if (!apiKey) {
        throw new Error("API key is required")
      }
      if (!audioElementRef?.current) {
        throw new Error("Audio element not found")
      }

      const client = new RealtimeClient(
        navigator,
        () => apiKey,
        audioElementRef.current,
        { model: "gpt-4o-realtime-preview-2024-12-17" }
      )
      setClient(client)

      client.addEventListener("serverEvent", (event) => {
        onServerEvent(event)
      })
      await client.start()

      onSessionStatusChanged("recording")
    },
    [apiKey, audioElementRef, onServerEvent, onSessionStatusChanged, navigator]
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
