import { supabase } from '@/lib/supabaseClient';

// =============================
// Types
// =============================

export interface HubFolderRow {
  id: string;
  agency_id: string;
  client_id?: string | null;
  branch_id: string | null;
  parent_folder_id: string | null;
  name: string;
  category: string;
  is_public: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HubDocumentRow {
  id: string;
  agency_id: string;
  client_id?: string | null;
  branch_id: string | null;
  folder_id: string | null;
  name: string;
  original_filename: string;
  file_size: number;
  mime_type: string | null;
  storage_path: string;
  category: string;
  is_public: boolean;
  is_date_sensitive: boolean;
  reminder_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Combined type for UI display (files and folders together)
export interface HubItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  category: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  // Folder-specific
  parentFolderId?: string | null;
  // File-specific
  folderId?: string | null;
  fileSize?: number;
  mimeType?: string | null;
  storagePath?: string;
  originalFilename?: string;
  isDateSensitive?: boolean;
  reminderDate?: string | null;
}

// =============================
// Folder Operations
// =============================

export interface FetchFoldersInput {
  agencyId: string;
  clientId?: string | null;
  parentFolderId?: string | null;
  searchQuery?: string;
}

export async function fetchFolders(input: FetchFoldersInput): Promise<HubFolderRow[]> {
  let q = supabase
    .from('hub_folders')
    .select('*')
    .eq('agency_id', input.agencyId)
    .order('name', { ascending: true });

  if (input.clientId) {
    q = q.eq('client_id', input.clientId);
  }

  // Filter by parent folder (null for root level)
  if (input.parentFolderId === null || input.parentFolderId === undefined) {
    q = q.is('parent_folder_id', null);
  } else {
    q = q.eq('parent_folder_id', input.parentFolderId);
  }

  if (input.searchQuery) {
    q = q.ilike('name', `%${input.searchQuery}%`);
  }

  const { data, error } = await q;
  if (error) {
    console.error('Error fetching folders', error);
    return [];
  }

  return (data as HubFolderRow[]) ?? [];
}

export async function fetchAllFolders(agencyId: string, clientId?: string | null): Promise<HubFolderRow[]> {
  let q = supabase
    .from('hub_folders')
    .select('*')
    .eq('agency_id', agencyId)
    .order('name', { ascending: true });

  if (clientId) {
    q = q.eq('client_id', clientId);
  }

  const { data, error } = await q;

  if (error) {
    console.error('Error fetching all folders', error);
    return [];
  }

  return (data as HubFolderRow[]) ?? [];
}

export interface CreateFolderInput {
  agencyId: string;
  clientId?: string | null;
  name: string;
  parentFolderId?: string | null;
  category?: string;
  isPublic?: boolean;
  branchId?: string | null;
  createdBy?: string | null;
}

export interface CreateFolderResult {
  data: HubFolderRow | null;
  error?: {
    message: string;
    isPermissionError: boolean;
  };
}

export async function createFolder(input: CreateFolderInput): Promise<HubFolderRow | null> {
  const { data, error } = await supabase
    .from('hub_folders')
    .insert({
      agency_id: input.agencyId,
      client_id: input.clientId ?? null,
      name: input.name,
      parent_folder_id: input.parentFolderId ?? null,
      category: input.category ?? 'General',
      is_public: input.isPublic ?? false,
      branch_id: input.branchId ?? null,
      created_by: input.createdBy ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    // Check for permission/RLS errors (403 or policy violation)
    const isPermissionError = error.code === '42501' || 
      error.message?.includes('permission') ||
      error.message?.includes('policy') ||
      (error as any).status === 403;
    
    if (isPermissionError) {
      console.error('Permission error creating folder - check Supabase RLS policies for hub_folders table', error);
    } else {
      console.error('Error creating folder', error);
    }
    return null;
  }

  return (data as HubFolderRow) ?? null;
}

export interface UpdateFolderInput {
  name?: string;
  parentFolderId?: string | null;
  category?: string;
  isPublic?: boolean;
}

export async function updateFolder(id: string, input: UpdateFolderInput): Promise<HubFolderRow | null> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) payload.name = input.name;
  if (input.parentFolderId !== undefined) payload.parent_folder_id = input.parentFolderId;
  if (input.category !== undefined) payload.category = input.category;
  if (input.isPublic !== undefined) payload.is_public = input.isPublic;

  const { data, error } = await supabase
    .from('hub_folders')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating folder', error);
    return null;
  }

  return (data as HubFolderRow) ?? null;
}

