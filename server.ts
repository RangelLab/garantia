import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = Bun.serve({
  port: Number(Bun.env.PORT || 8091),
  hostname: "0.0.0.0",
  async fetch(request) {
    const url = new URL(request.url);
    const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    if (relativePath.split("/").some((part) => part === "..")) {
      return new Response("Not found", { status: 404 });
    }
    const file = Bun.file(join(root, relativePath));
    if (!(await file.exists())) return new Response("Not found", { status: 404 });
    const extension = relativePath.match(/\.[^.]+$/)?.[0] || "";
    return new Response(file, {
      headers: {
        "Content-Type": mimeTypes[extension] || "application/octet-stream",
        "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=3600",
      },
    });
  },
});

console.log(`Garantia dev server: http://localhost:${server.port}/`);
