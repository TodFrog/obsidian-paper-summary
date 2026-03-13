import { createNoteFile, type NoteFileAdapter } from "./note-file";

describe("note file creation", () => {
  it("creates a note when the target path does not already exist", async () => {
    const created: Array<{ path: string; content: string }> = [];
    const adapter: NoteFileAdapter = {
      exists: async () => false,
      create: async (path, content) => {
        created.push({ path, content });
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
      exists: async (path) => {
        return path === "Papers/Summaries/Attention.md" || path === "Papers/Summaries/Attention (1).md";
      },
      create: async (path, content) => {
        created.push({ path, content });
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
      exists: async (path) => path === "Attention.md",
      create: async (path, content) => {
        created.push({ path, content });
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
