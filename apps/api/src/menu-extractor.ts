
import { askOllama } from "./ollama";

export interface MenuItem {
  name: string;
  price: number | null;
  category: string;
}

export interface MenuExtraction {
  items: MenuItem[];
}

function splitTextIntoChunks(text: string, maxLength = 3000): string[] {
  const lines = text.split("\n");
  const chunks: string[] = [];
  let currentChunk = "";

  for (const line of lines) {
    if (
      currentChunk.length + line.length > maxLength &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }

    currentChunk += line + "\n";
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export async function extractMenu(
  text: string
): Promise<MenuExtraction> {
  const chunks = splitTextIntoChunks(text);
  const allItems: MenuItem[] = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(
      `Procesando bloque ${i + 1} de ${chunks.length}...`
    );

    const prompt = `
Eres un experto en extracción de información de cartas de restaurantes.

Extrae TODOS los platos que aparezcan en este fragmento de carta.

REGLAS:
- Extrae todos los platos, sin omitir ninguno.
- Conserva los nombres originales.
- No inventes platos ni precios.
- Si no encuentras un precio, utiliza null.
- Identifica la categoría de cada plato.
- Conserva toda la información del plato dentro de name.
- No generes campos de descripción.
- El precio debe ser un número decimal, sin símbolo de moneda.
- Devuelve exclusivamente JSON válido.
- No incluyas Markdown ni explicaciones.

FORMATO OBLIGATORIO:
{
  "items": [
    {
      "name": "Nombre del plato",
      "price": 9.5,
      "category": "Entrantes"
    }
  ]
}

FRAGMENTO DE LA CARTA:
${chunks[i]}
`;

    const response = await askOllama(prompt);

    const cleanResponse = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const jsonStart = cleanResponse.indexOf("{");
    const jsonEnd = cleanResponse.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error(
        `La IA no devolvió un JSON válido en el bloque ${i + 1}`
      );
    }

    const result = JSON.parse(
      cleanResponse.substring(jsonStart, jsonEnd + 1)
    ) as MenuExtraction;

    if (!Array.isArray(result.items)) {
      throw new Error(
        `Formato de menú no válido en el bloque ${i + 1}`
      );
    }

    allItems.push(...result.items);
  }

  console.log(`Total de platos extraídos: ${allItems.length}`);

  return {
    items: allItems,
  };
}
