import type { PdfExtractionOptions, PdfExtractionResult } from "../contracts";
import { withPdfJsWorkerHandler } from "./pdf-worker";
import { buildPdfExtractionResult } from "./pdf-text-shaping";

type TextContentItem = {
  str?: string;
  hasEOL?: boolean;
};

function getFallbackTitle(sourcePath: string): string {
  const fileName = sourcePath.split("/").pop() ?? sourcePath;
  return fileName.replace(/\.pdf$/i, "");
}

function flattenPdfItems(items: TextContentItem[]): string {
  const parts: string[] = [];

  for (const item of items) {
    const value = item.str?.trim();
    if (!value) {
      continue;
    }

    parts.push(value);
    if (item.hasEOL) {
      parts.push("\n");
    }
  }

  return parts.join(" ");
}

export async function extractPdfText(
  buffer: ArrayBuffer,
  sourcePath: string,
  options: PdfExtractionOptions,
): Promise<PdfExtractionResult> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // Load the worker only on demand so enabling the plugin does not mutate
  // Obsidian's viewer-wide PDF.js globals during normal PDF reading.
  return withPdfJsWorkerHandler(
    () => import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
    async () => {
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useWorkerFetch: false,
      } as never);

      const document = await loadingTask.promise;

      try {
        const pageTexts: string[] = [];
        const pageLimit = Math.min(document.numPages, options.maxPages);

        for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
          const page = await document.getPage(pageNumber);
          const content = await page.getTextContent();
          pageTexts.push(flattenPdfItems(content.items as TextContentItem[]));
        }

        return buildPdfExtractionResult({
          sourcePath,
          fallbackTitle: getFallbackTitle(sourcePath),
          pageTexts,
          options,
          pageCount: document.numPages,
        });
      } finally {
        await loadingTask.destroy();
      }
    },
  );
}
