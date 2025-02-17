import { ReactNode, useEffect, useState } from "react"
import { BootstrapIcon } from "./components/BootstrapIcon"
import { useKeyManager } from "./hooks/key"
import { OfficialSDKWebSocketExample } from "./pages/OfficialSDKWebSocketExample"
import { WebRTCExample } from "./pages/WebRTCExample"
import { PageProps } from "./pages/props"

export function App() {
  const { key, KeyModal, EnterKeyButton } = useKeyManager()
  const [sessionStatus, setSessionStatus] = useState<
    "unavailable" | "stopped" | "recording"
  >(key ? "stopped" : "unavailable")

  useEffect(() => {
    if (key && sessionStatus === "unavailable") {
      setSessionStatus("stopped")
    }
  }, [key])

  const [routes] = useState({
    WebRTC: {
      label: "WebRTC Example",
      page: (props: PageProps) => <WebRTCExample {...props} />,
    },
    "official-ws": {
      label: "Official SDK WebSocket Example",
      page: (props: PageProps) => {
        return <OfficialSDKWebSocketExample {...props} />
      },
    },
  })
  const [activeRoute, setActiveRoute] = useState<keyof typeof routes>("WebRTC")

  return (
    <>
      <header>
        <nav className="navbar bg-body-tertiary">
          <div className="container-fluid">
            <a className="navbar-brand">TypeScript OpenAI Realtime Example</a>
            <ul className="nav nav-pills gap-2">
              {Object.keys(routes)
                .map((routeKey) => routeKey as keyof typeof routes)
                .map((routeKey) => ({ routeKey, ...routes[routeKey] }))
                .map((route) => (
                  <LoadPageButton
                    key={route.routeKey}
                    route={route.routeKey}
                    activeRoute={activeRoute}
                    label={route.label}
                    onNavigate={(route) => {
                      setActiveRoute(route)
                    }}
                  />
                ))}
            </ul>
            <div className="spacer flex-grow-1"></div>
            {EnterKeyButton}
          </div>
        </nav>
        {KeyModal}
      </header>
      <main>
        {routes[activeRoute].page({
          apiKey: key,
          sessionStatus,
          onSessionStatusChanged: (status) => {
            setSessionStatus(status)
          },
        })}
      </main>
    </>
  )
}

function LoadPageButton<TRoute>({
  label,
  route,
  activeRoute,
  onNavigate,
}: {
  label: string
  route: TRoute
  activeRoute: TRoute
  onNavigate: (route: TRoute) => void
}): ReactNode {
  return (
    <li className={`nav-item`}>
      <a
        className={`nav-link ${route === activeRoute ? "active" : ""}`}
        type="button"
        onClick={() => onNavigate(route)}
        aria-current={route === activeRoute ? "page" : "false"}
      >
        <BootstrapIcon name="arrow" />
        {label}
      </a>
    </li>
  )
}
