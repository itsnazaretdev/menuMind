import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";

export async function renderPdfPages(
  buffer: Buffer
): Promise<Buffer[]> {
  const pdf = await getDocument({
    data: new Uint8Array(buffer),
  }).promise;

  const images: Buffer[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height)
    );

    const context = canvas.getContext("2d");

    await page.render({
      canvas: canvas as never,
      canvasContext: context as never,
      viewport,
    }).promise;

    images.push(canvas.toBuffer("image/png"));
  }

  return images;
}