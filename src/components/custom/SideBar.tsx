'use client';

import { Button } from '@/components/ui/button';
import { LogOut, MessageSquarePlus, Search, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export default function Sidebar({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const dummyChats = [
    'Build a portfolio site',
    'Create a React auth flow',
    'Design a SaaS landing page',
    'Write a Python scraper',
  ];

  const [isSignedIn, setIsSignedIn] = useState(false); 


  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen w-[280px] flex flex-col bg-white/10 backdrop-blur-lg border-r border-white/10 z-40 transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close Icon */}
        <div className="flex items-center justify-between px-4 py-4">
          <div className="text-lg font-semibold text-white cursor-default">⚡ DevBuddy</div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 flex flex-col p-4 pt-0 overflow-y-auto">
          {/* Search */}
          <div className="mb-4 relative mt-[2px]">
            <input
              type="text"
              placeholder="Search chats..."
              className="w-full cursor-pointer rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute top-2.5 right-3 w-4 h-4 text-white/60" />
          </div>

          {/* New Chat */}
          <Button
            variant="secondary"
            className="w-full mb-6 cursor-pointer bg-blue-500 hover:bg-blue-600 text-white"
          >
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            New Chat
          </Button>

          {/* Chat History */}
          <div className="flex-1 space-y-2 overflow-y-auto">
            {dummyChats.map((title, index) => (
              <button
                key={index}
                className="w-full cursor-pointer text-left px-3 py-2 rounded-md text-sm text-white/90 hover:bg-white/10 transition"
              >
                {title}
              </button>
            ))}
          </div>
        </div>

        {/* Sign Out */}
        <div className="border-t border-white/10 p-4">
            {isSignedIn ? (
                <Button
                variant="ghost"
                className="w-full text-white hover:bg-white/10"
                onClick={() => {
                    console.log("Signing out...");
                    setIsSignedIn(false); // mock logout
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
                    console.log("Signing in...");
                    setIsSignedIn(true); // mock login
                }}
                >
                <LogOut className="w-4 h-4 mr-2" />
                Sign In
                </Button>
            )}
        </div>

      </aside>

      {/* Toggle Button when sidebar is closed */}
      {!open && (
        <div className="fixed top-4 left-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            className="border border-border bg-background/80 backdrop-blur-md shadow-md hover:bg-accent"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      )}
    </>
  );
}
