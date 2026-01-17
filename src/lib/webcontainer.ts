import { WebContainer } from "@webcontainer/api";
import { logger } from "./logger";

let webcontainerInstance: WebContainer | null = null;
let isBooting = false;
let currentServerProcess: { kill: () => void; exit?: Promise<number> } | null =
  null;
let lastServerUrl: string | null = null;
let lastDepsKey: string | null = null;
let lastFilesHash: string | null = null;
let lastPort: number | null = null;

const lastFileHashes = new Map<string, string>();

export async function initWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) return webcontainerInstance;

  if (isBooting) {
    while (isBooting) await new Promise((r) => setTimeout(r, 100));
    if (webcontainerInstance) return webcontainerInstance;
  }

  try {
    isBooting = true;
    webcontainerInstance = await WebContainer.boot();
    return webcontainerInstance;
  } catch (error) {
    logger?.error?.("Failed to boot WebContainer", error);
    throw error;
  } finally {
    isBooting = false;
  }
}

export function getWebContainer(): WebContainer {
  if (!webcontainerInstance) {
    throw new Error(
      "WebContainer not initialized. Call initWebContainer() first."
    );
  }
  return webcontainerInstance;
}

function simpleChecksum(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}
function fileHash(s: string) {
  return simpleChecksum(s);
}
function filesHash(files: { path: string; content: string }[]) {
  const s = files
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((f) => `${f.path}:${f.content.length}:${simpleChecksum(f.content)}`)
    .join("|");
  return simpleChecksum(s);
}
function depsKey(pkg: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
}) {
  return JSON.stringify({
    d: pkg?.dependencies || {},
    dev: pkg?.devDependencies || {},
    engines: pkg?.engines || {},
  });
}
function dirOf(p: string) {
  const i = p.lastIndexOf("/");
  return i <= 0 ? "" : p.slice(0, i);
}

async function isPortOpen(port: number): Promise<boolean> {
  const wc = getWebContainer();
  const p = await wc.spawn("node", [
    "-e",
    `
const net = require('net');
const s = net.connect(${port}, '127.0.0.1');
s.once('connect', () => process.exit(0));
s.once('error', () => process.exit(1));
setTimeout(() => process.exit(2), 300);
    `,
  ]);
  const code = await p.exit;
  return code === 0;
}

