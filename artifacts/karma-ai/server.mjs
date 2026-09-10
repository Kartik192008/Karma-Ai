import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = Number(process.env.PORT ?? 3000);

const distDir = join(__dirname, "dist", "public");

app.use(express.static(distDir, { index: false }));

app.get("*", (req, res) => {
  res.sendFile(join(distDir, "index.html"), (err) => {
    if (err) {
      res.status(500).end("Failed to load the application shell.");
    }
  });
});

app.listen(port, () => {
  console.log(`Frontend server listening on port ${port}`);
});
