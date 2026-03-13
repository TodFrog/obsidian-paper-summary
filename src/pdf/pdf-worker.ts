export interface PdfJsWorkerModule {
  WorkerMessageHandler: unknown;
}

export interface PdfJsGlobalScope {
  pdfjsWorker?: Record<string, unknown>;
}

export async function withPdfJsWorkerHandler<T>(
  loadWorkerModule: () => Promise<PdfJsWorkerModule>,
  action: () => Promise<T>,
  globalScope: PdfJsGlobalScope = globalThis as unknown as PdfJsGlobalScope,
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
