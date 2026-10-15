const OLLAMA_URL = "http://localhost:11434";

export async function askOllama(prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen2.5:3b",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data = await response.json();

  return data.message.content;
}