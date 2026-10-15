import { askOllama } from "./ollama";
import { extractMenu } from "./menu-extractor";
import multipart from "@fastify/multipart";
import { extractTextFromPdf } from "./pdf-reader";
import { extractTextFromImage } from "./ocr-reader";
import { renderPdfPages } from "./pdf-renderer";
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

        let text = await extractTextFromPdf(buffer);
        let extractionMethod = "pdf-text";

        if (!text || text.length < 30) {
          request.log.info("PDF sin texto suficiente. Iniciando OCR.");

          const images = await renderPdfPages(buffer);
          const pageTexts: string[] = [];

          for (const image of images) {
            const pageText = await extractTextFromImage(image);
            pageTexts.push(pageText);
          }

          text = pageTexts.join("\n\n");
          extractionMethod = "ocr";
        }

        if (!text.trim()) {
          return reply.status(422).send({
            error: "No se ha podido reconocer texto en el PDF.",
          });
        }

        const menu = await extractMenu(text);

        return {
          success: true,
          extractedText: text,
          extractionMethod,
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
