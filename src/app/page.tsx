"use client";

import { useState } from "react";
import Header from "@/components/custom/Header";
import HeroSection from "@/components/custom/HeroSection";
import Sidebar from "@/components/custom/SideBar";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
          <HeroSection />
        </div>
      </div>
    </div>
  );
}
