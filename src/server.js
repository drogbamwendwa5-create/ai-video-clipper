import "dotenv/config";
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname as nodeDirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { main as runCli } from "./cli.js";

const projectDir = resolve(nodeDirname(fileURLToPath(import.meta.url)), "..");
const uiDir = join(projectDir, "ui");
const port = Number(process.env.PORT ?? 4181);

const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".mp4": "video/mp4",
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === "/api/process" && request.method === "POST") {
      let body = "";
      for await (const chunk of request) body += chunk;
      const input = JSON.parse(body || "{}");
      if (!input.path && !input.url) throw new Error("Choose a local video or enter a YouTube URL.");
      const sourceArgs = input.url
        ? ["--url", input.url]
        : [input.path];
      const result = await runCli([
        ...sourceArgs,
        "--count", String(input.count ?? 5),
        "--min", String(input.min ?? 20),
        "--max", String(input.max ?? 60),
        "--out", String(input.out ?? "./out"),
        ...(input.force ? ["--force"] : []),
        ...(input.dryRun ? ["--dry-run"] : []),
        ...(input.uppercase ? ["--uppercase"] : []),
      ]);
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(result));
      return;
    }

    let path = url.pathname === "/" ? join(uiDir, "index.html") : join(uiDir, url.pathname.slice(1));
    if (!path.startsWith(uiDir + sep) && path !== uiDir) throw new Error("Not found");
    const info = await stat(path);
    if (info.isDirectory()) path = join(path, "index.html");
    const content = await readFile(path);
    response.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" });
    response.end(content);
  } catch (error) {
    response.writeHead(error.message === "Not found" ? 404 : 400, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`AI Video Clipper is running at http://127.0.0.1:${port}`);
});
