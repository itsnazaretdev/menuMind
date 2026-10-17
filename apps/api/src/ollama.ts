
const OLLAMA_URL = "http://localhost:11434";

export async function askOllama(
  prompt: string,
  images: Buffer[] = []
): Promise<string> {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gemma3:4b",
      messages: [
        {
          role: "user",
          content: prompt,
          ...(images.length > 0 && {
            images: images.map((image) => image.toString("base64")),
          }),
        },
      ],
      stream: false,
      format: "json",
      options: {
        temperature: 0,
        seed: 42,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status}`);
  }

  const data = await response.json();

  return data.message.content;
}
