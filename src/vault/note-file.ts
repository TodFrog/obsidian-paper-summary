export interface NoteFileAdapter {
  exists(path: string): Promise<boolean>;
  create(path: string, content: string): Promise<void>;
}

function splitNotePath(path: string): {
  directory: string;
  fileName: string;
  extension: string;
} {
  const lastSlashIndex = path.lastIndexOf("/");
  const directory = lastSlashIndex >= 0 ? path.slice(0, lastSlashIndex) : "";
  const fileNameWithExtension = lastSlashIndex >= 0 ? path.slice(lastSlashIndex + 1) : path;
  const extensionIndex = fileNameWithExtension.lastIndexOf(".");

  if (extensionIndex <= 0) {
    return {
      directory,
      fileName: fileNameWithExtension,
      extension: "",
    };
  }

  return {
    directory,
    fileName: fileNameWithExtension.slice(0, extensionIndex),
    extension: fileNameWithExtension.slice(extensionIndex),
  };
}

function buildNumberedPath(path: string, suffix: number): string {
  const { directory, fileName, extension } = splitNotePath(path);
  const suffixedFileName = `${fileName} (${suffix})${extension}`;

  if (!directory) {
    return suffixedFileName;
  }

  return `${directory}/${suffixedFileName}`;
}

export async function findAvailableNotePath(
  adapter: Pick<NoteFileAdapter, "exists">,
  path: string,
): Promise<string> {
  if (!await adapter.exists(path)) {
    return path;
  }

  let suffix = 1;
  let candidatePath = buildNumberedPath(path, suffix);

  while (await adapter.exists(candidatePath)) {
    suffix += 1;
    candidatePath = buildNumberedPath(path, suffix);
  }

  return candidatePath;
}

export async function createNoteFile(
  adapter: NoteFileAdapter,
  path: string,
  content: string,
): Promise<string> {
  const availablePath = await findAvailableNotePath(adapter, path);
  await adapter.create(availablePath, content);
  return availablePath;
}
