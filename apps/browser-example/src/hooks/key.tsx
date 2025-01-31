import { ReactNode, useEffect, useState } from "react"
import { KeyRequestModal } from "../components/KeyPromptModal"
import { BootstrapIcon } from "../components/BootstrapIcon"

export function useKeyManager(): {
  key: string | undefined
  KeyModal: ReactNode
  EnterKeyButton: ReactNode
} {
  const [key, setKey] = useState<string | undefined>(undefined)
  const [showModal, setShowModal] = useState(key === undefined)

  useEffect(() => {
    if (key !== undefined) return
    const storedKey = loadKeyFromBrowser()
    if (storedKey) {
      setKey(storedKey)
      setShowModal(false)
    }
  }, [])

  const EnterKeyButton = (
    <button
      className="btn btn-outline-success d-flex align-items-center gap-1"
      type="button"
      onClick={() => setShowModal(true)}
    >
      <BootstrapIcon name="gear" />
      <span>{key ? "✅" : "❌"}</span>
      Enter API Key
    </button>
  )

  const KeyModal = showModal ? (
    <KeyRequestModal
      onKeySaved={(key) => {
        setKey(key)
        saveKeyToBrowser(key)
        setShowModal(false)
      }}
      onCanceled={() => setShowModal(false)}
    />
  ) : (
    <></>
  )
  return { key, KeyModal, EnterKeyButton }
}

const OPENAI_API_KEY_NAME = "OPENAI_API_KEY"
function saveKeyToBrowser(key: string) {
  console.debug(`Saved key to browser with length ${key.length}`)
  document.cookie = `${OPENAI_API_KEY_NAME}=${encodeURIComponent(
    key
  )}; max-age=${60 * 60 * 24 * 30}; SameSite=Strict; Secure`
}

function loadKeyFromBrowser(): string | undefined {
  const cookie = document.cookie
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${OPENAI_API_KEY_NAME}=`))

  const key = cookie?.split("=")[1]
  console.debug(`Loaded key from browser with length ${key?.length ?? 0}`)
  return key
}
