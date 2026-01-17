"use client";

import { FileCode, File, FileJson, FileText } from "lucide-react";

const getFileIcon = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "py":
    case "php":
    case "rb":
      return <FileCode className="w-4 h-4 mr-2" />;
    case "json":
    case "yaml":
    case "yml":
      return <FileJson className="w-4 h-4 mr-2" />;
    case "md":
    case "txt":
      return <FileText className="w-4 h-4 mr-2" />;
    default:
      return <File className="w-4 h-4 mr-2" />;
  }
};

export default function FileSidebar({
  files,
  selected,
  onSelect,
}: {
  files: Record<string, string>;
  selected: string | null;
  onSelect: (file: string) => void;
}) {
  return (
    <div className="w-[220px] bg-[#1f1f1f] text-white p-4 border-r border-white/10 overflow-y-auto">
      <div className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-2 pl-2">
        Files
      </div>
      <div className="space-y-1">
        {Object.keys(files).map((file) => (
          <div
            key={file}
            onClick={() => onSelect(file)}
            className={`p-2 rounded cursor-pointer transition-colors flex items-center ${
              selected === file
                ? "bg-blue-600 text-white"
                : "text-white/80 hover:bg-white/10"
            }`}
          >
            {getFileIcon(file)}
            <span className="text-sm truncate">{file}</span>
          </div>
        ))}
      </div>
      {Object.keys(files).length === 0 && (
        <div className="text-sm text-white/50 italic text-center mt-4">
          No files available
        </div>
      )}
    </div>
  );
}
