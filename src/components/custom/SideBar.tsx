"use client";

import { Button } from "@/components/ui/button";
import { MessageSquarePlus, Search, Menu, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Chat } from "@/lib/types";
import { logger } from "@/lib/logger";

export default function Sidebar({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      if (window.devBuddyState?.chats) {
        setChats(window.devBuddyState.chats);
        setIsLoading(false);
      } else {
        const timeout = setTimeout(() => {
          if (window.devBuddyState?.chats) {
            setChats(window.devBuddyState.chats);
          }
          setIsLoading(false);
        }, 100);
        return () => clearTimeout(timeout);
      }
    } catch (error) {
      logger.error("Failed initial sync with global state", error);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        if (window.devBuddyState?.chats) {
          setChats(window.devBuddyState.chats);
        }
      } catch (error) {
        logger.error("Failed to sync with global state", error);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleNewChat = () => {
    try {
      if (window.devBuddyState?.startNewChat) {
        window.devBuddyState.startNewChat();
      }
    } catch (error) {
      logger.error("Failed to start new chat", error);
    }
  };

  const handleChatSelect = (chatId: string) => {
    try {
      if (window.devBuddyState?.switchToChat) {
        window.devBuddyState.switchToChat(chatId);
      }
    } catch (error) {
      logger.error("Failed to switch chat", { chatId, error });
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this chat?")) {
      return;
    }

    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        if (window.devBuddyState?.deleteChat) {
          window.devBuddyState.deleteChat(chatId);
        }
      } else {
        logger.error("Failed to delete chat", { chatId });
        alert("Failed to delete chat. Please try again.");
      }
    } catch (error) {
      logger.error("Error deleting chat", { chatId, error });
      alert("An error occurred while deleting the chat.");
    }
  };

  const filteredChats = searchQuery.trim()
    ? chats.filter((chat) =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chats;

  return (
    <>
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-[280px] flex flex-col bg-[#0a0a0a] border-r border-[#2a2a2a] z-40 transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-4 py-[15.5px] border-b border-[#2a2a2a]">
          <div className="text-lg font-semibold text-white cursor-default">
            ⚡ DevBuddy
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col p-4 pt-0 overflow-y-auto">
          <Button
            onClick={handleNewChat}
            variant="secondary"
            className="w-full mb-6 mt-4 cursor-pointer bg-gradient-to-r from-[#7b61ff] to-[#00ccb1] hover:opacity-90 text-white border-0"
          >
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            New Chat
          </Button>

          <div className="mb-4 relative">
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full cursor-pointer rounded-md border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute top-2.5 right-3 w-4 h-4 text-white/60" />
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto">
            <div className="text-xs text-[#A3A3A3] uppercase tracking-wider mb-3 px-2">
              {isLoading
                ? "Loading..."
                : filteredChats.length > 0
                ? "Recent Chats"
                : "No Chats Yet"}
            </div>
            {filteredChats.map((chat) => (
              <div key={chat.id} className="relative group/item">
                <div
                  onClick={() => handleChatSelect(chat.id)}
                  className="w-full cursor-pointer text-left px-3 py-3 rounded-md text-sm text-white/90 hover:bg-[#1a1a1a] transition border border-transparent hover:border-[#2a2a2a]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="truncate">
                        {chat.name}
                        {chat.name === "New Chat" && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            New
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#A3A3A3] mt-1 group-hover/item:text-white/60">
                        {chat.projectFiles.length} files •{" "}
                        {new Date(chat.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteChat(chat.id, e)}
                      className="ml-2 p-1.5 rounded opacity-0 group-hover/item:opacity-100 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all flex-shrink-0"
                      title="Delete chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredChats.length === 0 && searchQuery && (
              <div className="text-center text-sm text-[#A3A3A3] py-4">
                No chats matching &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
        </div>
      </aside>

      {!open && (
        <div className="fixed top-4 left-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            className="border border-[#2a2a2a] bg-[#0a0a0a] backdrop-blur-md shadow-md hover:bg-[#1a1a1a] text-white"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      )}
    </>
  );
}
