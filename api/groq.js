// Vercel Serverless Function — Proxy LLM / Groq API
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const API_KEY = process.env.GROQ_API_KEY || process.env.LLM_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: "Server chưa cấu hình API key" });
  }

  const BASE_URL = (process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
  
  // Các model mới nhất trên hệ thống
  const candidateModels = [
    process.env.LLM_MODEL,
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "llama-3.3-70b-specdec",
    "llama-3.3-70b"
  ].filter(Boolean);

  const modelsToTry = [...new Set(candidateModels)];
  const { max_tokens, temperature, messages } = req.body;
  
  let lastError = null;

  for (const currentModel of modelsToTry) {
    try {
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: currentModel,
          max_tokens: max_tokens || 2200,
          temperature: temperature !== undefined ? temperature : 0.7,
          messages: messages || [],
        }),
      });

      const data = await response.json();

      if (response.ok && data.choices && data.choices.length > 0) {
        return res.status(200).json(data);
      }

      lastError = data;
    } catch (err) {
      lastError = { error: { message: err.message } };
    }
  }

  return res.status(500).json(lastError || { error: { message: "Lỗi kết nối AI" } });
}
