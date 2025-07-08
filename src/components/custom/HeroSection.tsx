"use client";

import React, { useState, KeyboardEvent, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { generateGeminiResponse } from "@/lib/gemini";
import { Button } from "@/components/ui/button";
import { Send, Copy, Download, FolderOpen } from "lucide-react";
import FileExplorer from "./FileExplorer";
import FileTabs from "./FileTabs";
import MultiFileEditor from "./MultiFileEditor";
import { Message, FileItem, FileTab, Chat } from "@/lib/types";
import { logger } from "@/lib/logger";

export default function HeroSection() {
  // State
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

  // Chat history state
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

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

  // Function to generate a chat name from prompt
  const generateChatName = (prompt: string): string => {
    // Trim whitespace and extra spaces
    const trimmedPrompt = prompt.trim().replace(/\s+/g, " ");

    // Create shorter name for the chat (first 5 words or 30 chars max)
    let chatName = trimmedPrompt.split(" ").slice(0, 5).join(" ");
    if (chatName.length > 30) {
      chatName = chatName.substring(0, 30).trim() + "...";
    }
    return chatName;
  };

  // Create a new chat
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

  // Switch to an existing chat
  const switchToChat = (chatId: string) => {
    const chat = chats.find((chat) => chat.id === chatId);
    if (!chat) return;

    setActiveChat(chatId);
    setMessages(chat.messages);
    setProjectFiles(chat.projectFiles);

    // Reset other UI states
    setOpenTabs([]);
    setActiveFile(null);
    setChatStarted(chat.messages.length > 0);
    setCurrentMessage("");

    // If chat has files, open the main one
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

    const promptToSend = initialPrompt.trim();
    setInitialPrompt("");
    setChatStarted(true);
    setHasInteracted(true);

    // Create a new chat or update an existing empty one with this prompt
    let chatId;
    if (activeChat) {
      // Update the name of the existing chat with the prompt
      chatId = activeChat;
      setChats((prev) => {
        return prev.map((chat) => {
          if (chat.id === activeChat) {
            return {
              ...chat,
              name: generateChatName(promptToSend),
            };
          }
          return chat;
        });
      });
    } else {
      // Create a new chat with this prompt
      chatId = createNewChat(promptToSend);
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

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content,
      };

      setMessages((prev) => [...prev, userMessage]);

      // Update in chat history
      setChats((prevChats) => {
        return prevChats.map((chat) => {
          if (chat.id === chatId) {
            // If this is the first message in a "New Chat", update the name
            if (chat.name === "New Chat" && chat.messages.length === 0) {
              return {
                ...chat,
                name: generateChatName(content),
                messages: [...chat.messages, userMessage],
              };
            }
            return {
              ...chat,
              messages: [...chat.messages, userMessage],
            };
          }
          return chat;
        });
      });

      const result = await generateGeminiResponse(content);

      if (result) {
        try {
          // Additional cleanup for any remaining markdown formatting
          let cleanResult = result;

          // Remove any markdown code blocks
          if (cleanResult.includes("```")) {
            cleanResult = cleanResult
              .replace(/```[a-zA-Z]*\n?/g, "")
              .replace(/```/g, "");
          }

          // Remove any leading/trailing whitespace
          cleanResult = cleanResult.trim();

          // Handle double-escaped JSON strings
          if (cleanResult.startsWith('"') && cleanResult.endsWith('"')) {
            try {
              // First parse to un-escape the outer quotes
              cleanResult = JSON.parse(cleanResult);
            } catch (e) {
              // Unable to parse as string literal, proceed with original
            }
          }

          // Parse the JSON response
          const parsedResult = JSON.parse(cleanResult);

          if (parsedResult.files && Array.isArray(parsedResult.files)) {
            const newFiles: FileItem[] = parsedResult.files.map(
              (file: any) => ({
                path: file.path,
                content: file.content,
              })
            );

            setProjectFiles(newFiles);

            // Update chat history with files
            setChats((prevChats) => {
              return prevChats.map((chat) => {
                if (chat.id === chatId) {
                  return {
                    ...chat,
                    projectFiles: newFiles,
                  };
                }
                return chat;
              });
            });

            // Open the main file by default
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

            if (mainFile) {
              openFileInTab(mainFile.path);
            }

            // Auto-expand common folders
            setOpenFolders(
              new Set([
                "src",
                "public",
                "components",
                "pages",
                "styles",
                "utils",
              ])
            );
          }
        } catch (parseError) {
          console.error("Error parsing AI response:", parseError);
          console.error("Raw result:", result); // Debug log

          // Fallback: treat as single file
          const fileName = detectFileName(content, result);
          const singleFile: FileItem = {
            path: fileName,
            content: result,
          };

          setProjectFiles([singleFile]);

          // Update chat history with single file
          setChats((prevChats) => {
            return prevChats.map((chat) => {
              if (chat.id === chatId) {
                return {
                  ...chat,
                  projectFiles: [singleFile],
                };
              }
              return chat;
            });
          });

          openFileInTab(fileName);
        }
      }
    } catch (error) {
      console.error("Error generating response:", error);

      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error processing your request.",
      };

      setMessages((prev) => [...prev, errorMessage]);

      // Update in chat history
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

  const detectFileName = (prompt: string, code: string): string => {
    const lowerPrompt = prompt.toLowerCase();
    const lowerCode = code.toLowerCase();

    if (lowerPrompt.includes("react") || lowerCode.includes("import react")) {
      return "src/App.tsx";
    } else if (
      lowerCode.includes("<!doctype html") ||
      lowerCode.includes("<html")
    ) {
      return "index.html";
    } else if (lowerCode.includes("def ") || lowerPrompt.includes("python")) {
      return "main.py";
    } else if (
      lowerCode.includes("function ") ||
      lowerCode.includes("const ")
    ) {
      return "script.js";
    } else {
      return "file.txt";
    }
  };

  const openFileInTab = (filePath: string) => {
    setActiveFile(filePath);

    // Add to tabs if not already open
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
    // Update projectFiles state
    setProjectFiles((prev) =>
      prev.map((file) =>
        file.path === filePath ? { ...file, content: newContent } : file
      )
    );

    // Mark tab as dirty
    setOpenTabs((prev) =>
      prev.map((tab) =>
        tab.path === filePath ? { ...tab, isDirty: true } : tab
      )
    );

    // Update the file in chat history if there's an active chat
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
      // Single file download
      const file = projectFiles[0];
      const element = document.createElement("a");
      const blob = new Blob([file.content], { type: "text/plain" });
      element.href = URL.createObjectURL(blob);
      element.download = file.path.split("/").pop() || "file.txt";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } else {
      // Multiple files - create a zip-like structure
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
    // Check if there's already an empty chat
    const hasEmptyChat = chats.some((chat) => chat.messages.length === 0);

    // If there's already an empty chat and we're on it, don't create another one
    if (activeChat) {
      const currentChat = chats.find((chat) => chat.id === activeChat);
      if (currentChat && currentChat.messages.length === 0) {
        return; // Don't create a new empty chat if the current one is empty
      }
    } else if (hasEmptyChat) {
      // If there's an empty chat somewhere else, switch to it instead of creating a new one
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
    setChatStarted(true); // Change this to true to show the empty chat interface
    setInitialPrompt("");
    setCurrentMessage("");
    setHasInteracted(false);

    // Create a new empty chat with a generic name
    const chatId = createNewChat(""); // Pass empty string to get "New Chat" as name
    setActiveChat(chatId);
  };

  // Make chats and functions available globally
  useEffect(() => {
    try {
      // @ts-ignore - Adding global access for the sidebar
      window.devBuddyState = {
        chats,
        startNewChat,
        switchToChat,
      };
    } catch (error) {
      logger.error("Failed to update global state", error);
    }
  }, [chats]);

  return (
    <div className="h-full flex flex-col">
      {!chatStarted ? (
        // Initial view with large text input
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

              {/* File Tabs */}
              <FileTabs
                openTabs={openTabs}
                activeTab={activeFile}
                onTabSelect={setActiveFile}
                onTabClose={closeTab}
              />

              {/* Code Editor */}
              <div className="flex-1">
                {projectFiles.length > 0 ? (
                  <MultiFileEditor
                    files={projectFiles}
                    activeFile={activeFile}
                    onChange={handleFileChange}
                    readOnly={false}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-[#cccccc] bg-[#1e1e1e]">
                    <div className="text-center">
                      <div className="text-6xl mb-6">⚡</div>
                      <div className="text-xl mb-3 font-medium">
                        Ready to Build
                      </div>
                      <div className="text-sm text-[#858585] max-w-md">
                        Describe what you want to build and get a complete
                        project with multiple files
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
