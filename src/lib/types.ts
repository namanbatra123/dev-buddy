export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface FileItem {
  path: string;
  content: string;
}

export interface FileTab {
  path: string;
  name: string;
  isDirty?: boolean;
}

export interface Chat {
  id: string;
  name: string;
  timestamp: Date;
  messages: Message[];
  projectFiles: FileItem[];
}

declare global {
  interface Window {
    devBuddyState?: {
      chats: Chat[];
      startNewChat: () => void;
      switchToChat: (chatId: string) => void;
      deleteChat: (chatId: string) => void;
    };
  }
}
