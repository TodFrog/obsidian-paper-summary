import { withPdfJsWorkerHandler } from "./pdf-worker";

describe("pdf worker registration", () => {
  it("temporarily installs the imported worker handler and restores the previous global worker", async () => {
    const existingGlobalWorker = {
      WorkerMessageHandler: { name: "existing" },
      existingFlag: true,
    };
    const fakeGlobal: {
      pdfjsWorker?: Record<string, unknown>;
    } = {
      pdfjsWorker: existingGlobalWorker,
    };
    const importedHandler = { name: "imported" };
    let actionWorkerState: unknown;

    const result = await withPdfJsWorkerHandler(
      () => {
        fakeGlobal.pdfjsWorker = {
          WorkerMessageHandler: importedHandler,
        };
        return Promise.resolve({ WorkerMessageHandler: importedHandler });
      },
      () => {
        actionWorkerState = fakeGlobal.pdfjsWorker;
        return Promise.resolve("ok");
      },
      fakeGlobal,
    );

    expect(result).toBe("ok");
    expect(actionWorkerState).toEqual({
      WorkerMessageHandler: importedHandler,
      existingFlag: true,
    });
    expect(fakeGlobal.pdfjsWorker).toBe(existingGlobalWorker);
  });

  it("removes temporary worker state when no global worker existed before extraction", async () => {
    const fakeGlobal: {
      pdfjsWorker?: Record<string, unknown>;
    } = {};

    await withPdfJsWorkerHandler(
      () => Promise.resolve({ WorkerMessageHandler: { name: "imported" } }),
      () => {
        expect(fakeGlobal.pdfjsWorker?.WorkerMessageHandler).toEqual({ name: "imported" });
        return Promise.resolve();
      },
      fakeGlobal,
    );

    expect("pdfjsWorker" in fakeGlobal).toBe(false);
  });
});
