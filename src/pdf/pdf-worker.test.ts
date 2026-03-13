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
      async () => {
        fakeGlobal.pdfjsWorker = {
          WorkerMessageHandler: importedHandler,
        };
        return { WorkerMessageHandler: importedHandler };
      },
      async () => {
        actionWorkerState = fakeGlobal.pdfjsWorker;
        return "ok";
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
      async () => ({ WorkerMessageHandler: { name: "imported" } }),
      async () => {
        expect(fakeGlobal.pdfjsWorker?.WorkerMessageHandler).toEqual({ name: "imported" });
      },
      fakeGlobal,
    );

    expect("pdfjsWorker" in fakeGlobal).toBe(false);
  });
});
