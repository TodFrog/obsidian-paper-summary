import { TFile, Vault } from "obsidian";
import { createNoteFile } from "./note-file";

async function ensureFolderExists(vault: Vault, notePath: string): Promise<void> {
  const parts = notePath.split("/").slice(0, -1);
  let currentPath = "";

  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    if (!vault.getFolderByPath(currentPath)) {
      await vault.createFolder(currentPath);
    }
  }
}

export async function createNoteInVault(
  vault: Vault,
  path: string,
  content: string,
): Promise<TFile> {
  let createdFile: TFile | null = null;
  let createdPath = path;

  await ensureFolderExists(vault, path);
  createdPath = await createNoteFile(
    {
      exists: async (notePath) => vault.adapter.exists(notePath),
      create: async (notePath, noteContent) => {
        createdFile = await vault.create(notePath, noteContent);
      },
    },
    path,
    content,
  );

  if (!createdFile) {
    throw new Error(`Failed to create note at ${createdPath}`);
  }

  return createdFile;
}
