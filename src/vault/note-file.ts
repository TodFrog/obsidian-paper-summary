import { PaperSummaryError } from "../errors";

export interface NoteFileAdapter {
  exists(path: string): Promise<boolean>;
  create(path: string, content: string): Promise<void>;
}

export async function createNoteFile(
  adapter: NoteFileAdapter,
  path: string,
  content: string,
): Promise<void> {
  if (await adapter.exists(path)) {
    throw new PaperSummaryError(
      "note_exists",
      `A summary note already exists at ${path}.`,
    );
  }

  await adapter.create(path, content);
}
