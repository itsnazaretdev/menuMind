import { askOllama } from "./ollama";

export interface MenuItem {
  name: string;
  price: number | null;
  category: string;
}

export interface MenuExtraction {
  items: MenuItem[];
}

export async function extractMenu(text: string): Promise<MenuExtraction> {
  const prompt = `
Eres un experto en extracción de información de cartas de restaurantes.

Analiza el siguiente texto y extrae los platos.

REGLAS:
- Conserva los nombres originales.
- No inventes platos ni precios.
- Si no encuentras un precio, utiliza null.
- Conserva las descripciones si existen.
- Identifica la categoría de cada plato.
- Devuelve exclusivamente JSON válido.
- No incluyas Markdown ni explicaciones.
- No generes campos de descripción.
- Conserva toda la información del plato dentro de name.
- El precio debe ser un número decimal, sin símbolo de moneda.

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

TEXTO DE LA CARTA:
${text}
`;

  const response = await askOllama(prompt);

  const cleanResponse = response
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const result = JSON.parse(cleanResponse) as MenuExtraction;

  if (!Array.isArray(result.items)) {
    throw new Error("Formato de menú no válido");
  }

  return result;
}