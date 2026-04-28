// Vercel Serverless Function — Proxy Groq API (ẩn key)
export default async function handler(req, res) {
  // Chỉ cho phép POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "Server chưa cấu hình API key" });
  }

  try {
    const { model, max_tokens, temperature, messages } = req.body;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: model || "llama-3.3-70b-versatile",
        max_tokens: max_tokens || 2200,
        temperature: temperature || 0.72,
        messages: messages || [],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Groq proxy error:", err);
    return res.status(500).json({ error: "Lỗi kết nối server: " + err.message });
  }
}
