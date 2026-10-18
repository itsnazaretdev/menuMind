import { askOllama } from "./ollama";
import { extractMenu } from "./menu-extractor";
import multipart from "@fastify/multipart";
import { MenuItem } from "./menu-extractor";
import { renderPdfPages } from "./pdf-renderer";
import { extractTextPagesFromPdf } from "./pdf-reader";
import { extractMenuFromPage } from "./menu-extractor";
import { prisma } from "../../../packages/database/src/client";
import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify({
  logger: true,
});

const start = async () => {
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 1,
    },
  });
  try {
    await app.register(cors, {
      origin: true,
    });

    app.get("/health", async () => {
      return {
        status: "ok",
        application: "MenuMind API",
      };
    });

    app.post("/ai/test", async (request, reply) => {
      try {
        const body = request.body as { prompt?: string };

        if (!body.prompt) {
          return reply.status(400).send({
            error: "El prompt es obligatorio",
          });
        }

        const result = await askOllama(body.prompt);

        return {
          success: true,
          response: result,
        };
      } catch (error) {
        app.log.error(error);

        return reply.status(500).send({
          error: "No se pudo conectar con Ollama",
        });
      }
    });

    app.post("/menus/extract", async (request, reply) => {
      try {
        const body = request.body as { text?: string };

        if (!body.text || !body.text.trim()) {
          return reply.status(400).send({
            error: "El texto del menú es obligatorio",
          });
        }

        const result = await extractMenu(body.text);

        return {
          success: true,
          menu: result,
        };
      } catch (error) {
        app.log.error(error);

        return reply.status(500).send({
          error: "No se pudo extraer el menú",
        });
      }
    });

    app.post("/menus/save", async (request, reply) => {
      try {
        const body = request.body as {
          restaurant?: string;
          items?: Array<{
            name?: unknown;
            nameEn?: unknown;
            price?: unknown;
            category?: unknown;
            categoryEn?: unknown;
          }>;
        };

        const restaurantName = body.restaurant?.trim();

        if (!restaurantName) {
          return reply.status(400).send({
            error: "El nombre del restaurante es obligatorio.",
          });
        }
        const normalizedRestaurantName = restaurantName.toLocaleLowerCase("es");

        if (!Array.isArray(body.items) || body.items.length === 0) {
          return reply.status(400).send({
            error: "La carta debe contener al menos un plato.",
          });
        }

        
const items: {
  name: string;
  nameEn: string | null;
  category: string;
  categoryEn: string | null;
  price: number | null;
  sortOrder: number;
}[] = [];


        for (let i = 0; i < body.items.length; i++) {
          const item = body.items[i];

          const name = typeof item.name === "string" ? item.name.trim() : "";
          const category =
            typeof item.category === "string" ? item.category.trim() : "";

          const price =
            item.price === null || item.price === ""
              ? null
              : Number(item.price);

          if (!name || !category) {
            return reply.status(400).send({
              error: `El plato ${i + 1} necesita nombre y categoría.`,
            });
          }

          if (price !== null && (!Number.isFinite(price) || price < 0)) {
            return reply.status(400).send({
              error: `El precio del plato ${i + 1} no es válido.`,
            });
          }

          
const nameEn =
  typeof item.nameEn === "string" ? item.nameEn.trim() : null;

const categoryEn =
  typeof item.categoryEn === "string" ? item.categoryEn.trim() : null;

items.push({
  name,
  nameEn,
  category,
  categoryEn,
  price,
  sortOrder: i,
});

        }

        const menu = await prisma.$transaction(async (tx) => {
          const restaurants = await tx.restaurant.findMany({
            select: {
              id: true,
              name: true,
            },
          });

          const existingRestaurant = restaurants.find(
            (r) =>
              r.name.trim().toLocaleLowerCase("es") ===
              normalizedRestaurantName,
          );

          const restaurant = existingRestaurant
            ? existingRestaurant
            : await tx.restaurant.create({
                data: {
                  name: restaurantName,
                },
              });

          const existingMenu = await tx.menu.findFirst({
            where: {
              restaurantId: restaurant.id,
              title: "Carta principal",
            },
          });

          if (existingMenu) {
            return tx.menu.update({
              where: {
                id: existingMenu.id,
              },
              data: {
                restaurant: restaurant.name,
                status: "confirmed",
                items: {
                  deleteMany: {},
                  create: items,
                },
              },
              include: {
                items: true,
              },
            });
          }

          return tx.menu.create({
            data: {
              restaurant: restaurant.name,
              title: "Carta principal",
              restaurantId: restaurant.id,
              status: "confirmed",
              items: {
                create: items,
              },
            },
            include: {
              items: true,
            },
          });
        });

        return {
          success: true,
          message: "Carta guardada correctamente.",
          menuId: menu.id,
          menu,
        };
      } catch (error) {
        request.log.error(error);

        return reply.status(500).send({
          error: "No se pudo guardar la carta.",
        });
      }
    });

    app.get("/menus/:menuId", async (request, reply) => {
      try {
        const { menuId } = request.params as { menuId: string };

        const menu = await prisma.menu.findUnique({
          where: {
            id: menuId,
          },
          include: {
            items: {
              orderBy: {
                sortOrder: "asc",
              },
            },
          },
        });

        if (!menu || menu.status !== "confirmed") {
          return reply.status(404).send({
            error: "No se ha encontrado esta carta.",
          });
        }

        return {
          success: true,
          menu,
        };
      } catch (error) {
        request.log.error(error, "Error al recuperar la carta");

        return reply.status(500).send({
          error: "No se pudo recuperar la carta.",
        });
      }
    });

    app.post("/menus/upload-pdf", async (request, reply) => {
      try {
        const file = await request.file();

        if (!file) {
          return reply.status(400).send({
            error: "Debes seleccionar un archivo PDF",
          });
        }

        if (
          file.mimetype !== "application/pdf" &&
          !file.filename.toLowerCase().endsWith(".pdf")
        ) {
          return reply.status(400).send({
            error: "El archivo debe ser un PDF",
          });
        }

        const buffer = await file.toBuffer();

        if (buffer.subarray(0, 5).toString() !== "%PDF-") {
          return reply.status(400).send({
            error: "El archivo no contiene un PDF válido",
          });
        }

        const pageTexts = await extractTextPagesFromPdf(buffer);
        const images = await renderPdfPages(buffer);

        if (pageTexts.length !== images.length) {
          throw new Error(
            "No coincide el número de páginas de texto e imágenes.",
          );
        }

        const allItems: MenuItem[] = [];

        for (let i = 0; i < images.length; i++) {
          const firstLine =
            pageTexts[i]
              .split("\n")
              .map((line) => line.trim())
              .find((line) => line.length > 0)
              ?.toLowerCase() ?? "";

          if (firstLine.startsWith("alérgenos")) {
            request.log.info(`Página ${i + 1} descartada: tabla de alérgenos.`);
            continue;
          }

          request.log.info(
            `Analizando página ${i + 1} de ${images.length} con Gemma Vision...`,
          );

          const result = await extractMenuFromPage(pageTexts[i], images[i]);

          request.log.info(
            `Página ${i + 1}: ${result.pageType}, ${result.items.length} platos`,
          );

          if (result.pageType === "menu") {
            allItems.push(...result.items);
          }
        }

        const menu = {
          items: allItems,
        };

        return {
          success: true,
          extractionMethod: "vision-hybrid",
          menu,
        };
      } catch (error) {
        request.log.error(error);

        return reply.status(500).send({
          error: "Error procesando el PDF",
        });
      }
    });

    app.post("/menus/translate", async (request, reply) => {
      try {
        const body = request.body as {
          items?: {
            name: string;
            category: string;
            price: number | null;
          }[];
        };

        if (!body.items || body.items.length === 0) {
          return reply.status(400).send({
            error: "No hay platos para traducir.",
          });
        }

        const prompt = `
You are a professional translator specializing in Spanish gastronomy and restaurant menus.

Translate the following Spanish menu into natural, accurate English.

RULES FOR DISH NAMES:
- Translate the dish names into clear, natural English.
- Preserve all ingredients, cooking methods and important characteristics.
- Translate descriptions of ingredients, not invent new ones.
- Do not add marketing language or extra descriptions.
- Do not repeat the category inside the dish name.
- You MUST translate the complete dish name into English.
- Never return a dish name entirely or mostly in Spanish.
- Translate ingredient names, preparation methods and descriptions whenever an English equivalent exists.
- Preserve geographical names, but translate all descriptive words surrounding them.
- Preserve traditional Spanish dish names only when they have no natural English equivalent. Always translate their ingredients and descriptions.
- Apply the same translation rules to every item, including the first items in the input.
- Never leave a dish name untranslated simply because it contains a Spanish culinary term.

RULES FOR CATEGORIES:
- Translate each category independently according to its actual meaning.
- Never use a generic category for every dish.
- Never invent a category.
- Examples:
  "Entrantes" -> "Starters"
  "Ensaladas" -> "Salads"
  "Sopas" -> "Soups"
  "Pescados" -> "Fish"
  "Carnes" -> "Meat"
  "Postres" -> "Desserts"
  "Bebidas" -> "Drinks"
  "Platos principales" -> "Main Courses"
- If a category is already in English, keep it.


PRICES:
- Do not translate, modify or invent prices.
- Prices will be preserved by the application.

OUTPUT:
- Translate EVERY item in the input array, without exception.
- Do not omit, merge, combine or split any dishes.
- Translate each input item individually, in its original position.
- Before returning the JSON, verify that the number of output items exactly matches the number of input items.
- Preserve the original order.
- Return valid JSON only.
- Do not include markdown, explanations or text outside the JSON.

Required JSON format:
{
  "items": [
    {
      "name": "Translated dish name",
      "category": "Translated category"
    }
  ]
}

Original menu:
${JSON.stringify(body.items)}
`;

        const translatedItems = [];

        const batchSize = 3;

        for (let i = 0; i < body.items.length; i += batchSize) {
          const batch = body.items.slice(i, i + batchSize);

          const batchPrompt =
            prompt.replace(JSON.stringify(body.items), JSON.stringify(batch)) +
            `

IMPORTANT:
Translate all ${batch.length} dishes in this batch.
Do not leave any dish name in Spanish.
Return exactly ${batch.length} translated items.
`;

          const result = await askOllama(batchPrompt);

          const cleanResult = result
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

          const parsed = JSON.parse(cleanResult);

          if (
            !Array.isArray(parsed.items) ||
            parsed.items.length !== batch.length
          ) {
            throw new Error(
              `Error traduciendo el grupo que empieza en el plato ${i + 1}.`,
            );
          }

          const translatedBatch = parsed.items.map(
            (item: { name: string; category: string }, index: number) => ({
              name: item.name,
              category: item.category,
              price: batch[index].price,
            }),
          );

          translatedItems.push(...translatedBatch);
        }

        return reply.send({
          success: true,
          items: translatedItems,
        });
      } catch (error) {
        request.log.error(error, "Error al traducir la carta");

        return reply.status(500).send({
          error: "No se pudo traducir la carta.",
        });
      }
    });

    await app.listen({
      port: 3001,
      host: "0.0.0.0",
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
