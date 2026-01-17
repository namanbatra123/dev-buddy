"use client";

import React from "react";
import { X } from "lucide-react";

interface FileTab {
  path: string;
  name: string;
  isDirty?: boolean;
}

interface FileTabsProps {
  openTabs: FileTab[];
  activeTab: string | null;
  onTabSelect: (filePath: string) => void;
  onTabClose: (filePath: string) => void;
}

export default function FileTabs({
  openTabs,
  activeTab,
  onTabSelect,
  onTabClose,
}: FileTabsProps) {
  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();

    switch (ext) {
      case "js":
      case "jsx":
        return "📄";
      case "ts":
      case "tsx":
        return "🔷";
      case "html":
        return "🌐";
      case "css":
        return "🎨";
      case "json":
        return "📋";
      case "md":
        return "📝";
      case "py":
        return "🐍";
      default:
        return "📄";
    }
  };

  if (openTabs.length === 0) {
    return null;
  }

  const uniqueTabs = openTabs.filter(
    (tab, idx, arr) => arr.findIndex((t) => t.path === tab.path) === idx
  );

  return (
    <div className="flex bg-[#2d2d30] border-b border-[#2d2d30] overflow-x-auto scrollbar-thin scrollbar-thumb-[#424242] scrollbar-track-transparent">
      {uniqueTabs.map((tab) => (
        <div
          key={tab.path}
          className={`
            flex items-center px-3 py-2 border-r border-[#2d2d30] cursor-pointer group min-w-0 max-w-[200px]
            ${
              activeTab === tab.path
                ? "bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]"
                : "bg-[#2d2d30] text-[#cccccc] hover:bg-[#37373d]"
            }
          `}
          onClick={() => onTabSelect(tab.path)}
        >
          <span className="mr-2 text-sm flex-shrink-0">
            {getFileIcon(tab.name)}
          </span>

          <span className="text-sm truncate flex-1 min-w-0" title={tab.path}>
            {tab.name}
            {tab.isDirty && <span className="ml-1 text-[#f48771]">●</span>}
          </span>

          <button
            className="ml-2 p-1 rounded hover:bg-[#424242] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.path);
            }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
