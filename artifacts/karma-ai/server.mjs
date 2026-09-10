import express from "express";
import { existsSync, createReadStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = Number(process.env.PORT ?? 3000);
const rootDir = process.cwd();

const distDir = join(rootDir, "dist", "public");

if (!existsSync(distDir)) {
  console.error(`Static frontend directory not found: ${distDir}`);
}

app.use(express.static(distDir));

app.get("/", (req, res) => {
  const indexPath = join(distDir, "index.html");
  if (!existsSync(indexPath)) {
    console.error(`index.html not found at: ${indexPath}`);
    return res.status(500).send("Frontend build output is missing.");
  }
  const stream = createReadStream(indexPath);
  stream.pipe(res);
  stream.on("error", () => {
    if (!res.headersSent) {
      res.status(500).end("Failed to load the application shell.");
    }
  });
});

app.get("*", (req, res) => {
  const indexPath = join(distDir, "index.html");
  if (!existsSync(indexPath)) {
    console.error(`index.html not found at: ${indexPath}`);
    return res.status(500).send("Frontend build output is missing.");
  }
  const stream = createReadStream(indexPath);
  stream.pipe(res);
  stream.on("error", () => {
    if (!res.headersSent) {
      res.status(500).end("Failed to load the application shell.");
    }
  });
});

app.listen(port, () => {
  console.log(`Frontend server listening on port ${port}`);
  console.log(`Serving static files from: ${distDir}`);
});