async function waitForPortToClose(port: number, timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const open = await isPortOpen(port).catch(() => false);
    if (!open) return;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Port ${port} is still busy after ${timeoutMs}ms`);
}

async function getPreferredPort(): Promise<number> {
  const wc = getWebContainer();
  try {
    const text = await wc.fs.readFile("package.json", "utf-8");
    const pkg = JSON.parse(text);
    const has = (n: string) =>
      !!(pkg.dependencies?.[n] || pkg.devDependencies?.[n]);

    if (pkg.scripts?.start && /--port\s+(\d+)/.test(pkg.scripts.start)) {
      return parseInt(pkg.scripts.start.match(/--port\s+(\d+)/)![1], 10);
    }
    if (has("vite")) return 5173;
    if (has("next") || has("react-scripts") || has("serve")) return 3000;
  } catch {
    // ignore - fallback to default port
  }
  return 3000;
}

export async function writeFilesIfChanged(
  files: { path: string; content: string }[]
): Promise<void> {
  const wc = getWebContainer();
  const nextHash = filesHash(files);
  if (lastFilesHash === nextHash) {
    return;
  }

  try {
    const root = await wc.fs.readdir("/", { withFileTypes: true });
    for (const entry of root) {
      if (entry.name === "node_modules") continue;
      try {
        await wc.fs.rm(`/${entry.name}`, { recursive: true, force: true });
      } catch {
        // ignore - best effort cleanup
      }
    }
  } catch {
    // ignore - filesystem might be empty
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tree: Record<string, any> = {};
  for (const f of files) {
    const parts = f.path.split("/").filter(Boolean);
    let cursor = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      cursor[p] = cursor[p] || { directory: {} };
      cursor = cursor[p].directory;
    }
    cursor[parts[parts.length - 1]] = { file: { contents: f.content } };
  }

  await wc.mount(tree);
  lastFilesHash = nextHash;

  for (const f of files) lastFileHashes.set(f.path, fileHash(f.content));
}

export async function syncFilesIncremental(
  files: { path: string; content: string }[]
): Promise<void> {
  const wc = getWebContainer();

  for (const f of files) {
    const h = fileHash(f.content);
    if (lastFileHashes.get(f.path) === h) continue;

    const dir = dirOf(f.path);
    if (dir) {
      try {
        await wc.fs.mkdir(dir, { recursive: true });
      } catch {}
    }
    await wc.fs.writeFile(f.path, f.content);
    lastFileHashes.set(f.path, h);
  }
}

export async function applyProjectFiles(
  files: { path: string; content: string }[]
): Promise<void> {
  if (!lastFilesHash) {
    await writeFilesIfChanged(files);
    return;
  }
  await syncFilesIncremental(files);
}

export async function installDependenciesIfNeeded(): Promise<void> {
  const wc = getWebContainer();

  let pkgText: string;
  try {
    pkgText = await wc.fs.readFile("package.json", "utf-8");
  } catch {
    console.log("No package.json found. Skipping install.");
    return;
  }

  const pkg = JSON.parse(pkgText);
  const key = depsKey(pkg);

  const cachedKey = localStorage.getItem("webcontainer-deps-key");
  const hasCachedNodeModules =
    localStorage.getItem("webcontainer-node-modules") === "true";

  const hasNodeModules = await wc.fs
    .readdir("/node_modules")
    .then(() => true)
    .catch(() => false);

  if (
    lastDepsKey === key &&
    hasNodeModules &&
    cachedKey === key &&
    hasCachedNodeModules
  ) {
    console.log("Dependencies unchanged and cached; skipping npm install.");
    return;
  }

  const proc = await wc.spawn("yarn", ["install", "--prefer-offline"]);
  proc.output.pipeTo(
    new WritableStream({
      write(data) {
        const clean = data.replace(/\x1b\[[0-9;]*[mGK]/g, "");
        if (/error|failed/i.test(clean)) console.log(clean);
      },
    })
  );
  const code = await proc.exit;
  if (code !== 0) throw new Error(`yarn install failed with exit code ${code}`);

  lastDepsKey = key;
  localStorage.setItem("webcontainer-deps-key", key);
  localStorage.setItem("webcontainer-node-modules", "true");
}

// ---------- Server lifecycle ----------
export function isServerRunning(): boolean {
  return !!currentServerProcess && !!lastServerUrl;
}

export function getLastServerUrl(): string | null {
  return lastServerUrl;
}

export async function stopDevServer(): Promise<void> {
  if (!currentServerProcess) return;
  try {
    await currentServerProcess.kill();
    if (lastPort) {
      try {
        await waitForPortToClose(lastPort, 8000);
      } catch {
        // ignore - port cleanup is best effort
      }
    }
  } catch {
    // ignore - process might already be dead
  } finally {
    currentServerProcess = null;
    lastServerUrl = null;
  }
}

export async function startDevServer(force = false): Promise<string> {
  const wc = getWebContainer();

  if (currentServerProcess && !force && lastServerUrl) {
    return lastServerUrl;
  }

  if (force) {
    await stopDevServer();
  }

  let startScript = "npm start";
  try {
    const text = await wc.fs.readFile("package.json", "utf-8");
    const pkg = JSON.parse(text);
    if (pkg.scripts?.start) startScript = "npm start";
    else if (pkg.scripts?.dev) startScript = "npm run dev";
    else startScript = "npx serve -s .";
  } catch {
    startScript = "npx serve -s .";
  }

  const preferredPort = await getPreferredPort();
  lastPort = preferredPort;

  const startCmd = `PORT=${preferredPort} BROWSER=none ${startScript}`;
  const proc = await wc.spawn("sh", ["-lc", startCmd]);
  currentServerProcess = proc;

  const writer = proc.input.getWriter();
  proc.output.pipeTo(
    new WritableStream({
      async write(chunk) {
        const text = chunk.replace(/\x1b\[[0-9;]*[mGK]/g, "");
        if (text.includes("Something is already running on port")) {
          await writer.write("n\n");
        }
        if (/error|failed/i.test(text)) {
          console.log("Server:", text.split("\n")[0]);
        }
      },
    })
  );

  return await new Promise<string>((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error("Server startup timeout after 45 seconds"));
      }
    }, 45_000);

    const off = (
      wc as {
        on?: (
          event: string,
          callback: (port: number, url: string) => void
        ) => () => void;
      }
    ).on?.("server-ready", (port: number, url: string) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeout);
      try {
        if (typeof off === "function") off();
      } catch {
        // ignore - cleanup function might not exist
      }
      lastServerUrl = url;
      resolve(url);
    });

    proc.exit.then(async (code: number) => {
      if (!resolved) {
        clearTimeout(timeout);
        if (lastPort) {
          try {
            await waitForPortToClose(lastPort, 4000);
          } catch {}
        }
        reject(new Error(`Server process exited early (code ${code})`));
      }
      currentServerProcess = null;
      lastServerUrl = null;
    });
  });
}

export function resetWebContainer(): void {
  webcontainerInstance = null;
  isBooting = false;
  currentServerProcess = null;
  lastServerUrl = null;
  lastDepsKey = null;
  lastFilesHash = null;
  lastPort = null;
  lastFileHashes.clear();
}
