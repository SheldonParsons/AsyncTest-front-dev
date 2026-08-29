import {
  CODE,
  HEADING,
  ORDERED_LIST,
  QUOTE,
  UNORDERED_LIST,
  type Transformer,
} from '@lexical/markdown'

/**
 * The small, block-oriented Markdown dialect used by the chat composer.
 * Keeping this list explicit avoids enabling inline formatting/link parsing
 * until the composer has a deliberate UX for those rules.
 */
export const CHAT_MARKDOWN_TRANSFORMERS: Transformer[] = [
  HEADING,
  UNORDERED_LIST,
  ORDERED_LIST,
  QUOTE,
  CODE,
]
