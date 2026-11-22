import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const host = "0.0.0.0";
const isProduction = process.env.NODE_ENV === "production";

async function startServer() {
  const app = express();

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      root,
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      if (req.method !== "GET") return next();
      try {
        const rawHtml = await fs.promises.readFile(path.join(root, "index.html"), "utf-8");
        const html = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(html);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distDir = path.join(root, "dist");
    app.use(
      express.static(distDir, {
        index: "index.html",
        dotfiles: "ignore",
        setHeaders(res, filePath) {
          if (filePath.endsWith(".webmanifest")) {
            res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
          }
          if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache");
          } else {
            res.setHeader("Cache-Control", "public, max-age=3600");
          }
        },
      })
    );

    app.use((req, res) => {
      if (req.method !== "GET") {
        res.status(404).send("Not found");
        return;
      }
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(port, host, () => {
    console.log(`Garantia server: http://${host}:${port}/`);
  });
}

void startServer();