export async function deleteFolder(id: string): Promise<boolean> {
  const { error } = await supabase.from('hub_folders').delete().eq('id', id);
  if (error) {
    console.error('Error deleting folder', error);
    return false;
  }
  return true;
}

// =============================
// Document Operations
// =============================

export interface FetchDocumentsInput {
  agencyId: string;
  clientId?: string | null;
  folderId?: string | null;
  searchQuery?: string;
  category?: string;
  limit?: number;
}

export async function fetchDocuments(input: FetchDocumentsInput): Promise<HubDocumentRow[]> {
  let q = supabase
    .from('hub_documents')
    .select('*')
    .eq('agency_id', input.agencyId)
    .order('created_at', { ascending: false });

  if (input.clientId) {
    q = q.eq('client_id', input.clientId);
  }

  // Filter by folder (null for root level)
  if (input.folderId === null) {
    q = q.is('folder_id', null);
  } else if (input.folderId !== undefined) {
    q = q.eq('folder_id', input.folderId);
  }

  if (input.searchQuery) {
    q = q.ilike('name', `%${input.searchQuery}%`);
  }

  if (input.category && input.category !== 'all') {
    q = q.eq('category', input.category);
  }

  if (input.limit) {
    q = q.limit(input.limit);
  }

  const { data, error } = await q;
  if (error) {
    console.error('Error fetching documents', error);
    return [];
  }

  return (data as HubDocumentRow[]) ?? [];
}

export interface UploadDocumentInput {
  agencyId: string;
  clientId?: string | null;
  file: File;
  name: string;
  folderId?: string | null;
  category?: string;
  isPublic?: boolean;
  isDateSensitive?: boolean;
  reminderDate?: string | null;
  branchId?: string | null;
  createdBy?: string | null;
}

const STORAGE_BUCKET = 'hub-documents';

