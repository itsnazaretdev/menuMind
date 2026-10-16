
import { createWorker } from "tesseract.js";

export async function extractTextFromImages(
  images: Buffer[]
): Promise<string[]> {
  const worker = await createWorker("spa+eng");

  try {
    const pageTexts: string[] = [];

    for (const image of images) {
      const result = await worker.recognize(image);
      pageTexts.push(result.data.text);
    }

    return pageTexts;
  } finally {
    await worker.terminate();
  }
}
