import { type ReactNode, useRef, useEffect } from "react"
import { debounce } from "lodash-es"
import type {
  RealtimeConversationItem,
  RealtimeConversationItemContent,
} from "@tsorta/browser/openai"
import { DefinedRole, simplifyItem } from "./simpleConversation"

const log = console

export interface ConversationProps {
  conversation: RealtimeConversationItem[]
}

export const ConversationView = ({
  conversation,
}: ConversationProps): ReactNode => {
  return (
    <div className="conversation d-flex flex-column overflow-y-scroll flex-grow-1">
      {conversation
        .filter((item) => item.role !== "system")
        .map((item, index, arr) => (
          <ConversationItem
            key={item.id}
            item={item}
            doScrollIntoView={index === arr.length - 1}
          />
        ))}
    </div>
  )
}

const RoleBgColorMap: Record<DefinedRole, string> = {
  user: "bg-primary-subtle",
  assistant: "bg-secondary-subtle",
  system: "bg-secondary",
}
const RoleTextColorMap: Record<DefinedRole, string> = {
  user: "text-primary",
  assistant: "text-secondary",
  system: "text-secondary",
}
const RoleLabelMap: Record<DefinedRole, string> = {
  user: "You",
  assistant: "Assistant",
  system: "System",
}

interface ConversationItemProps {
  item: RealtimeConversationItem
  doScrollIntoView: boolean
}

const ConversationItem = ({
  item,
  doScrollIntoView,
}: ConversationItemProps): ReactNode => {
  const simpleItem = simplifyItem(item)
  const { id, role, content } = simpleItem
  const alignClass = role === "user" ? "align-self-end" : "align-self-start"

  const divRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const executeScroll = () => {
      // behavior: smooth works fine on FF+macOS, but not on Chrome+macOS, so we detect and force "instant" on chrome
      const behavior = /Chrome/.test(navigator.userAgent) ? "instant" : "smooth"
      divRef.current?.scrollIntoView({
        behavior,
        block: "end",
        inline: "nearest",
      })
    }

    if (doScrollIntoView) {
      debounce(executeScroll, 500)()
    }
  }, [item, doScrollIntoView, item.content, simpleItem.content.length])

  return (
    <div
      className={`conversation-item ${alignClass}`}
      style={{ maxWidth: "60%" }}
      ref={divRef}
    >
      <div className="attribution mx-8 mb-1 mt-6 text-xs text-gray-500 text-muted">
        <small>{RoleLabelMap[role]}</small>
      </div>

      <div
        key={id}
        className={`mb-5 ${RoleBgColorMap[role]} ${RoleTextColorMap[role]}`}
        style={{ padding: "1.5rem 1.5rem", borderRadius: "5rem" }}
      >
        <div className="my-content">
          {content.map((contentItem, index) => (
            <ConversationItemContent
              key={index}
              content={contentItem}
              doScrollIntoView={doScrollIntoView}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface ConversationItemContentProps {
  content: RealtimeConversationItemContent
  doScrollIntoView: boolean
}

const ConversationItemContent = ({
  content,
}: ConversationItemContentProps): ReactNode => {
  if (!["text", "input_text", "input_audio"].includes(content.type)) {
    // NOTE: we find content.type="audio" coming in here in logging though it is not in the types!
    if ((content.type as string) !== "audio") {
      log.warn(
        `Unexpected type for RealtimeConversationItemContent '${content.type}'. Will not be rendered: %o`,
        content
      )
    }
    return null
  }

  return (
    <div className={`item-content item-type-${content.type}`}>
      {(content.type == "text" || content.type == "input_text") && (
        <span>{content.text}</span>
      )}
      {content.type == "input_audio" && (
        <span className="input_audio transcript">
          {content.transcript ? content.transcript : "..."}
        </span>
      )}
    </div>
  )
}
