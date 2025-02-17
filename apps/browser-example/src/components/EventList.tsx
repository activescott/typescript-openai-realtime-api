import { useState, useRef, useEffect } from "react"

export function EventList({ events }: { events: any[] }) {
  const [showFilter, setShowFilter] = useState(false)
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])

  const lastEventRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (lastEventRef.current) {
      lastEventRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [events, lastEventRef, lastEventRef.current])

  useEffect(() => {
    const existingTypes = eventTypes

    const distinctTypes = events
      .map((event) => event.type)
      .filter((type, i, arr) => arr.indexOf(type) === i)

    const newTypes = distinctTypes.filter(
      (type) => !existingTypes.includes(type)
    )

    setEventTypes(distinctTypes)

    if (selectedEventTypes.length === 0) {
      setSelectedEventTypes(distinctTypes)
    }
    if (newTypes.length > 0) {
      setSelectedEventTypes((selectedEventTypes) => [
        ...selectedEventTypes,
        ...newTypes,
      ])
    }
  }, [events])

  function saveEvents() {
    const blob = new Blob([JSON.stringify(events, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    a.download = `events-${timestamp}.json`
    a.click()
  }

  return (
    <div className="card my-2">
      <div className="card-header d-flex gap-2">
        <div className="dropdown">
          <button
            type="button"
            className="btn btn-primary dropdown-toggle"
            aria-expanded={showFilter}
            data-bs-auto-close="outside"
            onClick={() => setShowFilter(!showFilter)}
          >
            Filter
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => saveEvents()}
          >
            Save Events to File
          </button>
          <span className="mx-2">Event Count: {events.length}</span>

          <form
            className={`dropdown-menu p-4 ${showFilter ? "show" : ""}`}
            style={{
              /* > --bs-backdrop-zindex */
              zIndex: 2000,
            }}
          >
            <div className="mb-3 d-flex gap-2 justify-content-center">
              <a
                className="form-control btn btn-link"
                onClick={() => setSelectedEventTypes(eventTypes)}
              >
                All
              </a>
              <a
                className="form-control btn btn-link"
                onClick={() => setSelectedEventTypes([])}
              >
                None
              </a>
            </div>

            <div className="mb-3">
              {eventTypes.map((eventType, i) => (
                <div className="form-check" key={i}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={`filter-${eventType}`}
                    checked={selectedEventTypes.includes(eventType)}
                    onChange={() => {
                      setSelectedEventTypes((selectedEventTypes) =>
                        selectedEventTypes.includes(eventType)
                          ? selectedEventTypes.filter((t) => t !== eventType)
                          : [...selectedEventTypes, eventType]
                      )
                    }}
                  />
                  <label
                    className="form-check-label"
                    htmlFor={`filter-${eventType}`}
                  >
                    {eventType}
                  </label>
                </div>
              ))}
            </div>
          </form>
          <div
            className={`modal-backdrop fade ${showFilter ? "show" : "d-none"}`}
            onClick={() => setShowFilter(!showFilter)}
            style={{ backgroundColor: "rgba(0, 0, 0, 0.01)" }}
          ></div>
        </div>
      </div>
      <div
        className="card-body"
        style={{
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        {events
          .filter((event) => selectedEventTypes.includes(event.type))
          .map((event, i) => (
            <div
              ref={lastEventRef}
              key={i}
              className="alert alert-info"
              role="alert"
            >
              <pre>{JSON.stringify(event, null, 2)}</pre>
            </div>
          ))}
      </div>
    </div>
  )
}
