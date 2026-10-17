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
            price?: unknown;
            category?: unknown;
          }>;
        };

        const restaurantName = body.restaurant?.trim().toLocaleLowerCase();

        if (!restaurantName) {
          return reply.status(400).send({
            error: "El nombre del restaurante es obligatorio.",
          });
        }

        if (!Array.isArray(body.items) || body.items.length === 0) {
          return reply.status(400).send({
            error: "La carta debe contener al menos un plato.",
          });
        }

        const items: {
          name: string;
          category: string;
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

          items.push({
            name,
            category,
            price,
            sortOrder: i,
          });
        }

        const menu = await prisma.$transaction(async (tx) => {
          const restaurant = await tx.restaurant.upsert({
            where: {
              name: restaurantName,
            },
            update: {},
            create: {
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
            {
              page: i + 1,
              extractedText: pageTexts[i],
            },
            "TEXTO EXTRAÍDO DE LA PÁGINA",
          );

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
