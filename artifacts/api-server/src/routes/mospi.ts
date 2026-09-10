import { Router, type IRouter } from "express";

const router: IRouter = Router();

const MOSPI_BASE_URL = "https://microdata.gov.in/NADA/index.php/api";
const REQUEST_TIMEOUT_MS = 8_000;

function getApiKey(): string | undefined {
  return process.env.MOSPI_API_KEY ?? undefined;
}

async function mospiFetch(path: string, apiKey: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${MOSPI_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "X-API-KEY": apiKey,
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function relevanceScore(dataset: { title: string; description: string | null }, query: string): number {
  const queryTokens = [...new Set(tokenize(query))];
  const titleTokens = new Set(tokenize(dataset.title));
  const descTokens = new Set(tokenize(dataset.description ?? ""));
  const matched = queryTokens.filter((token) => titleTokens.has(token) || descTokens.has(token));
  const titleMatches = queryTokens.filter((token) => titleTokens.has(token));
  const phraseBonus = dataset.title.toLowerCase().includes(query.toLowerCase()) ? 20 : 0;
  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (matched.length / Math.max(queryTokens.length, 1)) * 60 +
          (titleMatches.length / Math.max(queryTokens.length, 1)) * 25 +
          phraseBonus,
      ),
    ),
  );
}

router.get("/datasets/search", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({ error: "MoSPI API key is not configured." });
    return;
  }

  const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
  const limit = Math.max(1, Math.min(Number(req.query.limit ?? 12), 50));

  try {
    const pageParam = query ? `&query=${encodeURIComponent(query)}` : "";
    const response = await mospiFetch(`/listdatasets?page=1${pageParam}`, apiKey);
    if (!response.ok) {
      res.status(502).json({ error: `MoSPI catalogue returned HTTP ${response.status}.` });
      return;
    }

    const payload = (await response.json()) as {
      result?: {
        rows?: Array<Record<string, unknown>>;
        total?: number;
        limit?: number;
      };
    };

    const rows = Array.isArray(payload?.result?.rows) ? payload.result.rows : [];
    const datasets = rows.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        id: typeof record.id === "number" || typeof record.id === "string" ? String(record.id) : String(record.idno ?? record.id),
        idno: typeof record.idno === "string" ? record.idno : null,
        title: typeof record.title === "string" ? record.title : (typeof record.name === "string" ? record.name : ""),
        description: typeof record.description === "string" ? record.description : null,
      };
    });

    const ranked = datasets
      .map((dataset) => ({
        ...dataset,
        relevance: query ? relevanceScore(dataset, query) : 50,
      }))
      .filter((item) => item.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);

    res.json({
      query: query || null,
      total: typeof payload?.result?.total === "number" ? payload.result.total : datasets.length,
      datasets: ranked,
    });
  } catch {
    res.status(502).json({ error: "MoSPI catalogue could not be reached. Please try again." });
  }
});

router.get("/datasets", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({ error: "MoSPI API key is not configured." });
    return;
  }

  const page = Math.max(1, Math.min(Number(req.query.page ?? 1), 100));
  const query = typeof req.query.query === "string" ? req.query.query.trim() : "";

  try {
    const params = new URLSearchParams({ page: String(page) });
    if (query) params.set("query", query);

    const response = await mospiFetch(`/listdatasets?${params.toString()}`, apiKey);
    if (!response.ok) {
      res.status(502).json({ error: `MoSPI catalogue returned HTTP ${response.status}.` });
      return;
    }

    const payload = (await response.json()) as {
      result?: {
        rows?: Array<Record<string, unknown>>;
        total?: number;
        limit?: number;
      };
    };

    const rows = Array.isArray(payload?.result?.rows) ? payload.result.rows : [];
    const datasets = rows.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        id: typeof record.id === "number" || typeof record.id === "string" ? String(record.id) : String(record.idno ?? record.id),
        idno: typeof record.idno === "string" ? record.idno : null,
        title: typeof record.title === "string" ? record.title : (typeof record.name === "string" ? record.name : ""),
        description: typeof record.description === "string" ? record.description : null,
      };
    });

    res.json({
      page,
      query: query || null,
      total: typeof payload?.result?.total === "number" ? payload.result.total : datasets.length,
      datasets,
    });
  } catch {
    res.status(502).json({ error: "MoSPI catalogue could not be reached. Please try again." });
  }
});

router.get("/datasets/:id", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({ error: "MoSPI API key is not configured." });
    return;
  }

  const datasetId = String(req.params.id ?? "").trim();
  if (!datasetId) {
    res.status(400).json({ error: "Dataset id is required." });
    return;
  }

  try {
    const response = await mospiFetch(`/datasets/${encodeURIComponent(datasetId)}/fileslist`, apiKey);
    if (!response.ok) {
      res.status(502).json({ error: `MoSPI dataset metadata returned HTTP ${response.status}.` });
      return;
    }

    const payload = (await response.json()) as { files?: Array<Record<string, unknown>> };
    const files = Array.isArray(payload?.files)
      ? payload.files.map((file) => {
          const record = file as Record<string, unknown>;
          return {
            name: typeof record.name === "string" ? record.name : "",
            base64: typeof record.base64 === "string" ? record.base64 : null,
            size: typeof record.size === "number" ? record.size : null,
          };
        })
      : [];

    res.json({ datasetId, files });
  } catch {
    res.status(502).json({ error: "MoSPI dataset metadata could not be fetched. Please try again." });
  }
});

router.get("/datasets/:id/files/:filename/download", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({ error: "MoSPI API key is not configured." });
    return;
  }

  const datasetId = String(req.params.id ?? "").trim();
  const filename = String(req.params.filename ?? "").trim();

  if (!datasetId || !filename) {
    res.status(400).json({ error: "Dataset id and filename are required." });
    return;
  }

  try {
    const filesResponse = await mospiFetch(`/datasets/${encodeURIComponent(datasetId)}/fileslist`, apiKey);
    if (!filesResponse.ok) {
      res.status(502).json({ error: `MoSPI files list returned HTTP ${filesResponse.status}.` });
      return;
    }

    const filesPayload = (await filesResponse.json()) as { files?: Array<Record<string, unknown>> };
    const files = Array.isArray(filesPayload?.files) ? filesPayload.files : [];
    const match = files.find((file) => typeof file.name === "string" && file.name === filename);

    if (!match || typeof match.base64 !== "string") {
      res.status(404).json({ error: `File '${filename}' not found in dataset '${datasetId}'.` });
      return;
    }

    const downloadUrl = `${MOSPI_BASE_URL}/fileslist/download/${encodeURIComponent(datasetId)}/${encodeURIComponent(match.base64)}`;
    const downloadResponse = await mospiFetch(downloadUrl, apiKey);

    if (!downloadResponse.ok || !downloadResponse.body) {
      res.status(502).json({ error: "MoSPI file could not be downloaded. Please try again." });
      return;
    }

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    downloadResponse.body.pipe(res);
  } catch {
    res.status(502).json({ error: "MoSPI file download failed. Please try again." });
  }
});

export default router;
