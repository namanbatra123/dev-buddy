'use client';

import { useState } from "react";
import Header from "@/components/custom/Header";
import HeroSection from "@/components/custom/HeroSection";
import Sidebar from "@/components/custom/SideBar";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="relative">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? 'pl-[280px]' : 'pl-0'
        }`}
      >
        <Header />
        <HeroSection />
      </div>
    </div>
  );
}
