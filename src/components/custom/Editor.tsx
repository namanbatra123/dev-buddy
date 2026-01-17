"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";

// Map file extensions to language for syntax highlighting
const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    py: "python",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    md: "markdown",
    yml: "yaml",
    yaml: "yaml",
    sh: "bash",
    bash: "bash",
    // Add more mappings as needed
  };

  return langMap[ext] || "javascript";
};

export default function Editor({
  code,
  filename,
}: {
  code: string;
  filename?: string;
}) {
  const [isCopied, setIsCopied] = useState(false);
  const language = filename ? getLanguageFromFilename(filename) : "javascript";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex-1 bg-[#0d0d0d] text-white flex flex-col">
      <div className="flex justify-between items-center px-4 py-2 border-b border-white/10">
        {filename && <div className="text-sm text-white/70">{filename}</div>}
        <button
          onClick={copyToClipboard}
          className="text-xs bg-white/10 hover:bg-white/20 text-white/80 py-1 px-2 rounded transition-colors"
        >
          {isCopied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: "16px",
            backgroundColor: "#0d0d0d",
            borderRadius: 0,
            fontSize: "14px",
          }}
          lineProps={{
            style: { wordBreak: "break-all", whiteSpace: "pre-wrap" },
          }}
          wrapLines={true}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
