import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';

export interface Note {
  id: string;
  title: string;
  content: string; // Text content
  canvasData?: string | null; // Base64 image data for drawings
  createdAt: string;
  type: 'text' | 'draw' | 'mixed';
  // Sharing fields
  isShared?: boolean;
  sharedWithRoles?: string[];
}

interface NotesState {
  savedNotes: Note[];
  isLoading: boolean;
  error: string | null;
  userId: string | null;
  agencyId: string | null;
  setUserContext: (userId: string | null, agencyId: string | null) => void;
  fetchNotes: () => Promise<void>;
  addNote: (note: Omit<Note, 'id' | 'createdAt'>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  shareNote: (id: string, roles: string[]) => Promise<void>;
  unshareNote: (id: string) => Promise<void>;
}

// Map database row to Note interface
const mapDbRowToNote = (row: any): Note => ({
  id: row.id,
  title: row.title,
  content: row.content || '',
  canvasData: row.canvas_data,
  createdAt: row.created_at,
  type: row.type as Note['type'],
  isShared: row.is_shared,
  sharedWithRoles: row.shared_with_roles || [],
});

export const useNotesStore = create<NotesState>((set, get) => ({
  savedNotes: [],
  isLoading: false,
  error: null,
  userId: null,
  agencyId: null,

  setUserContext: (userId, agencyId) => {
    set({ userId, agencyId });
    if (userId) {
      get().fetchNotes();
    }
  },

  fetchNotes: async () => {
    const { userId } = get();
    if (!userId) {
      set({ savedNotes: [], isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('user_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching notes:', error);
        set({ error: error.message, isLoading: false });
        return;
      }

      const notes = (data || []).map(mapDbRowToNote);
      set({ savedNotes: notes, isLoading: false });
    } catch (err) {
      console.error('Exception fetching notes:', err);
      set({ error: err instanceof Error ? err.message : 'Unknown error', isLoading: false });
    }
  },

  addNote: async (note) => {
    const { userId, agencyId, savedNotes } = get();
    if (!userId) {
      console.warn('Cannot add note: no user logged in');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_notes')
        .insert({
          user_id: userId,
          agency_id: agencyId,
          title: note.title,
          content: note.content || null,
          canvas_data: note.canvasData || null,
          type: note.type,
          is_shared: note.isShared || false,
          shared_with_roles: note.sharedWithRoles || [],
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding note:', error);
        return;
      }

      const newNote = mapDbRowToNote(data);
      set({ savedNotes: [newNote, ...savedNotes] });
    } catch (err) {
      console.error('Exception adding note:', err);
    }
  },

  deleteNote: async (id) => {
    const { savedNotes } = get();

    try {
      const { error } = await supabase
        .from('user_notes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting note:', error);
        return;
      }

      set({ savedNotes: savedNotes.filter((n) => n.id !== id) });
    } catch (err) {
      console.error('Exception deleting note:', err);
    }
  },

  updateNote: async (id, updates) => {
    const { savedNotes } = get();

    try {
      const payload: Record<string, any> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.content !== undefined) payload.content = updates.content;
      if (updates.canvasData !== undefined) payload.canvas_data = updates.canvasData;
      if (updates.type !== undefined) payload.type = updates.type;
      if (updates.isShared !== undefined) payload.is_shared = updates.isShared;
      if (updates.sharedWithRoles !== undefined) payload.shared_with_roles = updates.sharedWithRoles;

      const { data, error } = await supabase
        .from('user_notes')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating note:', error);
        return;
      }

      const updatedNote = mapDbRowToNote(data);
      set({
        savedNotes: savedNotes.map((n) => (n.id === id ? updatedNote : n)),
      });
    } catch (err) {
      console.error('Exception updating note:', err);
    }
  },

  shareNote: async (id, roles) => {
    await get().updateNote(id, { isShared: true, sharedWithRoles: roles });
  },

  unshareNote: async (id) => {
    await get().updateNote(id, { isShared: false, sharedWithRoles: [] });
  },
}));
