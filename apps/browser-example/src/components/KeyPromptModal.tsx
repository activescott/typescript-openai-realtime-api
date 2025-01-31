import { ReactNode, useState } from "react"

interface Props {
  onKeySaved: (key: string) => void
  onCanceled?: () => void
}

export function KeyRequestModal(props: Props): ReactNode {
  const { onKeySaved, onCanceled } = { onCanceled: () => {}, ...props }
  const [key, setKey] = useState("")

  return (
    <div
      className="modal fade show d-block"
      id="exampleModal"
      tabIndex={-1}
      aria-labelledby="exampleModalLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h1 className="modal-title fs-5" id="exampleModalLabel">
              API Key
            </h1>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
              onClick={onCanceled}
            ></button>
          </div>
          <div className="modal-body text-start">
            <p>
              Paste an OpenAI API key below to try the Realtime API. It is only
              ever saved in your browser and then sent to OpenAI.
            </p>
            <input
              type="password"
              className="form-control"
              value={key}
              onChange={(e) => setKey(e.currentTarget.value)}
            />
            <small>
              To get an API key, go to{" "}
              <a href="https://platform.openai.com/settings/" target="_blank">
                https://platform.openai.com/settings/
              </a>{" "}
              and look for <em>API keys</em> in the navigation.
            </small>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              data-bs-dismiss="modal"
              onClick={onCanceled}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onKeySaved(key)}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
