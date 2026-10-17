
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

export interface MenuExtraction {
  items: MenuItem[];
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

Tu tarea es identificar los platos reales de esta página.

REGLAS IMPORTANTES:
- Primero determina si la página es una carta, una tabla de alérgenos u otro contenido.
- Si es una tabla de alérgenos, devuelve pageType "allergens" y una lista items vacía.
- Si no contiene platos, devuelve pageType "other".
- Si contiene platos, devuelve pageType "menu".
- Un plato puede ocupar varias líneas. Une todas las líneas que pertenezcan al mismo plato.
- No conviertas ingredientes, acompañamientos ni continuaciones del nombre en platos independientes.
- Utiliza la disposición visual para identificar dónde empieza y termina cada plato.
- Conserva los nombres originales completos.
- No inventes nombres ni precios.
- Si no puedes identificar el precio con seguridad, utiliza null.
- Cada plato debe tener un único nombre completo y un único precio.
- No incluyas descripciones adicionales.
- Recorre toda la página de arriba abajo y de izquierda a derecha.
- No omitas ningún plato por estar en la parte inferior de la página.
- Utiliza los encabezados para identificar las categorías, por ejemplo: Entrantes, Platos del mar, Carnes y Pastelería.
- Cada plato debe aparecer una sola vez.
- Una línea que continúa el nombre de un plato debe incorporarse al nombre anterior, nunca convertirse en otro plato.
- Si el precio aparece al final de una línea y el nombre continúa en la siguiente, conserva ambas partes en un único plato.
- Si el precio aparece en una línea independiente, asígnalo al plato inmediatamente anterior cuando la disposición visual lo confirme.
- No confundas los suplementos, notas, avisos o textos legales con platos.
- Comprueba especialmente todos los platos de la última sección de la página.
- Antes de devolver el JSON, revisa que no hayas omitido ningún plato visible.


Devuelve exclusivamente JSON válido con esta estructura:
{
  "pageType": "menu",
  "items": [
    {
      "name": "Nombre completo del plato",
      "price": 9.5,
      "category": "Entrantes"
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
  console.log("TEXTO EXTRAÍDO DEL PDF:");
console.log(text);
  const allItems: MenuItem[] = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(
      `Procesando bloque ${i + 1} de ${chunks.length}...`
    );

    const prompt = `
Eres un experto en extracción de información de cartas de restaurantes.

Extrae TODOS los platos que aparezcan en este fragmento de carta.

REGLAS:
REGLAS:
- Extrae TODOS los platos que aparezcan en este fragmento.
- Una línea nueva NO significa necesariamente un plato nuevo.
- Los nombres largos pueden ocupar varias líneas.
- Si una línea continúa gramaticalmente el nombre del plato anterior, únela al nombre anterior.
- No conviertas ingredientes, acompañamientos o continuaciones de nombres en platos independientes.
- Un precio asociado a un nombre pertenece a ese plato, aunque aparezca antes de que termine el nombre en el texto extraído.
- Si el precio aparece separado del nombre, intenta asociarlo al plato correspondiente usando el contexto.
- Conserva los nombres originales y toda su información.
- No inventes platos ni precios.
- Si no puedes identificar un precio con seguridad, utiliza null.
- Identifica la categoría de cada plato.
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
