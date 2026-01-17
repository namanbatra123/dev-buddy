"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Header from "@/components/custom/Header";
import HeroSection from "@/components/custom/HeroSection";
import Sidebar from "@/components/custom/SideBar";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-[#0a0a0a] text-white">
          Loading...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const chatId = searchParams.get("id");

  useEffect(() => {
    if (status === "unauthenticated" && chatId) {
      router.push("/");
    }
  }, [status, chatId, router]);

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
