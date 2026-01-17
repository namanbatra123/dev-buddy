"use client";

import { useState, useEffect } from "react";
import Header from "@/components/custom/Header";
import HeroSection from "@/components/custom/HeroSection";
import Sidebar from "@/components/custom/SideBar";

interface ChatPageProps {
  params: Promise<{
    chatId: string;
  }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);

  // Unwrap params using useEffect
  useEffect(() => {
    params.then((p) => setChatId(p.chatId));
  }, [params]);

  return (
    <div className="h-screen flex">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? "ml-[280px]" : "ml-0"
        }`}
      >
        <Header />
        <div className="flex-1 overflow-hidden">
          <HeroSection initialChatId={chatId || undefined} />
        </div>
      </div>
    </div>
  );
}
