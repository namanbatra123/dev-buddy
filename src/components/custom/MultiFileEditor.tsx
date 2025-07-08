"use client";

import React, { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";

interface MultiFileEditorProps {
  files: { path: string; content: string }[];
  activeFile: string | null;
  onChange?: (filePath: string, value: string) => void;
  readOnly?: boolean;
}

export default function MultiFileEditor({
  files,
  activeFile,
  onChange,
  readOnly = false,
}: MultiFileEditorProps) {
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly });
    }
  }, [readOnly]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Configure Monaco theme - VS Code Dark+
    monaco.editor.defineTheme("vs-code-dark-plus", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "#6A9955", fontStyle: "italic" },
        { token: "keyword", foreground: "#569CD6" },
        { token: "string", foreground: "#CE9178" },
        { token: "number", foreground: "#B5CEA8" },
        { token: "function", foreground: "#DCDCAA" },
        { token: "variable", foreground: "#9CDCFE" },
        { token: "type", foreground: "#4EC9B0" },
        { token: "class", foreground: "#4EC9B0" },
        { token: "interface", foreground: "#B8D7A3" },
        { token: "namespace", foreground: "#4EC9B0" },
        { token: "parameter", foreground: "#9CDCFE" },
        { token: "property", foreground: "#9CDCFE" },
        { token: "method", foreground: "#DCDCAA" },
        { token: "regexp", foreground: "#D16969" },
        { token: "tag", foreground: "#569CD6" },
        { token: "attribute.name", foreground: "#9CDCFE" },
        { token: "attribute.value", foreground: "#CE9178" },
      ],
      colors: {
        "editor.background": "#1e1e1e",
        "editor.foreground": "#D4D4D4",
        "editorCursor.foreground": "#AEAFAD",
        "editor.lineHighlightBackground": "#2e2e2e",
        "editorLineNumber.foreground": "#858585",
        "editorLineNumber.activeForeground": "#c6c6c6",
        "editor.selectionBackground": "#264F78",
        "editor.inactiveSelectionBackground": "#3A3D41",
        "editorIndentGuide.background": "#404040",
        "editorIndentGuide.activeBackground": "#707070",
        "editor.selectionHighlightBackground": "#ADD6FF26",
        "editorBracketMatch.background": "#0064001a",
        "editorBracketMatch.border": "#888888",
        "editorGutter.background": "#1e1e1e",
        "editorWidget.background": "#252526",
        "editorWidget.border": "#454545",
        "editorSuggestWidget.background": "#252526",
        "editorSuggestWidget.border": "#454545",
        "editorSuggestWidget.selectedBackground": "#094771",
        "editorHoverWidget.background": "#252526",
        "editorHoverWidget.border": "#454545",
        "peekView.border": "#007ACC",
        "peekViewEditor.background": "#001F33",
        "peekViewResult.background": "#252526",
        "peekViewTitle.background": "#1E1E1E",
        "scrollbar.shadow": "#000000",
        "scrollbarSlider.background": "#79797966",
        "scrollbarSlider.hoverBackground": "#646464b3",
        "scrollbarSlider.activeBackground": "#bfbfbf66",
      },
    });

    monaco.editor.setTheme("vs-code-dark-plus");

    // Setup keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Save functionality will be implemented here
    });

    // Format on paste
    editor.onDidPaste(() => {
      setTimeout(() => {
        editor.getAction("editor.action.formatDocument")?.run();
      }, 100);
    });

    // Auto format on type for certain characters
    editor.onDidType((text: string) => {
      if ([";", "}", ")", "]"].includes(text)) {
        setTimeout(() => {
          editor.getAction("editor.action.formatDocument")?.run();
        }, 100);
      }
    });
  };

  // Detect language from file extension
  const getLanguageFromPath = (filePath: string): string => {
    const extension = filePath.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "js":
      case "mjs":
        return "javascript";
      case "jsx":
        return "javascriptreact";
      case "ts":
        return "typescript";
      case "tsx":
        return "typescriptreact";
      case "html":
      case "htm":
        return "html";
      case "css":
        return "css";
      case "scss":
      case "sass":
        return "scss";
      case "json":
        return "json";
      case "md":
      case "markdown":
        return "markdown";
      case "py":
        return "python";
      case "java":
        return "java";
      case "cpp":
      case "c++":
      case "cc":
        return "cpp";
      case "c":
      case "h":
        return "c";
      case "php":
        return "php";
      case "rb":
        return "ruby";
      case "go":
        return "go";
      case "rs":
        return "rust";
      case "xml":
        return "xml";
      case "yaml":
      case "yml":
        return "yaml";
      case "sql":
        return "sql";
      case "sh":
      case "bash":
        return "shell";
      default:
        return "plaintext";
    }
  };

  // Find the active file content
  const activeFileContent = activeFile
    ? files.find((f) => f.path === activeFile)?.content || ""
    : "";

  const activeLanguage = activeFile
    ? getLanguageFromPath(activeFile)
    : "plaintext";

  if (!activeFile) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1e1e1e] text-[#cccccc]">
        <div className="text-center">
          <div className="text-6xl mb-4">📁</div>
          <div className="text-xl mb-2 font-medium">No file selected</div>
          <div className="text-sm text-[#858585]">
            Select a file from the explorer to start editing
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#1e1e1e]">
      <Editor
        height="100%"
        defaultLanguage={activeLanguage}
        language={activeLanguage}
        value={activeFileContent}
        onChange={(value) => {
          if (onChange && activeFile && value !== undefined) {
            onChange(activeFile, value);
          }
        }}
        onMount={handleEditorDidMount}
        options={{
          fontSize: 14,
          fontFamily:
            "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
          fontLigatures: true,
          lineNumbers: "on",
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: true,
          renderWhitespace: "selection",
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          suggest: {
            showKeywords: true,
            showSnippets: true,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
          folding: true,
          foldingStrategy: "indentation",
          showFoldingControls: "mouseover",
          unfoldOnClickAfterEndOfLine: false,
          smoothScrolling: true,
          cursorBlinking: "blink",
          cursorSmoothCaretAnimation: "on",
          multiCursorModifier: "ctrlCmd",
          selectionHighlight: true,
          occurrencesHighlight: "singleFile",
          codeLens: false,
          rulers: [80, 120],
          renderLineHighlight: "line",
          readOnly,
          contextmenu: true,
          mouseWheelZoom: true,
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  );
}
