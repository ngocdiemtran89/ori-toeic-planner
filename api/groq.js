// Vercel Serverless Function — Proxy LLM / Groq API (Tự động fallback model)
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const API_KEY = process.env.GROQ_API_KEY || process.env.LLM_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: "Server chưa cấu hình API key (GROQ_API_KEY hoặc LLM_API_KEY)" });
  }

  const BASE_URL = (process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");
  
  // Danh sách model chuẩn mới nhất của Groq
  const candidateModels = [
    process.env.LLM_MODEL,
    req.body.model,
    "llama-3.3-70b-versatile",
    "llama-3.2-3b-preview",
    "llama-3.2-1b-preview",
    "llama-3.2-11b-vision-preview",
    "qwen-2.5-coder-32b",
    "qwen-qwq-32b",
    "mistral-saba-24b",
    "deepseek-r1-distill-llama-70b",
    "gemma2-9b-it"
  ].filter(Boolean);

  const modelsToTry = [...new Set(candidateModels)];
  const { max_tokens, temperature, messages } = req.body;
  
  const errors = [];

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

      errors.push({ model: currentModel, error: data?.error?.message || data });
    } catch (err) {
      errors.push({ model: currentModel, error: err.message });
    }
  }

  return res.status(500).json({ 
    error: { 
      message: "Tất cả các model đều gặp lỗi: " + JSON.stringify(errors) 
    } 
  });
}
