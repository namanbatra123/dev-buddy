"use client";

import React from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
} from "lucide-react";

interface FileItem {
  path: string;
  content: string;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  path?: string;
  children?: FileNode[];
  isOpen?: boolean;
}

interface FileExplorerProps {
  files: FileItem[];
  activeFile: string | null;
  onFileSelect: (filePath: string) => void;
  onToggleFolder?: (folderPath: string) => void;
  openFolders?: Set<string>;
}

export default function FileExplorer({
  files,
  activeFile,
  onFileSelect,
  onToggleFolder,
  openFolders = new Set(),
}: FileExplorerProps) {
  // Build file tree structure from flat file list
  const buildFileTree = (files: FileItem[]): FileNode[] => {
    const root: FileNode[] = [];
    const folderMap = new Map<string, FileNode>();

    files.forEach((file) => {
      const parts = file.path.split("/");
      let currentLevel = root;
      let currentPath = "";

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (isLast) {
          // It's a file
          currentLevel.push({
            name: part,
            type: "file",
            path: file.path,
          });
        } else {
          // It's a folder
          let folder = folderMap.get(currentPath);
          if (!folder) {
            folder = {
              name: part,
              type: "folder",
              path: currentPath,
              children: [],
              isOpen: openFolders.has(currentPath),
            };
            folderMap.set(currentPath, folder);
            currentLevel.push(folder);
          }
          currentLevel = folder.children!;
        }
      });
    });

    return root;
  };

  const renderFileTree = (nodes: FileNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.path || node.name} className="select-none">
        <div
          className={`flex items-center px-2 py-1 hover:bg-[#2a2a2a] cursor-pointer group ${
            activeFile === node.path
              ? "bg-[#37373d] text-white"
              : "text-[#cccccc]"
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => {
            if (node.type === "file" && node.path) {
              onFileSelect(node.path);
            } else if (node.type === "folder" && node.path && onToggleFolder) {
              onToggleFolder(node.path);
            }
          }}
        >
          {node.type === "folder" && (
            <div className="mr-1 text-[#cccccc]">
              {openFolders.has(node.path!) ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </div>
          )}

          <div className="mr-2 text-[#cccccc] flex-shrink-0">
            {node.type === "folder" ? (
              openFolders.has(node.path!) ? (
                <FolderOpen size={16} />
              ) : (
                <Folder size={16} />
              )
            ) : (
              <File size={16} />
            )}
          </div>

          <span className="text-sm truncate" title={node.name}>
            {node.name}
          </span>
        </div>

        {node.type === "folder" &&
          node.children &&
          openFolders.has(node.path!) && (
            <div>{renderFileTree(node.children, depth + 1)}</div>
          )}
      </div>
    ));
  };

  const fileTree = buildFileTree(files);

  return (
    <div className="h-full bg-[#252526] border-r border-[#2d2d30] overflow-y-auto">
      <div className="px-3 py-2 border-b border-[#2d2d30]">
        <h3 className="text-xs font-semibold text-[#cccccc] uppercase tracking-wider">
          Explorer
        </h3>
      </div>
      <div className="py-1">
        {fileTree.length > 0 ? (
          renderFileTree(fileTree)
        ) : (
          <div className="px-3 py-4 text-xs text-[#858585] text-center">
            No files to display
          </div>
        )}
      </div>
    </div>
  );
}