export async function uploadDocument(input: UploadDocumentInput): Promise<HubDocumentRow | null> {
  const { file, agencyId, clientId, name, folderId, category, isPublic, isDateSensitive, reminderDate, branchId, createdBy } = input;

  // Generate unique storage path: agency_id/timestamp_originalname
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${agencyId}/${timestamp}_${safeName}`;

  // Upload file to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Error uploading file to storage', uploadError);
    return null;
  }

  // Create document record in database
  const { data, error } = await supabase
    .from('hub_documents')
    .insert({
      agency_id: agencyId,
      client_id: clientId ?? null,
      folder_id: folderId ?? null,
      name: name,
      original_filename: file.name,
      file_size: file.size,
      mime_type: file.type || null,
      storage_path: storagePath,
      category: category ?? 'General',
      is_public: isPublic ?? false,
      is_date_sensitive: isDateSensitive ?? false,
      reminder_date: reminderDate ?? null,
      branch_id: branchId ?? null,
      created_by: createdBy ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating document record', error);
    // Attempt to clean up uploaded file
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    return null;
  }

  return (data as HubDocumentRow) ?? null;
}

export interface UpdateDocumentInput {
  name?: string;
  folderId?: string | null;
  category?: string;
  isPublic?: boolean;
  isDateSensitive?: boolean;
  reminderDate?: string | null;
}

export async function updateDocument(id: string, input: UpdateDocumentInput): Promise<HubDocumentRow | null> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) payload.name = input.name;
  if (input.folderId !== undefined) payload.folder_id = input.folderId;
  if (input.category !== undefined) payload.category = input.category;
  if (input.isPublic !== undefined) payload.is_public = input.isPublic;
  if (input.isDateSensitive !== undefined) payload.is_date_sensitive = input.isDateSensitive;
  if (input.reminderDate !== undefined) payload.reminder_date = input.reminderDate;

  const { data, error } = await supabase
    .from('hub_documents')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating document', error);
    return null;
  }

  return (data as HubDocumentRow) ?? null;
}

export async function deleteDocument(id: string): Promise<boolean> {
  // First, get the document to find its storage path
  const { data: doc, error: fetchError } = await supabase
    .from('hub_documents')
    .select('storage_path')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching document for deletion', fetchError);
    return false;
  }

  // Delete from storage
  if (doc?.storage_path) {
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([doc.storage_path]);

    if (storageError) {
      console.error('Error deleting file from storage', storageError);
      // Continue to delete database record anyway
    }
  }

  // Delete database record
  const { error } = await supabase.from('hub_documents').delete().eq('id', id);
  if (error) {
    console.error('Error deleting document', error);
    return false;
  }

  return true;
}

// =============================
// Combined Operations (for UI)
// =============================

export interface FetchHubItemsInput {
  agencyId: string;
  clientId?: string | null;
  folderId?: string | null;
  searchQuery?: string;
  category?: string;
  filterType?: 'all' | 'folder' | 'file';
}

export async function fetchHubItems(input: FetchHubItemsInput): Promise<HubItem[]> {
  const { agencyId, clientId, folderId, searchQuery, category, filterType = 'all' } = input;

  const items: HubItem[] = [];

  // Fetch folders (if not filtering to files only)
  if (filterType === 'all' || filterType === 'folder') {
    const folders = await fetchFolders({
      agencyId,
      clientId,
      parentFolderId: folderId ?? null,
      searchQuery,
    });

    for (const folder of folders) {
      if (category && category !== 'all' && folder.category !== category) continue;
      
      items.push({
        id: folder.id,
        name: folder.name,
        type: 'folder',
        category: folder.category,
        isPublic: folder.is_public,
        createdAt: folder.created_at,
        updatedAt: folder.updated_at,
        createdBy: folder.created_by,
        parentFolderId: folder.parent_folder_id,
      });
    }
  }

  // Fetch documents (if not filtering to folders only)
  if (filterType === 'all' || filterType === 'file') {
    const docs = await fetchDocuments({
      agencyId,
      clientId,
      folderId: folderId ?? null,
      searchQuery,
      category,
    });

    for (const doc of docs) {
      items.push({
        id: doc.id,
        name: doc.name,
        type: 'file',
        category: doc.category,
        isPublic: doc.is_public,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        createdBy: doc.created_by,
        folderId: doc.folder_id,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        storagePath: doc.storage_path,
        originalFilename: doc.original_filename,
        isDateSensitive: doc.is_date_sensitive,
        reminderDate: doc.reminder_date,
      });
    }
  }

  // Sort: folders first, then by name
  items.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return items;
}

// =============================
// File URL Operations
// =============================

export async function getDocumentDownloadUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (error) {
    console.error('Error creating signed URL', error);
    return null;
  }

  return data?.signedUrl ?? null;
}

export async function getDocumentPublicUrl(storagePath: string): Promise<string> {
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

// =============================
// Move/Copy Operations
// =============================

export async function moveDocument(documentId: string, targetFolderId: string | null): Promise<boolean> {
  const result = await updateDocument(documentId, { folderId: targetFolderId });
  return result !== null;
}

export async function copyDocument(documentId: string, targetFolderId: string | null, agencyId: string): Promise<HubDocumentRow | null> {
  // Get original document
  const { data: original, error: fetchError } = await supabase
    .from('hub_documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (fetchError || !original) {
    console.error('Error fetching document for copy', fetchError);
    return null;
  }

  // Download the file from storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(original.storage_path);

  if (downloadError || !fileData) {
    console.error('Error downloading file for copy', downloadError);
    return null;
  }

  // Generate new storage path
  const timestamp = Date.now();
  const safeName = original.original_filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const newStoragePath = `${agencyId}/${timestamp}_copy_${safeName}`;

  // Upload copy to storage
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(newStoragePath, fileData, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Error uploading copied file', uploadError);
    return null;
  }

  // Create new document record
  const { data, error } = await supabase
    .from('hub_documents')
    .insert({
      agency_id: original.agency_id,
      client_id: (original as any)?.client_id ?? null,
      folder_id: targetFolderId,
      name: `${original.name} (Copy)`,
      original_filename: original.original_filename,
      file_size: original.file_size,
      mime_type: original.mime_type,
      storage_path: newStoragePath,
      category: original.category,
      is_public: original.is_public,
      is_date_sensitive: original.is_date_sensitive,
      reminder_date: original.reminder_date,
      branch_id: original.branch_id,
      created_by: original.created_by,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating copied document record', error);
    // Clean up uploaded file
    await supabase.storage.from(STORAGE_BUCKET).remove([newStoragePath]);
    return null;
  }

  return (data as HubDocumentRow) ?? null;
}

export async function moveFolder(folderId: string, targetFolderId: string | null): Promise<boolean> {
  const result = await updateFolder(folderId, { parentFolderId: targetFolderId });
  return result !== null;
}

// =============================
// Breadcrumb / Path Operations
// =============================

export interface BreadcrumbItem {
  id: string | null;
  name: string;
}

export async function getFolderPath(folderId: string | null, agencyId: string, clientId?: string | null): Promise<BreadcrumbItem[]> {
  const path: BreadcrumbItem[] = [{ id: null, name: 'Root' }];

  if (!folderId) return path;

  const allFolders = await fetchAllFolders(agencyId, clientId ?? null);
  const folderMap = new Map(allFolders.map(f => [f.id, f]));

  let currentId: string | null = folderId;
  const pathItems: BreadcrumbItem[] = [];

  while (currentId) {
    const folder = folderMap.get(currentId);
    if (!folder) break;
    pathItems.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parent_folder_id;
  }

  return [...path, ...pathItems];
}

// =============================
// Utility
// =============================

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// =============================
// Folder Upload Operations
// =============================

export interface FolderUploadFile {
  file: File;
  relativePath: string; // e.g., "folder1/subfolder/file.pdf"
}

export interface UploadFolderInput {
  agencyId: string;
  clientId?: string | null;
  files: FolderUploadFile[];
  parentFolderId?: string | null;
  category?: string;
  isPublic?: boolean;
  branchId?: string | null;
  createdBy?: string | null;
  onProgress?: (progress: { current: number; total: number; currentFile: string }) => void;
}

export interface UploadFolderResult {
  success: boolean;
  foldersCreated: number;
  filesUploaded: number;
  errors: string[];
}

/**
 * Upload a folder with all its contents, preserving the folder structure.
 * Files are provided with their relative paths from the folder input.
 */
export async function uploadFolderWithContents(input: UploadFolderInput): Promise<UploadFolderResult> {
  const {
    agencyId,
    clientId,
    files,
    parentFolderId,
    category = 'General',
    isPublic = false,
    branchId,
    createdBy,
    onProgress,
  } = input;

  const result: UploadFolderResult = {
    success: true,
    foldersCreated: 0,
    filesUploaded: 0,
    errors: [],
  };

  // Map to track created folders: path -> folder ID
  const folderMap = new Map<string, string>();
  folderMap.set('', parentFolderId ?? ''); // Root maps to parent folder

  // Extract unique folder paths from all files
  const folderPaths = new Set<string>();
  for (const { relativePath } of files) {
    const parts = relativePath.split('/');
    parts.pop(); // Remove filename
    
    // Add all parent paths
    let currentPath = '';
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      folderPaths.add(currentPath);
    }
  }

  // Sort paths by depth to create parent folders first
  const sortedPaths = Array.from(folderPaths).sort((a, b) => {
    const depthA = a.split('/').length;
    const depthB = b.split('/').length;
    return depthA - depthB;
  });

  // Create folders
  for (const folderPath of sortedPaths) {
    const parts = folderPath.split('/');
    const folderName = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');
    const parentId = folderMap.get(parentPath) || null;

    try {
      const folder = await createFolder({
        agencyId,
        clientId,
        name: folderName,
        parentFolderId: parentId || null,
        category,
        isPublic,
        branchId,
        createdBy,
      });

      if (folder) {
        folderMap.set(folderPath, folder.id);
        result.foldersCreated++;
      } else {
        result.errors.push(`Failed to create folder: ${folderPath}`);
      }
    } catch (error) {
      result.errors.push(`Error creating folder ${folderPath}: ${error}`);
    }
  }

  // Upload files
  const total = files.length;
  for (let i = 0; i < files.length; i++) {
    const { file, relativePath } = files[i];
    const parts = relativePath.split('/');
    const fileName = parts[parts.length - 1];
    const folderPath = parts.slice(0, -1).join('/');
    const folderId = folderMap.get(folderPath) || null;

    onProgress?.({
      current: i + 1,
      total,
      currentFile: relativePath,
    });

    try {
      const doc = await uploadDocument({
        agencyId,
        clientId,
        file,
        name: fileName,
        folderId: folderId || null,
        category,
        isPublic,
        branchId,
        createdBy,
      });

      if (doc) {
        result.filesUploaded++;
      } else {
        result.errors.push(`Failed to upload file: ${relativePath}`);
      }
    } catch (error) {
      result.errors.push(`Error uploading ${relativePath}: ${error}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

/**
 * Process files from a folder input element.
 * The webkitRelativePath property contains the folder structure.
 */
export function processFolderInput(fileList: FileList): FolderUploadFile[] {
  const files: FolderUploadFile[] = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    // webkitRelativePath includes the folder name and path
    // e.g., "MyFolder/subfolder/file.pdf"
    const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    
    // Skip hidden files and folders (starting with .)
    if (relativePath.split('/').some(part => part.startsWith('.'))) {
      continue;
    }

    files.push({ file, relativePath });
  }

  return files;
}
