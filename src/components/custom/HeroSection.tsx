"use client";

import React, { useState, KeyboardEvent, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { generateGeminiResponse } from "@/lib/gemini";
import { Button } from "@/components/ui/button";
import { Send, Copy, Download, FolderOpen } from "lucide-react";
import FileExplorer from "./FileExplorer";
import FileTabs from "./FileTabs";
import dynamic from "next/dynamic";
import { Message, FileItem, FileTab, Chat } from "@/lib/types";
import Preview from "./Preview";
import { logger } from "@/lib/logger";
import LoginModal from "../LoginModal";

const MultiFileEditor = dynamic(() => import("./MultiFileEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-[#cccccc] bg-[#1e1e1e]">
      <div className="text-center">
        <div className="text-4xl mb-4">⚡</div>
        <div className="text-lg mb-2 font-medium">Loading Editor...</div>
      </div>
    </div>
  ),
});

interface HeroSectionProps {
  initialChatId?: string;
}

export default function HeroSection({ initialChatId }: HeroSectionProps = {}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState("");
  const [currentMessage, setCurrentMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [projectFiles, setProjectFiles] = useState<FileItem[]>([]);
  const [openTabs, setOpenTabs] = useState<FileTab[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [openFolders, setOpenFolders] = useState<Set<string>>(
    new Set(["src", "public", "components"])
  );
  const [showPreview, setShowPreview] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (chatStarted) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, chatStarted]);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      loadChats();
    }
  }, [status, session]);

  useEffect(() => {
    if (status === "unauthenticated") {
      setChats([]);
      setActiveChat(null);
      setMessages([]);
      setProjectFiles([]);
      setOpenTabs([]);
      setChatStarted(false);
      setActiveFile(null);
    }
  }, [status]);

  useEffect(() => {
    if (
      initialChatId &&
      chats.length > 0 &&
      activeChat !== initialChatId &&
      status === "authenticated"
    ) {
      const chat = chats.find((c) => c.id === initialChatId);
      if (chat) {
        switchToChat(initialChatId);
      }
    }
  }, [initialChatId, chats, status]);

  const loadChats = async () => {
    try {
      const response = await fetch("/api/chats");
      if (response.ok) {
        const chatsData = await response.json();
        setChats(chatsData);
      }
    } catch (error) {
      logger.error("Failed to load chats", error);
    }
  };

  const saveChat = async (chat: Chat) => {
    try {
      const method = chats.find((c) => c.id === chat.id) ? "PUT" : "POST";
      const url = method === "PUT" ? `/api/chats/${chat.id}` : "/api/chats";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: chat.id,
          name: chat.name,
          messages: chat.messages,
          projectFiles: chat.projectFiles,
        }),
      });

      if (!response.ok) {
        logger.error("Failed to save chat", response.statusText);
      }
    } catch (error) {
      logger.error("Failed to save chat", error);
    }
  };

  const generateChatName = (prompt: string): string => {
    const trimmedPrompt = prompt.trim().replace(/\s+/g, " ");

    let chatName = trimmedPrompt.split(" ").slice(0, 5).join(" ");
    if (chatName.length > 30) {
      chatName = chatName.substring(0, 30).trim() + "...";
    }
    return chatName;
  };

  const createNewChat = (prompt: string): string => {
    const chatId = Date.now().toString();
    const chatName = prompt ? generateChatName(prompt) : "New Chat";

    const newChat: Chat = {
      id: chatId,
      name: chatName,
      timestamp: new Date(),
      messages: [],
      projectFiles: [],
    };

    setChats((prev) => [newChat, ...prev]);
    setActiveChat(chatId);

    return chatId;
  };

  const switchToChat = (chatId: string) => {
    const chat = chats.find((chat) => chat.id === chatId);
    if (!chat) return;

    setActiveChat(chatId);
    setMessages(chat.messages);
    setProjectFiles(chat.projectFiles);

    setOpenTabs([]);
    setActiveFile(null);
    setChatStarted(chat.messages.length > 0);
    setCurrentMessage("");

    router.push(`/?id=${chatId}`);

    if (chat.projectFiles.length > 0) {
      const mainFile =
        chat.projectFiles.find(
          (f) =>
            f.path.includes("App.") ||
            f.path.includes("index.") ||
            f.path.includes("main.") ||
            f.path === "src/App.js" ||
            f.path === "src/App.tsx" ||
            f.path === "index.html"
        ) || chat.projectFiles[0];

      if (mainFile) {
        openFileInTab(mainFile.path);
      }
    }
  };

  const handleInitialSubmit = async () => {
    if (!initialPrompt.trim()) return;
    if (loading) return;

    if (status !== "authenticated") {
      setShowLoginModal(true);
      return;
    }

    const promptToSend = initialPrompt.trim();
    setInitialPrompt("");
    setChatStarted(true);

    let chatId = activeChat;
    if (!chatId) {
      chatId = createNewChat(promptToSend);
    } else {
      setChats((prev) => {
        return prev.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              name: generateChatName(promptToSend),
            };
          }
          return chat;
        });
      });
    }

    await sendMessage(promptToSend, chatId);
  };

  const handleFollowUpSubmit = async () => {
    if (!currentMessage.trim() || !activeChat || loading) return;

    const messageToSend = currentMessage.trim();
    setCurrentMessage("");
    await sendMessage(messageToSend, activeChat);
  };

  const sendMessage = async (content: string, chatId: string) => {
    try {
      setLoading(true);

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content,
      };

      setMessages((prev) => [...prev, userMessage]);

      setChats((prevChats) => {
        const updatedChats = prevChats.map((chat) => {
          if (chat.id === chatId) {
            const updatedChat = {
              ...chat,
              messages: [...chat.messages, userMessage],
            };
            saveChat(updatedChat);
            return updatedChat;
          }
          return chat;
        });
        return updatedChats;
      });

      const currentChat = chats.find((c) => c.id === chatId);
      const chatHistoryForContext = currentChat ? currentChat.messages : [];

      const result = await generateGeminiResponse(
        content,
        chatHistoryForContext
      );

      if (result) {
        let cleanResult = result;
        if (cleanResult.includes("```")) {
          cleanResult = cleanResult
            .replace(/```[a-zA-Z]*\n?/g, "")
            .replace(/```/g, "");
        }
        cleanResult = cleanResult.trim();
        if (cleanResult.startsWith('"') && cleanResult.endsWith('"')) {
          try {
            cleanResult = JSON.parse(cleanResult);
          } catch {}
        }
        let parsedResult;
        try {
          parsedResult = JSON.parse(cleanResult);
        } catch {
          cleanResult = cleanResult.replace(
            /("content":\s?")(([\s\S]*?))(")/g,
            (match, p1, p2, p3) => {
              return (
                p1 +
                p2.replace(/[\r\n\t\b\f]/g, (c: string) => {
                  switch (c) {
                    case "\r":
                      return "\r";
                    case "\n":
                      return "\n";
                    case "\t":
                      return "\t";
                    case "\b":
                      return "\b";
                    case "\f":
                      return "\f";
                    default:
                      return c;
                  }
                }) +
                p3
              );
            }
          );
          try {
            parsedResult = JSON.parse(cleanResult);
          } catch {}
        }
        if (parsedResult.files && Array.isArray(parsedResult.files)) {
          const newFiles: FileItem[] = parsedResult.files.map(
            (file: { path: string; content: string }) => ({
              path: file.path,
              content: file.content,
            })
          );

          setProjectFiles(newFiles);
          setChats((prevChats) => {
            const updatedChats = prevChats.map((chat) => {
              if (chat.id === chatId) {
                const updatedChat = {
                  ...chat,
                  projectFiles: newFiles,
                };
                saveChat(updatedChat);
                return updatedChat;
              }
              return chat;
            });
            return updatedChats;
          });
          const mainFile =
            newFiles.find(
              (f) =>
                f.path.includes("App.") ||
                f.path.includes("index.") ||
                f.path.includes("main.") ||
                f.path === "src/App.js" ||
                f.path === "src/App.tsx" ||
                f.path === "index.html"
            ) || newFiles[0];

          if (mainFile && !activeFile) {
            openFileInTab(mainFile.path);
          } else if (
            activeFile &&
            !newFiles.find((f) => f.path === activeFile)
          ) {
            if (mainFile) {
              openFileInTab(mainFile.path);
            }
          }
          setOpenFolders(
            new Set(["src", "public", "components", "pages", "styles", "utils"])
          );
        }
      }
    } catch (error) {
      logger.error("Error generating response", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error processing your request.",
      };
      setMessages((prev) => [...prev, errorMessage]);
      setChats((prevChats) => {
        return prevChats.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [...chat.messages, errorMessage],
            };
          }
          return chat;
        });
      });
    } finally {
      setLoading(false);
    }
  };

  const openFileInTab = (filePath: string) => {
    setActiveFile(filePath);

    const fileName = filePath.split("/").pop() || filePath;
    const existingTab = openTabs.find((tab) => tab.path === filePath);

    if (!existingTab) {
      setOpenTabs((prev) => [...prev, { path: filePath, name: fileName }]);
    }
  };

  const closeTab = (filePath: string) => {
    setOpenTabs((prev) => prev.filter((tab) => tab.path !== filePath));

    if (activeFile === filePath) {
      const remainingTabs = openTabs.filter((tab) => tab.path !== filePath);
      setActiveFile(
        remainingTabs.length > 0
          ? remainingTabs[remainingTabs.length - 1].path
          : null
      );
    }
  };

  const toggleFolder = (folderPath: string) => {
    setOpenFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  };

  const handleFileChange = (filePath: string, newContent: string) => {
    setProjectFiles((prev) =>
      prev.map((file) =>
        file.path === filePath ? { ...file, content: newContent } : file
      )
    );

    setOpenTabs((prev) =>
      prev.map((tab) =>
        tab.path === filePath ? { ...tab, isDirty: true } : tab
      )
    );

    if (activeChat) {
      setChats((prevChats) => {
        return prevChats.map((chat) => {
          if (chat.id === activeChat) {
            const updatedFiles = chat.projectFiles.map((file) =>
              file.path === filePath ? { ...file, content: newContent } : file
            );
            return {
              ...chat,
              projectFiles: updatedFiles,
            };
          }
          return chat;
        });
      });
    }
  };

  const handleKeyDown = (
    e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
    isInitial: boolean = false
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isInitial) {
        handleInitialSubmit();
      } else {
        handleFollowUpSubmit();
      }
    }
  };

  const downloadProject = () => {
    if (projectFiles.length === 1) {
      const file = projectFiles[0];
      const element = document.createElement("a");
      const blob = new Blob([file.content], { type: "text/plain" });
      element.href = URL.createObjectURL(blob);
      element.download = file.path.split("/").pop() || "file.txt";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } else {
      const projectStructure = projectFiles
        .map(
          (file) => `// ${file.path}\n${file.content}\n\n${"=".repeat(50)}\n\n`
        )
        .join("");

      const element = document.createElement("a");
      const blob = new Blob([projectStructure], { type: "text/plain" });
      element.href = URL.createObjectURL(blob);
      element.download = "project-files.txt";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  const copyActiveFile = () => {
    if (activeFile) {
      const file = projectFiles.find((f) => f.path === activeFile);
      if (file) {
        navigator.clipboard.writeText(file.content);
      }
    }
  };

  const startNewChat = () => {
    const hasEmptyChat = chats.some((chat) => chat.messages.length === 0);

    if (activeChat) {
      const currentChat = chats.find((chat) => chat.id === activeChat);
      if (currentChat && currentChat.messages.length === 0) {
        return;
      }
    } else if (hasEmptyChat) {
      const emptyChat = chats.find((chat) => chat.messages.length === 0);
      if (emptyChat) {
        switchToChat(emptyChat.id);
        return;
      }
    }

    setMessages([]);
    setProjectFiles([]);
    setOpenTabs([]);
    setActiveFile(null);
    setChatStarted(false);
    setInitialPrompt("");
    setCurrentMessage("");
    setActiveChat(null);

    router.push("/");
  };

  // Delete a chat
  const deleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== chatId));

    if (activeChat === chatId) {
      const remainingChats = chats.filter((chat) => chat.id !== chatId);
      if (remainingChats.length > 0) {
        switchToChat(remainingChats[0].id);
      } else {
        setActiveChat(null);
        setMessages([]);
        setProjectFiles([]);
        setOpenTabs([]);
        setActiveFile(null);
        setChatStarted(false);
        setInitialPrompt("");
        setCurrentMessage("");
      }
    }
  };

  useEffect(() => {
    try {
      (
        window as Window & {
          devBuddyState?: {
            chats: Chat[];
            startNewChat: () => void;
            switchToChat: (id: string) => void;
            deleteChat: (id: string) => void;
          };
        }
      ).devBuddyState = {
        chats,
        startNewChat,
        switchToChat,
        deleteChat,
      };
    } catch (error) {
      logger.error("Failed to update global state", error);
    }
  }, [chats, startNewChat, switchToChat, deleteChat]);

  return (
    <div className="h-full flex flex-col">
      <LoginModal
        isOpen={status === "unauthenticated" && showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
      {!chatStarted ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 font-Inter">
          <div className="text-center">
            <div className="text-[36px] sm:text-[44px] mb-4 font-semibold text-white">
              What do you want to build?
            </div>
            <div className="text-base sm:text-lg text-[#A3A3A3] mb-10 max-w-xl">
              Describe your idea and get instant multi-file project generation.
            </div>
          </div>

          <div className="relative w-full max-w-[600px] group mb-4">
            <motion.div
              className="absolute inset-0 z-0 rounded-xl pointer-events-none blur-md opacity-50 group-hover:opacity-80"
              animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
              transition={{
                duration: 6,
                repeat: Infinity,
                repeatType: "mirror",
              }}
              style={{
                backgroundSize: "400% 400%",
                backgroundImage: `
                  radial-gradient(circle at 0% 100%, #00ccb1, transparent),
                  radial-gradient(circle at 100% 0%, #7b61ff, transparent),
                  radial-gradient(circle at 100% 100%, #ffc414, transparent),
                  radial-gradient(circle at 0% 0%, #1ca0fb, transparent)
                `,
              }}
            />
            <textarea
              className="relative z-10 w-full h-[180px] sm:h-[200px] p-4 rounded-xl bg-[#0f0f0f] text-white resize-none outline-none font-medium text-base border-2 border-transparent"
              placeholder="E.g., 'Create a React todo app', 'Build a calculator', 'Make a landing page'..."
              value={initialPrompt}
              onChange={(e) => setInitialPrompt(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, true)}
            />
          </div>

          <Button
            onClick={handleInitialSubmit}
            disabled={loading || !initialPrompt.trim()}
            className="relative z-10 bg-gradient-to-r from-[#7b61ff] to-[#00ccb1] hover:opacity-90 text-white font-medium py-2 px-8 rounded-xl transition-all w-40 h-11"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Generating
              </div>
            ) : (
              "Generate Project"
            )}
          </Button>
        </div>
      ) : (
        <div className="flex h-full">
          <div className="w-96 border-r border-[#2a2a2a] bg-[#0a0a0a] flex flex-col">
            {/* Chat History */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    {message.role === "user" && (
                      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                        <div className="text-xs text-[#A3A3A3] uppercase tracking-wider mb-2">
                          Prompt
                        </div>
                        <div className="text-sm text-white whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                      </div>
                    )}
                    {message.role === "assistant" && (
                      <div className="bg-[#2a1810] border border-[#4a2a1a] rounded-lg p-3">
                        <div className="text-xs text-[#ff8c69] uppercase tracking-wider mb-2">
                          Error
                        </div>
                        <div className="text-sm text-[#ffb3a3] whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* New Prompt Input */}
            <div className="p-4 border-t border-[#2a2a2a] bg-[#0f0f0f]">
              <div className="space-y-3">
                <div className="text-xs text-[#A3A3A3] uppercase tracking-wider">
                  Add to Project
                </div>
                <div className="relative">
                  <motion.div
                    className="absolute inset-0 z-0 rounded-lg pointer-events-none blur-sm opacity-20"
                    animate={{
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      repeatType: "mirror",
                    }}
                    style={{
                      backgroundSize: "400% 400%",
                      backgroundImage: `
                        radial-gradient(circle at 0% 100%, #00ccb1, transparent),
                        radial-gradient(circle at 100% 0%, #7b61ff, transparent),
                        radial-gradient(circle at 100% 100%, #ffc414, transparent),
                        radial-gradient(circle at 0% 0%, #1ca0fb, transparent)
                      `,
                    }}
                  />
                  <div className="relative z-10 flex items-center bg-[#0a0a0a] rounded-lg border border-[#2a2a2a]">
                    <input
                      ref={inputRef}
                      type="text"
                      className="flex-1 bg-transparent text-white p-3 outline-none text-sm placeholder-[#666]"
                      placeholder="Add features, modify code..."
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={loading}
                    />
                    <Button
                      onClick={handleFollowUpSubmit}
                      disabled={loading || !currentMessage.trim()}
                      className="bg-gradient-to-r from-[#7b61ff] to-[#00ccb1] hover:opacity-90 text-white rounded-md h-8 w-8 flex items-center justify-center p-0 min-w-0 mr-2"
                    >
                      {loading ? (
                        <svg
                          className="animate-spin h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      ) : (
                        <Send size={14} />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - IDE with File Explorer and Editor */}
          <div className="flex-1 flex">
            {/* File Explorer */}
            <div className="w-64 border-r border-[#2d2d30] bg-[#252526]">
              <FileExplorer
                files={projectFiles}
                activeFile={activeFile}
                onFileSelect={openFileInTab}
                onToggleFolder={toggleFolder}
                openFolders={openFolders}
              />
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col bg-[#1e1e1e]">
              {/* Editor Toolbar */}
              <div className="px-4 py-2 border-b border-[#2d2d30] flex items-center justify-between bg-[#2d2d30]">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-[#ff5f57] rounded-full"></div>
                    <div className="w-3 h-3 bg-[#ffbd2e] rounded-full"></div>
                    <div className="w-3 h-3 bg-[#28ca42] rounded-full"></div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FolderOpen size={16} className="text-[#cccccc]" />
                    <span className="text-sm text-[#cccccc] font-medium">
                      Project ({projectFiles.length} files)
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Add Editor/Preview toggle buttons */}
                  <div className="flex border border-[#2a2a2a] rounded-md overflow-hidden mr-2">
                    <button
                      className={`px-3 py-1 text-xs ${
                        !showPreview
                          ? "bg-[#37373d] text-white"
                          : "bg-transparent text-[#cccccc]"
                      }`}
                      onClick={() => setShowPreview(false)}
                    >
                      Editor
                    </button>
                    <button
                      className={`px-3 py-1 text-xs ${
                        showPreview
                          ? "bg-[#37373d] text-white"
                          : "bg-transparent text-[#cccccc]"
                      }`}
                      onClick={() => setShowPreview(true)}
                    >
                      Preview
                    </button>
                  </div>

                  {projectFiles.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={copyActiveFile}
                        variant="outline"
                        size="sm"
                        className="text-[#cccccc] border-[#2a2a2a] hover:bg-[#37373d] h-8"
                        disabled={!activeFile}
                      >
                        <Copy size={14} className="mr-1" />
                        Copy
                      </Button>
                      <Button
                        onClick={downloadProject}
                        variant="outline"
                        size="sm"
                        className="text-[#cccccc] border-[#2a2a2a] hover:bg-[#37373d] h-8"
                      >
                        <Download size={14} className="mr-1" />
                        Download
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* File Tabs */}
              <FileTabs
                openTabs={openTabs}
                activeTab={activeFile}
                onTabSelect={setActiveFile}
                onTabClose={closeTab}
              />

              <div className="flex-1">
                {showPreview ? (
                  <Preview projectFiles={projectFiles} visible={showPreview} />
                ) : projectFiles.length > 0 ? (
                  <MultiFileEditor
                    files={projectFiles}
                    activeFile={activeFile}
                    onChange={handleFileChange}
                    readOnly={false}
                  />
                ) : (
                  ""
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
