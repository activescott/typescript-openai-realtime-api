import {
  RealtimeConversationItem,
  RealtimeConversationItemContent,
} from "@tsorta/browser/openai"

/** Removes the possibility of `undefined` in @see RealtimeConversationItem.role. */
export type DefinedRole = NonNullable<RealtimeConversationItem["role"]>

/** Removes the possibility of `undefined` in @see RealtimeConversationItem.type. */
type DefinedRealtimeConversationItemType = NonNullable<
  RealtimeConversationItem["type"]
>

/**
 * A simplified form of @see RealtimeConversationItem for rendering.
 */
export type RealtimeConversationItemSimple = Pick<
  RealtimeConversationItem,
  "id"
> & {
  role: DefinedRole
  type: DefinedRealtimeConversationItemType
  content: RealtimeConversationItemContent[]
}

/**
 * Simplifies the @see RealtimeConversationItem for rendering purposes. Mostly removes the possibility of `undefined` values in places where they are unlikely (impossible) at render time.
 */
export function simplifyItem(
  item: RealtimeConversationItem
): RealtimeConversationItemSimple {
  if (!item.role) {
    throw new Error("Role missing in conversation item")
  }
  const role: DefinedRole = item.role
  const id = item.id || "id-missing"
  const type = item.type as DefinedRealtimeConversationItemType
  // NOTE: There may be no contents on the initial creation while the model is still replying.
  const content: RealtimeConversationItemContent[] = (item.content ||
    []) as RealtimeConversationItemContent[]

  return { id, type, role, content }
}
