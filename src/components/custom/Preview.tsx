import React, { useEffect, useRef, useState } from "react";
import {
  initWebContainer,
  applyProjectFiles,
  installDependenciesIfNeeded,
  startDevServer,
  isServerRunning,
  getLastServerUrl,
  stopDevServer,
} from "@/lib/webcontainer";
import { FileItem } from "@/lib/types";
import { LoadingSpinner } from "../ui/loading-spinner";
import { RefreshCw, Play, RotateCcw, Square, Check } from "lucide-react";

interface PreviewProps {
  projectFiles: FileItem[];
  visible: boolean;
}

export default function Preview({ projectFiles, visible }: PreviewProps) {
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<string>("Idle");
  const [error, setError] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!visible) return;
    if (isServerRunning()) {
      setServerUrl(getLastServerUrl());
      setStage("Ready");
      setLoading(false);
      setError(null);
    } else {
      setServerUrl(null);
      setStage("Idle");
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !isServerRunning()) return;

    const id = setTimeout(async () => {
      try {
        setStage("Applying changes...");
        await applyProjectFiles(projectFiles);
        if (iframeRef.current && serverUrl) {
          iframeRef.current.src = serverUrl + "?t=" + Date.now();
        }
        await installDependenciesIfNeeded();
        setStage("Ready");
      } catch (e) {}
    }, 250);

    return () => clearTimeout(id);
  }, [projectFiles, visible, serverUrl]);

  const handleStart = async () => {
    try {
      setLoading(true);
      setError(null);
      setStage("Booting WebContainer...");
      await initWebContainer();

      setStage("Applying project files...");
      await applyProjectFiles(projectFiles);

      setStage("Installing dependencies (if needed)...");
      await installDependenciesIfNeeded();

      setStage("Starting dev server...");
      const url = await startDevServer();
      setServerUrl(url);
      setStage("Ready");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to start preview.");
      setStage("Idle");
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    try {
      setLoading(true);
      setError(null);

      setStage("Applying project files...");
      await applyProjectFiles(projectFiles);

      setStage("Installing dependencies (if needed)...");
      await installDependenciesIfNeeded();

      setStage("Restarting server...");
      await stopDevServer();
      const url = await startDevServer(true);
      setServerUrl(url);
      setStage("Ready");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to restart.");
      setStage("Idle");
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setLoading(true);
      setStage("Stopping...");
      await stopDevServer();
      setServerUrl(null);
      setStage("Idle");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to stop.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshIframe = () => {
    if (iframeRef.current && serverUrl) {
      iframeRef.current.src = serverUrl + "?t=" + Date.now();
    }
  };

  const handleApplyOnly = async () => {
    try {
      setLoading(true);
      setStage("Applying changes...");
      await applyProjectFiles(projectFiles);
      await installDependenciesIfNeeded();
      if (iframeRef.current && serverUrl) {
        iframeRef.current.src = serverUrl + "?t=" + Date.now();
      }
      setStage("Ready");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to apply changes.");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;
  const running = !!serverUrl && isServerRunning();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-[#2a2a2a] px-4 py-2">
        <h2 className="text-sm font-medium">Preview</h2>
        <div className="flex items-center gap-2">
          {!running && (
            <button
              className="px-2 py-1 text-sm rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
              onClick={handleStart}
              disabled={loading || projectFiles.length === 0}
              title="Start Preview"
            >
              <div className="flex items-center gap-1">
                <Play className="h-4 w-4" />
                Start
              </div>
            </button>
          )}
          {running && (
            <>
              <button
                className="px-2 py-1 text-sm rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
                onClick={handleApplyOnly}
                disabled={loading}
                title="Apply code changes without restart"
              >
                <div className="flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  Apply
                </div>
              </button>

              <button
                className="p-1 rounded hover:bg-zinc-700 disabled:opacity-50"
                onClick={handleRefreshIframe}
                disabled={loading || !serverUrl}
                title="Refresh iframe"
              >
                <RefreshCw className="h-4 w-4" />
              </button>

              <button
                className="px-2 py-1 text-sm rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
                onClick={handleRestart}
                disabled={loading}
                title="Restart dev server"
              >
                <div className="flex items-center gap-1">
                  <RotateCcw className="h-4 w-4" />
                  Restart
                </div>
              </button>

              <button
                className="px-2 py-1 text-sm rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50"
                onClick={handleStop}
                disabled={loading}
                title="Stop dev server"
              >
                <div className="flex items-center gap-1">
                  <Square className="h-4 w-4" />
                  Stop
                </div>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 bg-zinc-900 relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 bg-opacity-80">
            <LoadingSpinner />
            <p className="ml-2 text-sm text-zinc-300 mt-2">{stage}</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-zinc-900">
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button
              className="px-3 py-1 text-sm bg-zinc-800 rounded hover:bg-zinc-700"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {running && !loading && !error && serverUrl && (
          <iframe
            ref={iframeRef}
            src={serverUrl}
            className="w-full h-full border-0"
            title="Code Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
          />
        )}

        {!running && !loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-zinc-300">
            <p className="text-sm mb-3">Preview is idle.</p>
            <button
              className="px-3 py-1 text-sm bg-zinc-800 rounded hover:bg-zinc-700 disabled:opacity-50"
              onClick={handleStart}
              disabled={projectFiles.length === 0}
            >
              Start Preview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
