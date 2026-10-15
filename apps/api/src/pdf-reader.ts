import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function extractTextFromPdf(
  buffer: Buffer
): Promise<string> {
  const pdf = await getDocument({
  data: new Uint8Array(buffer),
  useSystemFonts: true,
}).promise;

  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const items = content.items
      .filter((item) => "str" in item && "transform" in item)
      .map((item) => ({
        text: item.str.trim(),
        x: item.transform[4],
        y: item.transform[5],
      }))
      .filter((item) => item.text.length > 0);

    items.sort((a, b) => {
      if (Math.abs(b.y - a.y) > 2) return b.y - a.y;
      return a.x - b.x;
    });

    const lines: { y: number; parts: typeof items }[] = [];

    for (const item of items) {
      let line = lines.find(
        (candidate) => Math.abs(candidate.y - item.y) <= 2
      );

      if (!line) {
        line = { y: item.y, parts: [] };
        lines.push(line);
      }

      line.parts.push(item);
    }

    const pageText = lines
      .map((line) =>
        line.parts
          .sort((a, b) => a.x - b.x)
          .map((item) => item.text)
          .join(" ")
      )
      .join("\n");

    pages.push(pageText);
  }

  return pages.join("\n\n").trim();
}