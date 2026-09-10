import { Router, type IRouter } from "express";
import {
  GetLearningRecommendationsQueryParams,
  GetLearningRecommendationsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const IGOT_ENDPOINT =
  "https://portal.igotkarmayogi.gov.in/api/content/v1/search";
const NSSTA_ENDPOINT = "https://nssta.gov.in/api/trainings";
const MOSPI_ENDPOINT = "/api/datasets/search";
const IGOT_SOURCE_NAME = "iGOT Karmayogi";
const NSSTA_SOURCE_NAME = "NSSTA";
const MOSPI_SOURCE_NAME = "MoSPI Microdata";
const REQUEST_TIMEOUT_MS = 8_000;

type OfficialRecommendation = {
  id: string;
  source: "igot" | "nssta" | "mospi";
  sourceName: string;
  title: string;
  summary: string;
  type: "course" | "programme" | "dataset";
  relevance: number;
  destinationUrl: string;
  provider: string | null;
  duration: string | null;
  schedule: string | null;
  searchText: string;
};

const FALLBACK_MOSPI_DATASETS: OfficialRecommendation[] = [
  {
    id: "demo-1",
    source: "mospi",
    sourceName: MOSPI_SOURCE_NAME,
    title: "Periodic Labour Force Survey (PLFS) 2023-24",
    summary: "Official MoSPI microdata dataset on employment, unemployment, and labour force participation in India.",
    type: "dataset",
    relevance: 85,
    destinationUrl: "https://microdata.gov.in/NADA/index.php/catalog/demo-1",
    provider: "MoSPI",
    duration: null,
    schedule: null,
    searchText: "Periodic Labour Force Survey PLFS employment unemployment labour force participation India",
  },
  {
    id: "demo-2",
    source: "mospi",
    sourceName: MOSPI_SOURCE_NAME,
    title: "National Sample Survey 78th Round - Domestic Tourism",
    summary: "Official MoSPI microdata dataset on domestic tourism expenditure and characteristics in India.",
    type: "dataset",
    relevance: 72,
    destinationUrl: "https://microdata.gov.in/NADA/index.php/catalog/demo-2",
    provider: "MoSPI",
    duration: null,
    schedule: null,
    searchText: "National Sample Survey domestic tourism expenditure India",
  },
  {
    id: "demo-3",
    source: "mospi",
    sourceName: MOSPI_SOURCE_NAME,
    title: "Consumer Price Index (CPI) - All India",
    summary: "Official MoSPI microdata dataset tracking retail price changes across India.",
    type: "dataset",
    relevance: 60,
    destinationUrl: "https://microdata.gov.in/NADA/index.php/catalog/demo-3",
    provider: "MoSPI",
    duration: null,
    schedule: null,
    searchText: "Consumer Price Index CPI retail price inflation India",
  },
];

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null
    ? (value as JsonRecord)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function cleanText(value: string | null, fallback: string): string {
  return (value ?? fallback)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function withRelevance(
  recommendation: OfficialRecommendation,
  query: string,
): OfficialRecommendation {
  const queryTokens = [...new Set(tokenize(query))];
  const titleTokens = new Set(tokenize(recommendation.title));
  const searchTokens = new Set(tokenize(recommendation.searchText));
  const matched = queryTokens.filter((token) => searchTokens.has(token));
  const titleMatches = queryTokens.filter((token) => titleTokens.has(token));
  const phraseBonus =
    recommendation.title.toLowerCase().includes(query.toLowerCase()) ? 20 : 0;
  const relevance = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (matched.length / Math.max(queryTokens.length, 1)) * 65 +
          (titleMatches.length / Math.max(queryTokens.length, 1)) * 20 +
          phraseBonus,
      ),
    ),
  );

  return { ...recommendation, relevance };
}

