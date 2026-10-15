import { createWorker } from "tesseract.js";

export async function extractTextFromImage(
  image: Buffer
): Promise<string> {
  const worker = await createWorker("spa+eng");

  try {
    const result = await worker.recognize(image);
    return result.data.text;
  } finally {
    await worker.terminate();
  }
}