import { useCallback, useState } from "react"
import { OpenAIRealtimeWebSocket } from "openai/beta/realtime/websocket"
import OpenAI from "openai"
import {
  RealtimeSessionView,
  StartSessionOptions,
} from "../components/RealtimeSessionView"
import { PageProps } from "./props"

export function OfficialSDKWebSocketExample({
  apiKey,
  sessionStatus,
  onSessionStatusChanged,
}: PageProps) {
  const [client, setClient] = useState<OpenAIRealtimeWebSocket | undefined>(
    undefined
  )
  const [events, setEvents] = useState<any[]>([])

  const startSession = useCallback(async function startSession({
    sessionRequest,
  }: StartSessionOptions): Promise<void> {
    const oaiClient = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
    const client = new OpenAIRealtimeWebSocket(
      {
        model: sessionRequest.model,
        dangerouslyAllowBrowser: true,
      },
      oaiClient
    )
    setClient(client)

    client.on("event", (event) => {
      console.log("client.on event", event)
      setEvents((events) => [...events, event])
    })

    // kick things off when the socket opens:
    client.socket.addEventListener("open", () => {
      console.log("Connection opened!")

      client.send({
        type: "session.update",
        session: {
          ...sessionRequest,
          // NOTE: OpenAI's OpenAPI types have a bit of a mismatch here
          modalities: sessionRequest.modalities as ("audio" | "text")[],
        },
      })

      client.send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "Tell me something!" }],
        },
      })

      client.send({ type: "response.create" })
    })

    onSessionStatusChanged("recording")
  },
  [])

  async function stopSession() {
    if (!client) {
      throw new Error("no client")
    }
    client.socket.close()
    setClient(undefined)
    onSessionStatusChanged("stopped")
  }

  return (
    <div className="container">
      <h1>Official SDK WebSocket Example</h1>
      <p>
        This example demonstrates the Official OpenAI SDK's WebSocket client. It
        does not go to the trouble of decoding the audio streams and hooking
        them up to the browser. So you only see the data events. To experience
        the streaming audio with a back-and-forth conversation, see the WebRTC
        Example.
      </p>
      <RealtimeSessionView
        startSession={startSession}
        stopSession={stopSession}
        sessionStatus={sessionStatus}
        events={events}
      />
    </div>
  )
}
