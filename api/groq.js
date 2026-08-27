// Vercel Serverless Function — Proxy LLM / Groq API (hỗ trợ đổi Model & Base URL linh hoạt)
export default async function handler(req, res) {
  // Chỉ cho phép POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const API_KEY = process.env.GROQ_API_KEY || process.env.LLM_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: "Server chưa cấu hình API key (GROQ_API_KEY hoặc LLM_API_KEY)" });
  }

  const BASE_URL = (process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
  const DEFAULT_MODEL = process.env.LLM_MODEL || process.env.GROQ_MODEL || "llama-3.1-8b-instant";

  try {
    const { model, max_tokens, temperature, messages } = req.body;

    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        max_tokens: max_tokens || 2200,
        temperature: temperature !== undefined ? temperature : 0.7,
        messages: messages || [],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("LLM proxy error:", err);
    return res.status(500).json({ error: "Lỗi kết nối server: " + err.message });
  }
}
