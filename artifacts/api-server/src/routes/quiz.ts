import { Router, type IRouter } from "express";
import { z } from "zod";

const router: IRouter = Router();

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const QUIZ_SYSTEM_PROMPT = `You are a learning quiz generator for India's Official Statistical System.

Your task is to generate quiz questions based on the provided learning material. The quiz should help learners test and reinforce their understanding of statistical concepts, government schemes, data analysis methods, and official statistics.

RULES:
1. Generate exactly 5 multiple-choice questions based ONLY on the provided material
2. Each question must have exactly 4 options (A, B, C, D)
3. Mark the correct answer clearly
4. Include a brief explanation for each correct answer
5. Questions should range from basic recall to applied understanding
6. Make questions practical and relevant to public service/statistical work
7. Do NOT make up statistics or data not present in the material
8. If the material is insufficient, generate general questions about statistics and data analysis

OUTPUT FORMAT (strict JSON):
{
  "quiz": {
    "title": "Quiz title based on material",
    "questions": [
      {
        "id": 1,
        "question": "Question text here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctIndex": 0,
        "explanation": "Explanation of why this answer is correct"
      }
    ]
  }
}`;

type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type QuizResponse = {
  title: string;
  questions: QuizQuestion[];
};

const QuizResponseSchema = z.object({
  quiz: z.object({
    title: z.string(),
    questions: z.array(
      z.object({
        id: z.number(),
        question: z.string(),
        options: z.array(z.string()),
        correctIndex: z.number(),
        explanation: z.string(),
      }),
    ),
  }),
});

router.post("/quiz/generate", async (req, res) => {
  const { materialText, materialName, message, provider = "gemini", model = GEMINI_MODEL } = req.body;

  if (!materialText && !message) {
    res.status(400).json({ error: "Please provide material text or a message to generate a quiz." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Quiz generation is not configured yet." });
    return;
  }

  const contextText = materialText
    ? `Learning material${materialName ? ` (${materialName})` : ""}:\n${materialText}`
    : message;

  const userPrompt = message || `Generate a quiz based on the following material:\n\n${contextText}`;

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: QUIZ_SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: `${userPrompt}\n\n${contextText ? contextText : ""}` }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      const userMessage = payload.error?.message || "Quiz generation failed. Please try again.";
      res.status(response.status === 429 ? 429 : 502).json({ error: userMessage });
      return;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!text) {
      res.status(502).json({ error: "Gemini returned an empty quiz. Please try again." });
      return;
    }

    const parsed = QuizResponseSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      req.log.warn({ raw: text, error: parsed.error }, "Gemini returned invalid quiz JSON");
      res.status(502).json({ error: "The generated quiz format was invalid. Please try again." });
      return;
    }

    res.json(parsed.data);
  } catch (error) {
    req.log.error({ err: error }, "Unexpected quiz generation error");
    res.status(502).json({ error: "Quiz generation is temporarily unavailable. Please try again." });
  }
});

export default router;
