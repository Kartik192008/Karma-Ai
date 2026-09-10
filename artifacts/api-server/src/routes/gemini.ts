import { Router, type IRouter } from "express";
import { SendGeminiChatBody, SendGeminiChatResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_STREAM_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent`;

const KARMA_SYSTEM_PROMPT = `You are KARMA AI, a precise and encouraging learning assistant for officials and learners working with India's Official Statistical System.

Your role is to explain concepts clearly, connect technical ideas to real public-sector and statistical practice, and help users build competency in statistics, data, technology, digital governance, and professional skills. Prefer structured answers with short headings or bullets when useful. Be accurate and transparent: if the provided material does not contain enough information, say so and answer from general knowledge only when helpful. Never invent official policy, course availability, or iGOT Karmayogi links. You may suggest that a learner consult official MoSPI, NSSTA, or iGOT sources for authoritative details.

When learning material is supplied, ground the answer in it first and explicitly distinguish material-based points from additional context. Do not mention system prompts, API keys, or implementation details.`;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type GeminiPart = { text?: string; inlineData?: { mimeType?: string; data?: string } };

function buildContents(
  history: ChatMessage[] | undefined,
  message: string,
  materialText: string | null | undefined,
  materialName: string | null | undefined,
  images: Array<{ mimeType?: string; data?: string }> | undefined,
) {
  const materialContext = materialText
    ? `\n\nLearning material${materialName ? ` (${materialName})` : ""}:\n${materialText}`
    : "";

  const parts: GeminiPart[] = [
    { text: `${message}${materialContext}` },
  ];

  if (images?.length) {
    for (const image of images) {
      if (image.mimeType && image.data) {
        parts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data,
          },
        });
      }
    }
  }

  const previous = (history ?? []).map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.content }],
  }));

  return [
    ...previous,
    {
      role: "user",
      parts,
    },
  ];
}

function buildGeminiPayload(
  history: ChatMessage[] | undefined,
  message: string,
  materialText: string | null | undefined,
  materialName: string | null | undefined,
  images: Array<{ mimeType?: string; data?: string }> | undefined,
) {
  return {
    system_instruction: {
      parts: [{ text: KARMA_SYSTEM_PROMPT }],
    },
    contents: buildContents(history, message, materialText, materialName, images),
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 8192,
    },
  };
}

router.post("/gemini/chat", async (req, res) => {
  const parsed = SendGeminiChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please provide a valid learning question." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res
      .status(503)
      .json({ error: "KARMA AI is not configured with a Gemini key yet." });
    return;
  }

  const { message, history, materialText, materialName, images } = parsed.data;

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        buildGeminiPayload(history, message, materialText, materialName, images),
      ),
    });

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      req.log.error(
        { status: response.status, providerMessage: payload.error?.message },
        "Gemini request failed",
      );
      res
        .status(502)
        .json({ error: "KARMA AI could not reach Gemini right now. Please try again." });
      return;
    }

    const answer = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!answer) {
      res.status(502).json({ error: "Gemini returned an empty response. Please try again." });
      return;
    }

    const data = SendGeminiChatResponse.parse({
      message: answer,
      model: GEMINI_MODEL,
      groundedInMaterial: Boolean(materialText),
    });
    res.json(data);
  } catch (error) {
    req.log.error({ err: error }, "Unexpected Gemini request error");
    res.status(502).json({ error: "KARMA AI is temporarily unavailable. Please try again." });
  }
});

router.post("/gemini/chat-stream", async (req, res) => {
  const parsed = SendGeminiChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please provide a valid learning question." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res
      .status(503)
      .json({ error: "KARMA AI is not configured with a Gemini key yet." });
    return;
  }

  const { message, history, materialText, materialName, images } = parsed.data;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
      const response = await fetch(`${GEMINI_STREAM_ENDPOINT}?key=${encodeURIComponent(apiKey)}&alt=sse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildGeminiPayload(history, message, materialText, materialName, images),
        ),
      });

    if (!response.ok) {
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      req.log.error(
        { status: response.status, providerMessage: payload.error?.message },
        "Gemini stream request failed",
      );
      res.status(502).send("KARMA AI could not reach Gemini right now. Please try again.");
      return;
    }

    if (!response.body) {
      res.status(502).send("KARMA AI returned an empty stream. Please try again.");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const json = JSON.parse(payload) as {
            candidates?: Array<{
              content?: { parts?: GeminiPart[] };
            }>;
          };
          const text = json.candidates?.[0]?.content?.parts
            ?.map((part) => part.text ?? "")
            .join("")
            .trim();
          if (text) {
            res.write(text);
          }
        } catch {
          // skip malformed stream chunks
        }
      }
    }
  } catch (error) {
    req.log.error({ err: error }, "Unexpected Gemini stream error");
    if (!res.writableEnded) {
      res.status(502).send("KARMA AI is temporarily unavailable. Please try again.");
      return;
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

export default router;