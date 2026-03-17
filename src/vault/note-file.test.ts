import { createNoteFile, type NoteFileAdapter } from "./note-file";

describe("note file creation", () => {
  it("creates a note when the target path does not already exist", async () => {
    const created: Array<{ path: string; content: string }> = [];
    const adapter: NoteFileAdapter = {
      exists: () => Promise.resolve(false),
      create: (path, content) => {
        created.push({ path, content });
        return Promise.resolve();
      },
    };

    const createdPath = await createNoteFile(adapter, "Papers/Summaries/Attention.md", "# Note");

    expect(created).toEqual([
      {
        path: "Papers/Summaries/Attention.md",
        content: "# Note",
      },
    ]);
    expect(createdPath).toBe("Papers/Summaries/Attention.md");
  });

  it("adds a numeric suffix when the target path already exists", async () => {
    const created: Array<{ path: string; content: string }> = [];
    const adapter: NoteFileAdapter = {
      exists: (path) => Promise.resolve(
        path === "Papers/Summaries/Attention.md" || path === "Papers/Summaries/Attention (1).md",
      ),
      create: (path, content) => {
        created.push({ path, content });
        return Promise.resolve();
      },
    };

    const createdPath = await createNoteFile(adapter, "Papers/Summaries/Attention.md", "# Note");

    expect(created).toEqual([
      {
        path: "Papers/Summaries/Attention (2).md",
        content: "# Note",
      },
    ]);
    expect(createdPath).toBe("Papers/Summaries/Attention (2).md");
  });

  it("adds a numeric suffix for root-level files too", async () => {
    const created: Array<{ path: string; content: string }> = [];
    const adapter: NoteFileAdapter = {
      exists: (path) => Promise.resolve(path === "Attention.md"),
      create: (path, content) => {
        created.push({ path, content });
        return Promise.resolve();
      },
    };

    const createdPath = await createNoteFile(adapter, "Attention.md", "# Note");

    expect(created).toEqual([
      {
        path: "Attention (1).md",
        content: "# Note",
      },
    ]);
    expect(createdPath).toBe("Attention (1).md");
  });
});
