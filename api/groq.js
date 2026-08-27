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
  
  // Danh sách các model thử lần lượt nếu model trước bị lỗi quota hoặc không tồn tại
  const candidateModels = [
    process.env.LLM_MODEL,
    req.body.model,
    "llama-3.3-70b-versatile",
    "deepseek-r1-distill-llama-70b",
    "gemma2-9b-it",
    "llama3-70b-8192",
    "llama3-8b-8192"
  ].filter(Boolean);

  // Loại bỏ trùng lặp
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

      // Nếu bị lỗi model không tồn tại hoặc hết quota, ghi nhận và thử model tiếp theo
      lastError = data;
      console.warn(`Model ${currentModel} failed:`, data?.error?.message || data);
    } catch (err) {
      lastError = { error: { message: err.message } };
      console.error(`Request with model ${currentModel} threw error:`, err);
    }
  }

  return res.status(500).json(lastError || { error: { message: "Không có model nào khả dụng trên hệ thống" } });
}
