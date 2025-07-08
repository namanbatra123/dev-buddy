"use client";

import { Button } from "@/components/ui/button";
import { LogOut, MessageSquarePlus, Search, Menu, X } from "lucide-react";
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
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync with global state from HeroSection
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

  // Filter chats based on search query
  const filteredChats = searchQuery.trim()
    ? chats.filter((chat) =>
        chat.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chats;

  return (
    <>
      {/* Main Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-[280px] flex flex-col bg-[#0a0a0a] border-r border-[#2a2a2a] z-40 transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
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

        {/* Sidebar Content */}
        <div className="flex-1 flex flex-col p-4 pt-0 overflow-y-auto">
          {/* New Chat Button */}
          <Button
            onClick={handleNewChat}
            variant="secondary"
            className="w-full mb-6 mt-4 cursor-pointer bg-gradient-to-r from-[#7b61ff] to-[#00ccb1] hover:opacity-90 text-white border-0"
          >
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            New Chat
          </Button>

          {/* Search Box */}
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

          {/* Chat List */}
          <div className="flex-1 space-y-1 overflow-y-auto">
            <div className="text-xs text-[#A3A3A3] uppercase tracking-wider mb-3 px-2">
              {filteredChats.length > 0 ? "Recent Chats" : "No Chats Yet"}
            </div>
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => handleChatSelect(chat.id)}
                className="w-full cursor-pointer text-left px-3 py-3 rounded-md text-sm text-white/90 hover:bg-[#1a1a1a] transition border border-transparent hover:border-[#2a2a2a] group"
              >
                <div className="truncate font-medium">
                  {chat.name}
                  {chat.name === "New Chat" && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                      New
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#A3A3A3] mt-1 group-hover:text-white/60">
                  {chat.projectFiles.length} files •{" "}
                  {new Date(chat.timestamp).toLocaleString()}
                </div>
              </button>
            ))}
            {filteredChats.length === 0 && searchQuery && (
              <div className="text-center text-sm text-[#A3A3A3] py-4">
                No chats matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        {/* Auth Footer */}
        <div className="border-t border-[#2a2a2a] p-4">
          {isSignedIn ? (
            <Button
              variant="ghost"
              className="w-full text-white hover:bg-white/10"
              onClick={() => {
                setIsSignedIn(false);
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-full text-white hover:bg-white/10"
              onClick={() => {
                setIsSignedIn(true);
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Menu Button */}
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
