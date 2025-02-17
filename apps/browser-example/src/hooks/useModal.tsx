import { type ReactNode, useState } from "react"

interface ModalProps {
  children: ReactNode
  title: string
  primaryButtonText: string
  cancelButtonText?: string
  onPrimaryButtonClicked: () => void
  onCanceled?: () => void
  backgroundStyle?: "danger" | "primary"
}

interface UseModalProps extends ModalProps {}

interface UseModalResult {
  Modal: ReactNode
  showModal(): void
  hideModal(): void
}

export function useModal(options: UseModalProps): UseModalResult {
  const [showModal, setShowModal] = useState(false)
  const componentOptions = { ...options, setShowModal }

  return {
    Modal: showModal ? <ModalComponent {...componentOptions} /> : <></>,
    showModal: () => setShowModal(true),
    hideModal: () => setShowModal(false),
  }
}

function ModalComponent(
  options: ModalProps & { setShowModal: (show: boolean) => void }
): ReactNode {
  const defaultOptions = {
    onCanceled: () => {},
    cancelButtonText: "Cancel",
    backgroundStyle: "primary",
  }
  const {
    children,
    title,
    onCanceled,
    backgroundStyle,
    cancelButtonText,
    primaryButtonText,
    onPrimaryButtonClicked,
    setShowModal,
  } = {
    ...defaultOptions,
    ...options,
  }
  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      aria-labelledby="modalLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className={`modal-header bg-${backgroundStyle} text-white`}>
            <h5 className="modal-title" id="modalLabel">
              {title}
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              data-bs-dismiss="modal"
              aria-label="Close"
              onClick={() => {
                setShowModal(false)
                onCanceled()
              }}
            ></button>
          </div>
          <div className="modal-body">{children}</div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowModal(false)
                onCanceled()
              }}
            >
              {cancelButtonText}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setShowModal(false)
                onPrimaryButtonClicked()
              }}
            >
              {primaryButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
