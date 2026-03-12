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

    await createNoteFile(adapter, "Papers/Summaries/Attention.md", "# Note");

    expect(created).toEqual([
      {
        path: "Papers/Summaries/Attention.md",
        content: "# Note",
      },
    ]);
  });

  it("fails clearly instead of overwriting an existing note", async () => {
    const adapter: NoteFileAdapter = {
      exists: async () => true,
      create: async () => {
        throw new Error("should not be called");
      },
    };

    await expect(
      createNoteFile(adapter, "Papers/Summaries/Attention.md", "# Note"),
    ).rejects.toMatchObject({
      code: "note_exists",
    });
  });
});
