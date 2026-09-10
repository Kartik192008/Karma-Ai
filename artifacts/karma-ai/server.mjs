import express from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";

const app = express();
const port = Number(process.env.PORT ?? 3000);
const distDir = join(process.cwd(), "dist", "public");

if (!existsSync(join(distDir, "index.html"))) {
  console.error(`Frontend build output missing in: ${distDir}`);
  process.exit(1);
}

app.use(express.static(distDir));

app.get("/healthz", (req, res) => {
  res.json({ status: "ok" });
});

app.get("*", (req, res) => {
  res.sendFile(join(distDir, "index.html"), (err) => {
    if (err) {
      res.status(500).send("Failed to load the application shell.");
    }
  });
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Frontend server listening on port ${port}`);
  console.log(`Serving static files from: ${distDir}`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});
