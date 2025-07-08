/**
 * DevBuddy Application Types
 * Contains type definitions for chat history, file management, and global state
 */

/**
 * Message object representing a chat message
 */
export interface Message {
  id: string; // Unique identifier for the message
  role: "user" | "assistant"; // Who sent the message
  content: string; // Content of the message
}

/**
 * File representation in the editor
 */
export interface FileItem {
  path: string; // File path (relative to project root)
  content: string; // File contents
}

/**
 * Tab representation in the editor
 */
export interface FileTab {
  path: string; // Full file path
  name: string; // Display name for the tab
  isDirty?: boolean; // Whether the file has unsaved changes
}

/**
 * Chat session representation
 */
export interface Chat {
  id: string; // Unique identifier for the chat
  name: string; // Display name for the chat (derived from first prompt)
  timestamp: Date; // When the chat was created/updated
  messages: Message[]; // Chat messages
  projectFiles: FileItem[]; // Files in the project
}

/**
 * Global window interface extension for DevBuddy state
 */
declare global {
  interface Window {
    devBuddyState?: {
      chats: Chat[]; // All chats
      startNewChat: () => void; // Create a new chat
      switchToChat: (chatId: string) => void; // Switch to existing chat
    };
  }
}
