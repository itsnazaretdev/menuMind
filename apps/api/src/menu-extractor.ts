
import { askOllama } from "./ollama";

export interface PageExtraction {
  pageType: "menu" | "allergens" | "other";
  items: MenuItem[];
}


export interface MenuItem {
  name: string;
  price: number | null;
  category: string;
}

export async function extractMenuFromPage(
  text: string,
  image: Buffer
): Promise<PageExtraction> {
  


const prompt = `
Analiza esta página de una carta de restaurante.

Dispones de dos fuentes:
1. La imagen de la página, que muestra la distribución visual.
2. El texto extraído del PDF, que contiene las palabras reconocidas.

Identifica todos los platos reales de esta página.

REGLAS:
- Si es una tabla de alérgenos, devuelve pageType "allergens" y items vacío.
- Si no contiene platos, devuelve pageType "other".
- Si contiene platos, devuelve pageType "menu".
- Un plato puede ocupar varias líneas. Une todas las líneas de su nombre.
- Utiliza la imagen para identificar dónde empieza y termina cada plato.
- Conserva los nombres originales completos.
- No inventes nombres ni precios.
- Si no puedes identificar un precio con seguridad, utiliza null.
- Cada plato debe tener un único nombre y un único precio.
- No incluyas descripciones adicionales.
- Recorre toda la página de arriba abajo.
- Los títulos como "Entrantes", "Cocina internacional" o "Nuestra cocina andaluza" son categorías, no platos.
- Asigna cada plato al último título de sección que aparezca antes de él.
- Mantén esa categoría hasta que aparezca otro título.
- Si no identificas ninguna categoría, utiliza "Sin categoría".
- Cada plato debe aparecer una sola vez.
- No confundas suplementos, notas o avisos con platos.

Devuelve exclusivamente JSON válido con esta estructura:
{
  "pageType": "menu",
  "items": [
    {
      "name": "Nombre completo del plato",
      "price": 12.5,
      "category": "Cocina internacional"
    }
  ]
}

TEXTO EXTRAÍDO DEL PDF:
${text}
`;


  const response = await askOllama(prompt, [image]);

  const cleanResponse = response
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const jsonStart = cleanResponse.indexOf("{");
  const jsonEnd = cleanResponse.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("Gemma no devolvió un JSON válido.");
  }

  const result = JSON.parse(
    cleanResponse.substring(jsonStart, jsonEnd + 1)
  ) as PageExtraction;

  if (
    !["menu", "allergens", "other"].includes(result.pageType) ||
    !Array.isArray(result.items)
  ) {
    throw new Error("La respuesta de Gemma no tiene el formato esperado.");
  }

  if (result.pageType !== "menu") {
    return { pageType: result.pageType, items: [] };
  }

  return result;
}
