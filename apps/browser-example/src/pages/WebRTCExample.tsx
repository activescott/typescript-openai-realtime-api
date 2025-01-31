import { ReactNode, useRef, useState } from "react"
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
    client.on("event", onServerEvent)
    setClient(client)
    await client.start()
    onSessionStatusChanged("recording")
  }

  async function stopSession(): Promise<void> {
    await client?.stop()
    onSessionStatusChanged("stopped")
  }

  return (
    <div className="container">
      <h1>WebRTC Example</h1>
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
