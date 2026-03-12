import { ensurePdfJsWorkerHandler } from "./pdf-worker";

describe("pdf worker registration", () => {
  it("registers a fake-worker handler on the global scope when none exists", () => {
    const workerHandler = { name: "handler" };
    const fakeGlobal = {} as {
      pdfjsWorker?: {
        WorkerMessageHandler?: unknown;
      };
    };

    ensurePdfJsWorkerHandler(
      { WorkerMessageHandler: workerHandler },
      fakeGlobal,
    );

    expect(fakeGlobal.pdfjsWorker?.WorkerMessageHandler).toBe(workerHandler);
  });

  it("does not overwrite an existing worker handler", () => {
    const existingHandler = { name: "existing" };
    const fakeGlobal = {
      pdfjsWorker: {
        WorkerMessageHandler: existingHandler,
      },
    };

    ensurePdfJsWorkerHandler(
      { WorkerMessageHandler: { name: "new" } },
      fakeGlobal,
    );

    expect(fakeGlobal.pdfjsWorker?.WorkerMessageHandler).toBe(existingHandler);
  });
});