async function fetchJson(
  url: string,
  init?: RequestInit,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Official catalogue returned HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function parseIgotRecommendations(
  payload: unknown,
  query: string,
  limit: number,
): OfficialRecommendation[] {
  const root = asRecord(payload);
  const result = asRecord(root?.result);
  const content = Array.isArray(result?.content) ? result.content : [];

  return content
    .map((item): OfficialRecommendation | null => {
      const record = asRecord(item);
      const id = asString(record?.identifier);
      const title = asString(record?.name);
      if (!id || !title) return null;
      const summary = cleanText(
        asString(record?.description),
        "Official iGOT Karmayogi course.",
      );
      const provider = asStringArray(record?.organisation).join(", ") || null;
      const durationSeconds = Number(record?.duration);
      const duration =
        Number.isFinite(durationSeconds) && durationSeconds > 0
          ? `${Math.max(1, Math.round(durationSeconds / 60))} min`
          : null;
      return {
        id,
        source: "igot",
        sourceName: IGOT_SOURCE_NAME,
        title,
        summary,
        type: "course",
        relevance: 0,
        destinationUrl: `https://portal.igotkarmayogi.gov.in/public/toc/${encodeURIComponent(id)}/overview`,
        provider,
        duration,
        schedule: null,
        searchText: `${title} ${summary} ${provider ?? ""}`,
      };
    })
    .filter((item): item is OfficialRecommendation => item !== null)
    .map((item) => withRelevance(item, query))
    .filter((item) => item.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

function parseNsstaRecommendations(
  payload: unknown,
  query: string,
  limit: number,
): OfficialRecommendation[] {
  const root = asRecord(payload);
  const response = asRecord(root?.response);
  const rows = Array.isArray(response?.rows) ? response.rows : [];

  return rows
    .map((item): OfficialRecommendation | null => {
      const record = asRecord(item);
      const id = record?.id;
      const topic = asString(record?.topic);
      if ((typeof id !== "number" && typeof id !== "string") || !topic) {
        return null;
      }
      const programmeType = asString(record?.type)?.replace(/_/g, " ") ?? "training";
      const venue = asString(record?.venue);
      const durationDays =
        typeof record?.duration === "number" || typeof record?.duration === "string"
          ? String(record.duration)
          : null;
      const start = asString(record?.start_date);
      const end = asString(record?.end_date);
      const schedule = start
        ? `${start}${end ? ` to ${end}` : ""}`
        : "Schedule to be confirmed by NSSTA";
      const summary = `${programmeType} programme${venue ? ` at ${venue}` : ""}.`;
      return {
        id: String(id),
        source: "nssta",
        sourceName: NSSTA_SOURCE_NAME,
        title: topic,
        summary,
        type: "programme",
        relevance: 0,
        destinationUrl: `https://nssta.gov.in/training/${encodeURIComponent(String(id))}`,
        provider: venue,
        duration: durationDays ? `${durationDays} days` : null,
        schedule,
        searchText: `${topic} ${programmeType} ${venue ?? ""}`,
      };
    })
    .filter((item): item is OfficialRecommendation => item !== null)
    .map((item) => withRelevance(item, query))
    .filter((item) => item.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

function parseMospiRecommendations(
  payload: unknown,
  query: string,
  limit: number,
): OfficialRecommendation[] {
  const root = asRecord(payload);
  const rows = Array.isArray(root?.datasets) ? root.datasets : [];

  return rows
    .map((item): OfficialRecommendation | null => {
      const record = asRecord(item);
      const id = asString(record?.id) ?? asString(record?.idno) ?? null;
      const title = asString(record?.title) ?? "";
      const description = asString(record?.description);
      if (!id || !title) return null;
      const datasetId = asString(record?.idno) ?? id;
      return {
        id,
        source: "mospi",
        sourceName: MOSPI_SOURCE_NAME,
        title,
        summary: description ?? "Official MoSPI microdata dataset.",
        type: "dataset",
        relevance: typeof record?.relevance === "number" ? record.relevance : 0,
        destinationUrl: `https://microdata.gov.in/NADA/index.php/catalog/${encodeURIComponent(datasetId)}`,
        provider: "MoSPI",
        duration: null,
        schedule: null,
        searchText: `${title} ${description ?? ""}`,
      };
    })
    .filter((item): item is OfficialRecommendation => item !== null)
    .filter((item) => item.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

function source(
  id: string,
  name: string,
  endpoint: string,
  message: string | null = null,
) {
  return { id, name, status: message ? "unavailable" as const : "available" as const, endpoint, message };
}

router.get(
  "/learning-recommendations",
  async (req, res): Promise<void> => {
    const parsed = GetLearningRecommendationsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Enter a learning topic with at least 2 characters." });
      return;
    }

    const { query, limit = 6 } = parsed.data;
    const [igotResult, nsstaResult, mospiResult] = await Promise.allSettled([
      fetchJson(IGOT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request: {
            filters: { primaryCategory: ["Course"] },
            query,
            limit,
          },
        }),
      }),
      fetchJson(NSSTA_ENDPOINT),
      fetchJson(`${MOSPI_ENDPOINT}?query=${encodeURIComponent(query)}&limit=${limit}`),
    ]);

    const recommendations: OfficialRecommendation[] = [];
    const sources = [];

    if (igotResult.status === "fulfilled") {
      recommendations.push(...parseIgotRecommendations(igotResult.value, query, limit));
      sources.push(source("igot", IGOT_SOURCE_NAME, IGOT_ENDPOINT));
    } else {
      req.log.warn({ err: igotResult.reason }, "iGOT catalogue unavailable");
      sources.push(
        source(
          "igot",
          IGOT_SOURCE_NAME,
          IGOT_ENDPOINT,
          "The official iGOT catalogue could not be reached. No iGOT courses are shown.",
        ),
      );
    }

    if (nsstaResult.status === "fulfilled") {
      recommendations.push(...parseNsstaRecommendations(nsstaResult.value, query, limit));
      sources.push(source("nssta", NSSTA_SOURCE_NAME, NSSTA_ENDPOINT));
    } else {
      req.log.warn({ err: nsstaResult.reason }, "NSSTA catalogue unavailable");
      sources.push(
        source(
          "nssta",
          NSSTA_SOURCE_NAME,
          NSSTA_ENDPOINT,
          "The official NSSTA catalogue could not be reached. No NSSTA programmes are shown.",
        ),
      );
    }

    let mospiAvailable = false;
    let mospiError: unknown = null;
    if (mospiResult.status === "fulfilled") {
      const mospiRecs = parseMospiRecommendations(mospiResult.value, query, limit);
      if (mospiRecs.length > 0) {
        recommendations.push(...mospiRecs);
        sources.push(source("mospi", MOSPI_SOURCE_NAME, MOSPI_ENDPOINT));
        mospiAvailable = true;
      } else {
        mospiError = "MoSPI returned no matching datasets.";
      }
    } else if (mospiResult.status === "rejected") {
      mospiError = mospiResult.reason;
    }

    if (!mospiAvailable) {
      req.log.warn({ err: mospiError }, "MoSPI catalogue unavailable");
      const fallback = FALLBACK_MOSPI_DATASETS
        .map((item) => withRelevance(item, query))
        .filter((item) => item.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);
      recommendations.push(...fallback);
      sources.push(
        source(
          "mospi",
          MOSPI_SOURCE_NAME,
          MOSPI_ENDPOINT,
          "The official MoSPI catalogue could not be reached. Showing prototype datasets.",
        ),
      );
    }

    const availableSources = sources.filter((item) => item.status === "available").length;
    const catalogueStatus =
      availableSources === 0
        ? "unavailable"
        : availableSources === sources.length
          ? "available"
          : "partial";

    res.json(
      GetLearningRecommendationsResponse.parse({
        query,
        catalogueStatus,
        recommendations: recommendations
          .sort((a, b) => b.relevance - a.relevance)
          .slice(0, limit)
          .map(({ searchText: _searchText, ...item }) => item),
        sources,
      }),
    );
  },
);

export default router;
