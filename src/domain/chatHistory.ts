import type { ChichiState } from "./types";

export interface ChatHistoryEntry {
  id: string;
  message: string;
  previousState: ChichiState;
  nextState: ChichiState;
  canUndo: boolean;
  undone: boolean;
}

interface CreateChatHistoryEntryInput {
  message: string;
  previousState: ChichiState;
  nextState: ChichiState;
}

export function createChatHistoryEntry({ message, previousState, nextState }: CreateChatHistoryEntryInput): ChatHistoryEntry {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    message,
    previousState,
    nextState,
    canUndo: true,
    undone: false
  };
}

export function restoreChatHistoryEntry(entry: ChatHistoryEntry): ChichiState {
  return entry.previousState;
}
