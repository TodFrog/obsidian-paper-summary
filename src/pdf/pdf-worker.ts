export interface PdfJsWorkerModule {
  WorkerMessageHandler: unknown;
}

type PdfJsGlobalScope = typeof globalThis & {
  pdfjsWorker?: {
    WorkerMessageHandler?: unknown;
  };
};

export function ensurePdfJsWorkerHandler(
  workerModule: PdfJsWorkerModule,
  globalScope: Pick<PdfJsGlobalScope, "pdfjsWorker"> = globalThis as PdfJsGlobalScope,
): void {
  globalScope.pdfjsWorker ??= {};
  globalScope.pdfjsWorker.WorkerMessageHandler ??= workerModule.WorkerMessageHandler;
}
