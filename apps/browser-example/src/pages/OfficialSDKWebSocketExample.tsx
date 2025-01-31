import { useState } from "react"
import { OpenAIRealtimeWebSocket } from "openai/beta/realtime/websocket"
import OpenAI from "openai"
import { RealtimeSessionView } from "../components/RealtimeSessionView"
import { PageProps } from "./props"

const model = "gpt-4o-realtime-preview-2024-12-17"

export function OfficialSDKWebSocketExample({
  apiKey,
  sessionStatus,
  onSessionStatusChanged,
  events,
  onServerEvent,
}: PageProps) {
  const [client, setClient] = useState<OpenAIRealtimeWebSocket | undefined>(
    undefined
  )

  async function startSession(): Promise<void> {
    const oaiClient = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
    const client = new OpenAIRealtimeWebSocket(
      {
        model,
        dangerouslyAllowBrowser: true,
      },
      oaiClient
    )
    setClient(client)

    // listen:
    client.on("event", onServerEvent)

    // kick things off when the socket opens:
    client.socket.addEventListener("open", () => {
      console.log("Connection opened!")

      /*
      // not strictly necessary
      client.send({
        type: "session.update",
        session: {
          modalities: ["text"],
          model: "gpt-4o-realtime-preview",
        },
      })*/

      client.send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "Say a couple paragraphs!" }],
        },
      })

      client.send({ type: "response.create" })
    })

    client.on("event", (event) => {
      onServerEvent(event)
    })

    onSessionStatusChanged("recording")
  }

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
