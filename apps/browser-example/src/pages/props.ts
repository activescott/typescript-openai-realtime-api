export interface PageProps {
  apiKey: string | undefined
  sessionStatus: "unavailable" | "stopped" | "recording"
  onSessionStatusChanged: (
    status: "unavailable" | "stopped" | "recording"
  ) => void
}
