# MenuMind

Turn a restaurant's PDF menu into a bilingual (Spanish/English) digital menu that customers open by scanning a QR code, using **Gemma 3 4B** running locally through **Ollama**.

MenuMind is built for small restaurants, cafés and bars that still rely on printed menus and need to offer them in more than one language.

The PDF is only the way in: Gemma reads it so the owner doesn't have to retype every dish. What customers get is not the PDF but a structured menu that can be translated and read comfortably on a phone.

The owner-facing interface is in Spanish, because it's designed first for restaurants in Spain. The public menu is bilingual for their customers.

> Built for the [Hacktoberfest Open-Source AI Challenge, Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12). The project currently runs locally; there is no public deployment.

## How it works

1. **Upload** the menu as a PDF.
2. **Extract**: each page is rendered as an image and its text layer is read with pdf.js. Both are sent to Gemma 3 4B, which identifies dishes, categories and prices. Allergen tables are skipped.
3. **Review**: every extracted dish appears in an editable table, where names, categories and prices can be fixed and wrong entries removed.
4. **Translate**: Gemma translates dish names and categories into English, in small batches. Prices are never sent back through the model.
5. **Publish**: the menu is saved and gets a public page with a Spanish/English toggle and a QR code that points to it.

## Tech stack

| Area | Tools |
| --- | --- |
| AI | [Gemma 3 4B](https://ollama.com/library/gemma3) (`gemma3:4b`) via [Ollama](https://ollama.com) |
| PDF processing | `pdfjs-dist`, `@napi-rs/canvas` |
| Backend | Fastify, `@fastify/multipart`, `@fastify/cors` |
| Database | Prisma 6 + SQLite |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, `qrcode.react` |
| Tooling | pnpm workspaces |

## Project structure

```
menumind/
├── apps/
│   ├── api/          # Fastify API: PDF processing, Gemma calls, translation, menu endpoints
│   └── web/          # Next.js app: upload & review screen, public menu page with QR code
└── packages/
    └── database/     # Prisma schema and client (SQLite)
```

## Running it locally

### Requirements

- Node.js 20 or newer
- pnpm 10 (`corepack enable` will pick up the version in `package.json`)
- [Ollama](https://ollama.com) installed and running

### Setup

```bash
# 1. Download the model
ollama pull gemma3:4b

# 2. Install dependencies
pnpm install

# 3. Create the SQLite database and generate the Prisma client
pnpm --filter @menumind/database db:push

# 4. Start the API (port 3001) and the web app (port 3000)
pnpm dev
```

Then open <http://localhost:3000> and upload a PDF menu.

### Opening the menu on a phone

To scan the QR code from a phone, both devices must be on the same network:

1. Start the web app listening on all interfaces:
   ```bash
   cd apps/web
   pnpm exec next dev -H 0.0.0.0
   ```
2. Replace the IP address with your computer's local IP in:
   - `apps/web/next.config.ts` (`allowedDevOrigins`)
   - `apps/web/app/menu/[menuId]/page.tsx` (the API URL used by the public menu)

## API endpoints

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `POST` | `/menus/upload-pdf` | Upload a PDF and extract dishes with Gemma |
| `POST` | `/menus/translate` | Translate dish names and categories into English |
| `POST` | `/menus/save` | Save a reviewed menu for a restaurant |
| `GET` | `/menus/:menuId` | Get a confirmed menu for the public page |

## Current limitations

- Only PDF menus are supported, and extraction works best with PDFs that have selectable text.
- A saved menu can't be edited yet; changing a dish means uploading the menu again.
- Translation is Spanish → English only.
- The owner interface is available in Spanish only.
- The API URLs are hardcoded for local development.
- Everything runs locally; there is no hosted version yet.

## Next steps

- Accept photos of printed menus, not only PDFs.
- Edit dishes and prices directly on a saved menu.
- OCR fallback for scanned PDFs.
- Internationalize the owner interface (i18n), so restaurants outside Spain can use it, and translate menus into more languages.
- Translate each category once, so the same section always gets the same English name.
- Move the API URL to an environment variable.
- Deploy the API, database and model so restaurants can use it without running anything themselves.