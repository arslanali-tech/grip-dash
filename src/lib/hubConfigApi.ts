import { supabase } from '@/lib/supabaseClient';

// =============================
// Types
// =============================

export interface HubTabRow {
  id: string;
  agency_id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HubCategoryRow {
  id: string;
  agency_id: string;
  name: string;
  slug: string;
  type: 'document' | 'password';
  color: string | null;
  icon: string | null;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// =============================
// Hub Tabs Operations
// =============================

export async function fetchHubTabs(agencyId: string): Promise<HubTabRow[]> {
  const { data, error } = await supabase
    .from('hub_tabs')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching hub tabs', error);
    return [];
  }

  return (data as HubTabRow[]) ?? [];
}

export async function initHubTabsForAgency(agencyId: string): Promise<boolean> {
  const { error } = await supabase.rpc('init_hub_tabs_for_agency', {
    p_agency_id: agencyId,
  });

  if (error) {
    console.error('Error initializing hub tabs', error);
    return false;
  }

  return true;
}

export interface CreateHubTabInput {
  agencyId: string;
  name: string;
  slug: string;
  icon?: string | null;
  sortOrder?: number;
  createdBy?: string | null;
}

export async function createHubTab(input: CreateHubTabInput): Promise<HubTabRow | null> {
  // Get next sort order if not provided
  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const { data: maxData } = await supabase
      .from('hub_tabs')
      .select('sort_order')
      .eq('agency_id', input.agencyId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    sortOrder = (maxData?.sort_order ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from('hub_tabs')
    .insert({
      agency_id: input.agencyId,
      name: input.name,
      slug: input.slug,
      icon: input.icon ?? null,
      sort_order: sortOrder,
      is_system: false,
      is_active: true,
      created_by: input.createdBy ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating hub tab', error);
    return null;
  }

  return (data as HubTabRow) ?? null;
}

export interface UpdateHubTabInput {
  name?: string;
  slug?: string;
  icon?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export async function updateHubTab(id: string, input: UpdateHubTabInput): Promise<HubTabRow | null> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) payload.name = input.name;
  if (input.slug !== undefined) payload.slug = input.slug;
  if (input.icon !== undefined) payload.icon = input.icon;
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder;
  if (input.isActive !== undefined) payload.is_active = input.isActive;

  const { data, error } = await supabase
    .from('hub_tabs')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating hub tab', error);
    return null;
  }

  return (data as HubTabRow) ?? null;
}

export async function deleteHubTab(id: string): Promise<boolean> {
  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('hub_tabs')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('is_system', false); // Only allow deleting non-system tabs

  if (error) {
    console.error('Error deleting hub tab', error);
    return false;
  }

  return true;
}

// =============================
// Hub Categories Operations
// =============================

export async function fetchHubCategories(
  agencyId: string,
  type?: 'document' | 'password'
): Promise<HubCategoryRow[]> {
  let query = supabase
    .from('hub_categories')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching hub categories', error);
    return [];
  }

  return (data as HubCategoryRow[]) ?? [];
}

export async function fetchDocumentCategories(agencyId: string): Promise<HubCategoryRow[]> {
  return fetchHubCategories(agencyId, 'document');
}

export async function fetchPasswordCategories(agencyId: string): Promise<HubCategoryRow[]> {
  return fetchHubCategories(agencyId, 'password');
}

export async function initHubCategoriesForAgency(agencyId: string): Promise<boolean> {
  const { error } = await supabase.rpc('init_hub_categories_for_agency', {
    p_agency_id: agencyId,
  });

  if (error) {
    console.error('Error initializing hub categories', error);
    return false;
  }

  return true;
}

export interface CreateHubCategoryInput {
  agencyId: string;
  name: string;
  slug: string;
  type: 'document' | 'password';
  color?: string | null;
  icon?: string | null;
  sortOrder?: number;
  createdBy?: string | null;
}

export async function createHubCategory(input: CreateHubCategoryInput): Promise<HubCategoryRow | null> {
  // Get next sort order if not provided
  let sortOrder = input.sortOrder;
  if (sortOrder === undefined) {
    const { data: maxData } = await supabase
      .from('hub_categories')
      .select('sort_order')
      .eq('agency_id', input.agencyId)
      .eq('type', input.type)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    sortOrder = (maxData?.sort_order ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from('hub_categories')
    .insert({
      agency_id: input.agencyId,
      name: input.name,
      slug: input.slug,
      type: input.type,
      color: input.color ?? null,
      icon: input.icon ?? null,
      sort_order: sortOrder,
      is_system: false,
      is_active: true,
      created_by: input.createdBy ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating hub category', error);
    return null;
  }

  return (data as HubCategoryRow) ?? null;
}

export interface UpdateHubCategoryInput {
  name?: string;
  slug?: string;
  color?: string | null;
  icon?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export async function updateHubCategory(id: string, input: UpdateHubCategoryInput): Promise<HubCategoryRow | null> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) payload.name = input.name;
  if (input.slug !== undefined) payload.slug = input.slug;
  if (input.color !== undefined) payload.color = input.color;
  if (input.icon !== undefined) payload.icon = input.icon;
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder;
  if (input.isActive !== undefined) payload.is_active = input.isActive;

  const { data, error } = await supabase
    .from('hub_categories')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating hub category', error);
    return null;
  }

  return (data as HubCategoryRow) ?? null;
}

export async function deleteHubCategory(id: string): Promise<boolean> {
  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('hub_categories')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('is_system', false); // Only allow deleting non-system categories

  if (error) {
    console.error('Error deleting hub category', error);
    return false;
  }

  return true;
}

// =============================
// Utility
// =============================

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
