export interface PdfJsWorkerModule {
  WorkerMessageHandler: unknown;
}

export interface PdfJsGlobalScope {
  pdfjsWorker?: Record<string, unknown>;
}

function getActivePdfJsGlobalScope(): PdfJsGlobalScope {
  const activeWindow = activeDocument.defaultView;
  if (!activeWindow) {
    throw new Error("Active document has no window for PDF.js worker registration.");
  }

  return activeWindow as Window & PdfJsGlobalScope;
}

export async function withPdfJsWorkerHandler<T>(
  loadWorkerModule: () => Promise<PdfJsWorkerModule>,
  action: () => Promise<T>,
  globalScope: PdfJsGlobalScope = getActivePdfJsGlobalScope(),
): Promise<T> {
  const hadExistingWorker = Object.prototype.hasOwnProperty.call(globalScope, "pdfjsWorker");
  const previousWorker = globalScope.pdfjsWorker;

  try {
    const workerModule = await loadWorkerModule();
    globalScope.pdfjsWorker = {
      ...(previousWorker ?? {}),
      WorkerMessageHandler: workerModule.WorkerMessageHandler,
    };

    return await action();
  } finally {
    if (hadExistingWorker) {
      globalScope.pdfjsWorker = previousWorker;
    } else {
      delete globalScope.pdfjsWorker;
    }
  }
}
