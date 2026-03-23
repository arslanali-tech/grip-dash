import {
  createFolder,
  fetchFolders,
  uploadDocument,
  type HubFolderRow,
} from '@/lib/hubDocumentsApi';

const MOVEMENT_FOLDER_CATEGORY = 'Movements';

const toFileArray = (files: File[] | FileList): File[] =>
  Array.isArray(files) ? files : Array.from(files);

const getMovementFolderName = (movementId: string) => `Movement-${movementId}`;

export interface EnsureMovementDocumentsFolderInput {
  agencyId: string;
  movementId: string;
  clientId?: string | null;
  branchId?: string | null;
  createdBy?: string | null;
}

export async function ensureMovementDocumentsFolder(
  input: EnsureMovementDocumentsFolderInput
): Promise<HubFolderRow | null> {
  const folderName = getMovementFolderName(input.movementId);
  const existingFolders = await fetchFolders({
    agencyId: input.agencyId,
    clientId: input.clientId ?? null,
    parentFolderId: null,
    searchQuery: folderName,
  });

  const existingFolder =
    existingFolders.find((folder) => folder.name === folderName) ?? null;
  if (existingFolder) return existingFolder;

  return createFolder({
    agencyId: input.agencyId,
    clientId: input.clientId ?? null,
    name: folderName,
    parentFolderId: null,
    category: MOVEMENT_FOLDER_CATEGORY,
    isPublic: false,
    branchId: input.branchId ?? null,
    createdBy: input.createdBy ?? null,
  });
}

export interface UploadDocumentsToMovementInput
  extends EnsureMovementDocumentsFolderInput {
  files: File[] | FileList;
}

export interface UploadDocumentsToMovementResult {
  folderId: string | null;
  uploadedCount: number;
  failedCount: number;
}

export async function uploadDocumentsToMovement(
  input: UploadDocumentsToMovementInput
): Promise<UploadDocumentsToMovementResult> {
  const files = toFileArray(input.files);
  if (files.length === 0) {
    return { folderId: null, uploadedCount: 0, failedCount: 0 };
  }

  const folder = await ensureMovementDocumentsFolder(input);
  if (!folder?.id) {
    return {
      folderId: null,
      uploadedCount: 0,
      failedCount: files.length,
    };
  }

  const uploaded = await Promise.all(
    files.map((file) =>
      uploadDocument({
        agencyId: input.agencyId,
        clientId: input.clientId ?? null,
        file,
        name: file.name,
        folderId: folder.id,
        category: MOVEMENT_FOLDER_CATEGORY,
        isPublic: false,
        branchId: input.branchId ?? null,
        createdBy: input.createdBy ?? null,
      })
    )
  );

  const uploadedCount = uploaded.filter(Boolean).length;
  return {
    folderId: folder.id,
    uploadedCount,
    failedCount: files.length - uploadedCount,
  };
}
