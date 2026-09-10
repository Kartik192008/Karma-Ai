import express from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

const app = express();
const port = Number(process.env.PORT ?? 3000);
const rootDir = process.cwd();
const distDir = join(rootDir, "dist", "public");

console.log(`Starting frontend server in: ${rootDir}`);
console.log(`Expected build directory: ${distDir}`);

if (!existsSync(distDir)) {
  console.error(`Build directory missing: ${distDir}`);
  process.exit(1);
}

const indexPath = join(distDir, "index.html");
if (!existsSync(indexPath)) {
  console.error(`index.html missing at: ${indexPath}`);
  process.exit(1);
}

app.use(express.static(distDir));

app.get("/healthz", (req, res) => {
  res.json({ status: "ok" });
});

app.get("*", (req, res) => {
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error(`Failed to send ${indexPath}:`, err);
      res.status(500).send("Failed to load the application shell.");
    }
  });
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Frontend server listening on port ${port}`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});
