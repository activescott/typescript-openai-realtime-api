import { ReactNode } from "react"
import { BootstrapIcon } from "./BootstrapIcon"
import { EventList } from "./EventList"

interface RealtimeSessionViewProps {
  startSession: () => Promise<void>
  stopSession: () => Promise<void>
  sessionStatus: "unavailable" | "stopped" | "recording"
  events: any[]
}
export function RealtimeSessionView({
  startSession,
  stopSession,
  sessionStatus,
  events,
}: RealtimeSessionViewProps): ReactNode {
  return (
    <div>
      <ul className="nav gap-2 mt-3">
        <li className="nav-item">
          <div className="d-flex align-items-center gap-1">
            {sessionStatus === "recording" && (
              <div
                className="spinner-grow text-danger align-text-bottom"
                role="status"
              >
                <span className="visually-hidden">Recording...</span>
              </div>
            )}
            <button
              className="record-button btn btn-sm btn-primary"
              type="button"
              disabled={sessionStatus !== "stopped"}
              onClick={async () => {
                await startSession()
              }}
            >
              <BootstrapIcon name="record" size={24} />
            </button>
          </div>
        </li>
        <li className="nav-item">
          <button
            className="stop-button btn btn-sm btn-secondary"
            type="button"
            disabled={sessionStatus !== "recording"}
            onClick={async () => {
              await stopSession()
            }}
          >
            <BootstrapIcon name="stop" size={24} />
          </button>
        </li>
      </ul>

      <h2>Events:</h2>
      <EventList events={events} />
    </div>
  )
}
