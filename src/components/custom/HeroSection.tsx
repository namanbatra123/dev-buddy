"use client";

import React from "react";
import { motion } from "framer-motion";

export default function HeroSection() {
  return (
    <div className="flex flex-col items-center text-center pt-24 px-4 font-Inter">
      <div className="text-[36px] sm:text-[44px] mb-4 font-semibold text-white">
        What do you want to build?
      </div>
      <div className="text-base sm:text-lg text-[#A3A3A3] mb-10 max-w-xl">
        Create stunning apps & websites by chatting with AI.
      </div>

      <div className="relative w-full max-w-[600px] group">
        <motion.div
          className="absolute inset-0 z-0 rounded-xl pointer-events-none blur-md opacity-50 group-hover:opacity-80"
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 6, repeat: Infinity, repeatType: "mirror" }}
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
          placeholder="Start typing your idea..."
        />
      </div>
    </div>
  );
}
