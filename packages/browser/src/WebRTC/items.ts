import { Logger } from "../log"
import type {
  RealtimeConversationItem,
  RealtimeConversationItemContent,
  RealtimeServerEventWithCompletedTranscript,
} from "../openai"

/**
 * Finds the specified item in a conversation.
 * @param conversation The existing conversation to search
 * @param item_id The item id of the conversation item sought.
 * @param forEvent The event that the item is being sought for used for logging).
 * @returns The conversation item with the given item_id or undefined if not found.
 */
export function findConversationItem(
  context: { log: Logger },
  conversation: RealtimeConversationItem[],
  item_id: string,
  forEvent: {
    type: string
    event_id: string
  },
): RealtimeConversationItem | undefined {
  // get conversation item:
  const found = conversation.find((convItem) => {
    return convItem.id == item_id
  })
  if (!found) {
    context.log.error(
      `No conversation item ${item_id} found for event ${forEvent.type} with id ${forEvent.event_id}. Existing conversation searched: ${conversation} (${conversation.length} items)`,
    )
    return undefined
  }
  return found
}

/**
 * Finds the specified content item in a conversation item.
 * @param conversation The existing conversation to search
 * @param item_id The item id of the conversation item sought.
 * @param content_index The index of the content item sought.
 * @param forEvent The event that the item is being sought for used for logging).
 * @returns The conversation item content with the given item_id and content_index or undefined if not found.
 */
export function findConversationItemContent(
  context: { log: Logger },
  conversation: RealtimeConversationItem[],
  item_id: string,
  content_index: number,
  forEvent: {
    type: string
    event_id: string
  },
): {
  foundItem: RealtimeConversationItem | undefined
  foundContent: RealtimeConversationItemContent | undefined
} {
  const foundItem = findConversationItem(
    context,
    conversation,
    item_id,
    forEvent,
  )
  if (!foundItem) {
    return { foundItem, foundContent: undefined }
  }
  if (!foundItem.content) {
    context.log.error(
      `Conversation item ${foundItem.id} has no content at index ${content_index}.`,
    )
    return { foundItem, foundContent: undefined }
  }
  const foundContent = foundItem.content[
    content_index
  ] as RealtimeConversationItemContent
  return { foundItem, foundContent }
}

export function patchConversationItemWithCompletedTranscript(
  context: { log: Logger },
  existingConversation: RealtimeConversationItem[],
  audioEvent: RealtimeServerEventWithCompletedTranscript,
): void {
  // get conversation item & content:
  const { foundItem, foundContent } = findConversationItemContent(
    context,
    existingConversation,
    audioEvent.item_id,
    audioEvent.content_index,
    audioEvent,
  )
  if (!foundItem) {
    // error was logged in findConversationItemContent
    return
  }

  if (!foundContent) {
    // add it:
    if (!foundItem.content) {
      foundItem.content = []
    }
    foundItem.content.push({
      type: "input_audio",
      transcript: audioEvent.transcript,
    })
    return
  }
  // content exists, update it:
  if (foundContent.type !== "input_audio") {
    // only this even has a transcript field
    context.log.error(
      `Unexpected content type ${foundContent.type} for audio transcript`,
    )
    return
  }
  foundContent.transcript = audioEvent.transcript
}
