import { Router, type IRouter } from "express";
import { SendGeminiChatBody, SendGeminiChatResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_STREAM_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent`;

const GROQ_MODEL = "llama-3.1-70b-versatile";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

const AIML_MODEL = "mistralai/mistral-7b-instruct";
const AIML_ENDPOINT = "https://api.aimlapi.com/v1/chat/completions";

const HF_MODEL = "google/gemma-2-9b-it";
const HF_ENDPOINT = "https://router.huggingface.co/hf-inference/v1/chat/completions";

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
      error?: { message?: string; code?: number; status?: string };
    };

    if (!response.ok) {
      const providerMessage = payload.error?.message ?? "Unknown provider error";
      req.log.error(
        { status: response.status, providerMessage, providerError: payload.error },
        "Gemini request failed",
      );
      const userMessage =
        response.status === 429
          ? "Gemini rate limit reached. Please wait a moment and try again."
          : response.status === 400
            ? `Gemini rejected the request: ${providerMessage}`
            : "KARMA AI could not reach Gemini right now. Please try again.";
      res.status(response.status === 429 ? 429 : 502).json({ error: userMessage });
      return;
    }

    const answer = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!answer) {
      req.log.warn({ payload }, "Gemini returned empty answer");
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

router.post("/chat", async (req, res) => {
  const parsed = SendGeminiChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please provide a valid learning question." });
    return;
  }

  const requestedProvider = parsed.data.provider?.toLowerCase();
  const model = parsed.data.model || GROQ_MODEL;

  if (!requestedProvider) {
    res.status(400).json({ error: "Missing provider. Choose 'gemini', 'groq', 'aiml', or 'huggingface'." });
    return;
  }

  const requestedModel = model || (requestedProvider === "gemini" ? GEMINI_MODEL : requestedProvider === "groq" ? GROQ_MODEL : requestedProvider === "huggingface" ? HF_MODEL : AIML_MODEL);

  try {
    let result: { message: string; model: string };
    if (requestedProvider === "gemini") {
      result = await handleGemini(req, parsed.data, requestedModel);
    } else if (requestedProvider === "groq") {
      result = await handleGroq(req, parsed.data, requestedModel);
    } else if (requestedProvider === "huggingface") {
      result = await handleHuggingFace(req, parsed.data, requestedModel);
    } else {
      result = await handleAiml(req, parsed.data, requestedModel);
    }
    const data = SendGeminiChatResponse.parse({
      message: result.message,
      model: result.model,
      groundedInMaterial: Boolean(parsed.data.materialText),
      provider: requestedProvider,
    });
    res.json(data);
  } catch (error) {
    const status = error instanceof Error && error.message.includes("timed out") ? 504 : 502;
    req.log.warn(
      { err: error, provider: requestedProvider },
      "Provider request failed",
    );
    res.status(status).json({ error: error instanceof Error ? error.message : "KARMA AI is temporarily unavailable. Please try again." });
  }
});

async function handleGemini(req: any, data: any, model: string): Promise<{ message: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("KARMA AI is not configured with a Gemini key yet.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await withTimeout(
    fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildGeminiPayload(data.history, data.message, data.materialText, data.materialName, data.images)),
    }),
    30000,
    "Gemini request",
  );

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
    error?: { message?: string; code?: number; status?: string };
  };

  if (!response.ok) {
    const providerMessage = payload.error?.message ?? "Unknown provider error";
    req.log.error(
      { status: response.status, providerMessage, providerError: payload.error },
      "Gemini request failed",
    );
    const userMessage =
      response.status === 429
        ? "Gemini rate limit reached."
        : response.status === 400
          ? `Gemini rejected the request: ${providerMessage}`
          : "KARMA AI could not reach Gemini right now.";
    throw new Error(userMessage);
  }

  const answer = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!answer) {
    req.log.warn({ payload }, "Gemini returned empty answer");
    throw new Error("Gemini returned an empty response.");
  }

  return { message: answer, model };
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]);
}

async function handleGroq(req: any, data: any, model: string): Promise<{ message: string; model: string }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("KARMA AI is not configured with a Groq key yet.");
  }

  const messages: Array<{ role: string; content: string }> = [];
  if (data.history?.length) {
    for (const item of data.history) {
      messages.push({ role: item.role === "assistant" ? "assistant" : "user", content: item.content });
    }
  }

  const materialContext = data.materialText
    ? `\n\nLearning material${data.materialName ? ` (${data.materialName})` : ""}:\n${data.materialText}`
    : "";
  messages.push({ role: "user", content: `${data.message}${materialContext}` });

  const response = await withTimeout(
    fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.35,
        max_tokens: 8192,
      }),
    }),
    30000,
    "Groq request",
  );

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string; code?: number };
  };

  if (!response.ok) {
    const providerMessage = payload.error?.message ?? "Unknown provider error";
    req.log.error(
      { status: response.status, providerMessage, providerError: payload.error },
      "Groq request failed",
    );
    const userMessage =
      response.status === 429
        ? "Groq rate limit reached."
        : response.status === 400
          ? `Groq rejected the request: ${providerMessage}`
          : "KARMA AI could not reach Groq right now.";
    throw new Error(userMessage);
  }

  const answer = payload.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    req.log.warn({ payload }, "Groq returned empty answer");
    throw new Error("Groq returned an empty response.");
  }

  return { message: answer, model: `groq/${model}` };
}

async function handleAiml(req: any, data: any, model: string): Promise<{ message: string; model: string }> {
  const apiKey = process.env.AIML_API_KEY;
  if (!apiKey) {
    throw new Error("KARMA AI is not configured with an AIML API key yet.");
  }

  const messages: Array<{ role: string; content: string }> = [];
  if (data.history?.length) {
    for (const item of data.history) {
      messages.push({ role: item.role === "assistant" ? "assistant" : "user", content: item.content });
    }
  }

  const materialContext = data.materialText
    ? `\n\nLearning material${data.materialName ? ` (${data.materialName})` : ""}:\n${data.materialText}`
    : "";
  messages.push({ role: "user", content: `${data.message}${materialContext}` });

  const response = await withTimeout(
    fetch(AIML_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.35,
        max_tokens: 8192,
      }),
    }),
    30000,
    "AIML request",
  );

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string; code?: number };
  };

  if (!response.ok) {
    const providerMessage = payload.error?.message ?? "Unknown provider error";
    req.log.error(
      { status: response.status, providerMessage, providerError: payload.error },
      "AIML request failed",
    );
    const userMessage =
      response.status === 429
        ? "AIML rate limit reached."
        : response.status === 400
          ? `AIML rejected the request: ${providerMessage}`
          : "KARMA AI could not reach AIML right now.";
    throw new Error(userMessage);
  }

  const answer = payload.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    req.log.warn({ payload }, "AIML returned empty answer");
    throw new Error("AIML returned an empty response.");
  }

  return { message: answer, model: `aiml/${model}` };
}

async function handleHuggingFace(req: any, data: any, model: string): Promise<{ message: string; model: string }> {
  const apiKey = process.env.HF_API_TOKEN;
  if (!apiKey) {
    throw new Error("KARMA AI is not configured with a HuggingFace token yet.");
  }

  const messages: Array<{ role: string; content: string }> = [];
  if (data.history?.length) {
    for (const item of data.history) {
      messages.push({ role: item.role === "assistant" ? "assistant" : "user", content: item.content });
    }
  }

  const materialContext = data.materialText
    ? `\n\nLearning material${data.materialName ? ` (${data.materialName})` : ""}:\n${data.materialText}`
    : "";
  messages.push({ role: "user", content: `${data.message}${materialContext}` });

  const response = await withTimeout(
    fetch(HF_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.35,
        max_tokens: 8192,
      }),
    }),
    30000,
    "HuggingFace request",
  );

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string; code?: number };
  };

  if (!response.ok) {
    const providerMessage = payload.error?.message ?? "Unknown provider error";
    req.log.error(
      { status: response.status, providerMessage, providerError: payload.error },
      "HuggingFace request failed",
    );
    const userMessage =
      response.status === 429
        ? "HuggingFace rate limit reached."
        : response.status === 400
          ? `HuggingFace rejected the request: ${providerMessage}`
          : "KARMA AI could not reach HuggingFace right now.";
    throw new Error(userMessage);
  }

  const answer = payload.choices?.[0]?.message?.content?.trim();

  if (!answer) {
    req.log.warn({ payload }, "HuggingFace returned empty answer");
    throw new Error("HuggingFace returned an empty response.");
  }

  return { message: answer, model: `huggingface/${model}` };
}

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
        error?: { message?: string; code?: number; status?: string };
      };
      req.log.error(
        { status: response.status, providerMessage: payload.error?.message, providerError: payload.error },
        "Gemini stream request failed",
      );
      const userMessage =
        response.status === 429
          ? "Gemini rate limit reached. Please wait a moment and try again."
          : response.status === 400
            ? `Gemini rejected the request: ${payload.error?.message ?? "bad request"}`
            : "KARMA AI could not reach Gemini right now. Please try again.";
      res.status(response.status === 429 ? 429 : 502).send(userMessage);
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