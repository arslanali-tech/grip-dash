import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { calculateMovementRevenue, dedupeMovementsByListing, isB2BReferralMovement, isLettingsRevenueMovement, isSalesRevenueMovement } from '@/lib/movementMetrics';
import type { ViewingArrangement } from '@/lib/viewingArrangements';

export type MovementType = 'sale' | 'letting';

export interface Movement {
  id: string;
  agency_id: string;
  client_id: string | null;
  branch_id: string | null;
  property: string | null;
  address: string | null;
  type: MovementType | null;
  status: string | null;
  price: number | null;
  fee_amount: number | null;
  fee_percentage: number | null;
  date: string | null;
  agent: string | null;
  board: boolean | null;
  viewing_arrangements: ViewingArrangement | null;
  viewing_notes: string | null;
  notes: string | null;
  motivated_seller: string | null;
  created_at: string;
  updated_at: string;
}

export interface MovementInput {
  branch_id?: string | null;
  property?: string;
  address?: string;
  type?: MovementType;
  status?: string;
  price?: number;
  fee_amount?: number;
  fee_percentage?: number;
  date?: string;
  agent?: string;
  board?: boolean;
  viewing_arrangements?: ViewingArrangement | null;
  viewing_notes?: string | null;
  notes?: string;
  motivated_seller?: string;
}

export interface MovementNote {
  id: string;
  movement_id: string;
  content: string;
  created_by: string | null;
  created_at: string;
}

export interface MovementOffer {
  id: string;
  movement_id: string;
  amount: number | null;
  buyer: string | null;
  status: string | null;
  submitted_date: string | null;
  notes: string | null;
  created_at: string;
}

export type ProspectType = 'for-sale' | 'to-let';
export interface Prospect {
  id: string;
  agency_id: string;
  branch_id: string | null;
  date: string | null;
  stage: string | null;
  address: string | null;
  prospector: string | null;
  notes: string | null;
  price_est: number | null;
  type: ProspectType | null;
  hot_cold: string | null;
  movement_booked: boolean | null;
  linked_movement_id: string | null;
  created_at: string;
}

export interface ProspectInput {
  branch_id?: string | null;
  date?: string;
  stage?: string;
  address?: string;
  prospector?: string;
  notes?: string;
  price_est?: number;
  type?: ProspectType;
  hot_cold?: string;
  movement_booked?: boolean;
  linked_movement_id?: string | null;
}

type PostgrestLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

const isMissingClientIdColumnError = (error: PostgrestLikeError | null | undefined): boolean => {
  if (!error) return false;
  const code = `${error.code ?? ''}`;
  const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  const mentionsClientId = text.includes('client_id');
  const indicatesMissingColumn =
    text.includes('does not exist') ||
    text.includes('schema cache') ||
    text.includes('could not find the') ||
    text.includes('column');

  return (
    mentionsClientId &&
    (indicatesMissingColumn || code === '42703' || code === 'PGRST204' || code === 'PGRST100')
  );
};

const decodeJwtClaims = (accessToken: string | null | undefined): Record<string, any> | null => {
  if (!accessToken) return null;
  const decoder = (globalThis as any)?.atob;
  if (typeof decoder !== 'function') return null;
  try {
    const parts = accessToken.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = payload.length % 4 === 0 ? '' : '='.repeat(4 - (payload.length % 4));
    return JSON.parse(decoder(payload + padding));
  } catch {
    return null;
  }
};

let movementsClientIdColumnAvailable: boolean | null = null;
let prospectsClientIdColumnAvailable: boolean | null = null;

const normalizeClientIds = (clientId?: string | string[] | null): string[] => {
  if (!clientId) return [];
  const values = Array.isArray(clientId) ? clientId : [clientId];
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
};

export async function resolveAgencyIdForUser(user: User | null): Promise<string | null> {
  if (!user) return null;
  const metaAgency =
    (user.user_metadata as any)?.agency_id ??
    (user.app_metadata as any)?.agency_id ??
    null;
  if (metaAgency) return metaAgency as string;
  // Branch managers and clients may only have client_id in metadata
  const metaClientId =
    (user.user_metadata as any)?.client_id ??
    (user.app_metadata as any)?.client_id ??
    null;
  if (metaClientId) {
    const { data, error } = await supabase
      .from('clients')
      .select('agency_id')
      .eq('id', metaClientId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Could not resolve agency from client_id:', error.message);
    } else if ((data as any)?.agency_id) {
      return (data as any).agency_id ?? null;
    }
  }

  // Fallback: resolve by client email (for client users without metadata)
  if (user.email) {
    const normalizedEmail = user.email.trim().toLowerCase();
    const { data, error } = await supabase
      .from('clients')
      .select('agency_id')
      .ilike('email', normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Could not resolve agency from clients table by email:', error.message);
    } else if ((data as any)?.agency_id) {
      return (data as any).agency_id ?? null;
    }
  }

  const { data, error } = await supabase
    .from('agency_admins')
    .select('agency_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('Could not resolve agency from agency_admins:', error.message);
    return null;
  }

  return (data as any)?.agency_id ?? null;
}

export async function resolveClientIdForUser(user: User | null): Promise<string | null> {
  if (!user) return null;
  
  // First check user metadata for client_id
  const metaClientId =
    (user.user_metadata as any)?.client_id ??
    (user.app_metadata as any)?.client_id ??
    null;
  if (metaClientId) return metaClientId as string;

  // Next, check top-level JWT claims (some RLS setups inject client_id there).
  const { data: sessionData } = await supabase.auth.getSession();
  const claims = decodeJwtClaims(sessionData?.session?.access_token);
  const claimClientId =
    (claims?.client_id as string | undefined) ??
    ((claims?.user_metadata as any)?.client_id as string | undefined) ??
    null;
  if (claimClientId) return claimClientId;

  // Try to find client by matching email (case-insensitive)
  if (!user.email) return null;

  const normalizedEmail = user.email.trim().toLowerCase();
  const { data, error } = await supabase
    .from('clients')
    .select('id')
    .ilike('email', normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('Could not resolve client from clients table:', error.message);
  } else if ((data as any)?.id) {
    return (data as any).id ?? null;
  }

  // Staff users may not exist in clients.email; resolve via client_staff.email.
  const { data: staffData, error: staffError } = await supabase
    .from('client_staff')
    .select('client_id')
    .ilike('email', normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (staffError) {
    console.warn('Could not resolve client from client_staff table:', staffError.message);
    return null;
  }

  return (staffData as any)?.client_id ?? null;
}

// Movements
export async function fetchMovements(agencyId: string, clientId?: string | string[]): Promise<Movement[]> {
  const clientIds = normalizeClientIds(clientId);
  const buildQuery = (includeClientIdFilter: boolean) => {
    let query = supabase
      .from('movements')
      // Include related branch so we can display a human-friendly branch name
      .select('*, client_branches(name), movement_offers(id, amount, buyer, status, submitted_date, notes, created_at)')
      .eq('agency_id', agencyId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (includeClientIdFilter && clientIds.length > 0) {
      query = clientIds.length > 1 ? query.in('client_id', clientIds) : query.eq('client_id', clientIds[0]);
    }

    return query;
  };

  const shouldUseClientIdFilter = clientIds.length > 0 && movementsClientIdColumnAvailable !== false;
  let { data, error } = await buildQuery(shouldUseClientIdFilter);
  if (!error && shouldUseClientIdFilter) {
    movementsClientIdColumnAvailable = true;
  }
  if (error && shouldUseClientIdFilter && isMissingClientIdColumnError(error as PostgrestLikeError)) {
    movementsClientIdColumnAvailable = false;
    console.warn('movements.client_id column missing; retrying fetchMovements without client_id filter');
    ({ data, error } = await buildQuery(false));
  }

  if (error) {
    console.error('Error fetching movements', error);
    return [];
  }
  return (data as Movement[]) ?? [];
}

export async function createMovement(agencyId: string, input: MovementInput, clientId?: string): Promise<Movement | null> {
  let effectiveClientId = clientId ?? null;
  if (!effectiveClientId) {
    const { data: authData } = await supabase.auth.getUser();
    effectiveClientId = await resolveClientIdForUser(authData?.user ?? null);
  }

  const buildInsertPayload = (includeClientIdColumn: boolean) => ({
    agency_id: agencyId,
    ...(includeClientIdColumn ? { client_id: effectiveClientId ?? null } : {}),
    ...input,
  });

  const shouldIncludeClientIdColumn = movementsClientIdColumnAvailable !== false;
  let { data, error } = await supabase
    .from('movements')
    .insert(buildInsertPayload(shouldIncludeClientIdColumn))
    .select('*')
    .single();

  if (!error && shouldIncludeClientIdColumn) {
    movementsClientIdColumnAvailable = true;
  }

  if (error && shouldIncludeClientIdColumn && isMissingClientIdColumnError(error as PostgrestLikeError)) {
    movementsClientIdColumnAvailable = false;
    console.warn('movements.client_id column missing; retrying createMovement without client_id column');
    ({ data, error } = await supabase
      .from('movements')
      .insert(buildInsertPayload(false))
      .select('*')
      .single());
  }

  if (error) {
    console.error('Error creating movement', error);
    return null;
  }
  return data as Movement;
}

export async function updateMovement(id: string, input: MovementInput): Promise<Movement | null> {
  const { data, error } = await supabase
    .from('movements')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating movement', error);
    return null;
  }
  return data as Movement;
}

export async function updateMovementsNotesForAddress(
  agencyId: string,
  address: string,
  notes: string,
  clientId?: string | string[]
): Promise<void> {
  const trimmedAddress = address.trim();
  const trimmedNotes = notes.trim();
  if (!trimmedAddress || !trimmedNotes) return;

  let query = supabase
    .from('movements')
    .update({ notes: trimmedNotes })
    .eq('agency_id', agencyId)
    .ilike('address', trimmedAddress);

  const clientIds = normalizeClientIds(clientId);
  if (clientIds.length > 0) {
    query = clientIds.length > 1 ? query.in('client_id', clientIds) : query.eq('client_id', clientIds[0]);
  }

  const { error } = await query;
  if (error) {
    console.error('Error updating movement notes for address', error);
  }
}

export async function deleteMovement(id: string): Promise<void> {
  const { error } = await supabase.from('movements').delete().eq('id', id);
  if (error) {
    console.error('Error deleting movement', error);
  }
}

// Notes
export async function fetchMovementNotes(movementId: string): Promise<MovementNote[]> {
  const { data, error } = await supabase
    .from('movement_notes')
    .select('*')
    .eq('movement_id', movementId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching movement notes', error);
    return [];
  }
  return (data as MovementNote[]) ?? [];
}

export async function addMovementNote(
  movementId: string,
  content: string,
  createdBy?: string
): Promise<MovementNote | null> {
  const { data, error } = await supabase
    .from('movement_notes')
    .insert({ movement_id: movementId, content, created_by: createdBy ?? null })
    .select()
    .single();

  if (error) {
    console.error('Error adding movement note', error);
    // Return a local fallback if insert succeeded but select failed due to RLS
    if (error.code === 'PGRST116') {
      return {
        id: `local-note-${Date.now()}`,
        movement_id: movementId,
        content,
        created_by: createdBy ?? null,
        created_at: new Date().toISOString(),
      };
    }
    return null;
  }
  
  return data as MovementNote;
}

// Offers
export async function fetchMovementOffers(movementId: string): Promise<MovementOffer[]> {
  const { data, error } = await supabase
    .from('movement_offers')
    .select('*')
    .eq('movement_id', movementId)
    .order('submitted_date', { ascending: false });

  if (error) {
    console.error('Error fetching movement offers', error);
    return [];
  }
  return (data as MovementOffer[]) ?? [];
}

export async function addMovementOffer(
  movementId: string,
  input: { amount?: number; buyer?: string; status?: string; submitted_date?: string; notes?: string }
): Promise<MovementOffer | null> {
  // Avoid requiring SELECT permission on insert to prevent 403 from RLS when returning
  const { error } = await supabase
    .from('movement_offers')
    .insert({ movement_id: movementId, ...input });

  if (error) {
    console.error('Error adding movement offer', error);
    return null;
  }

  const normalizedOfferNotes = input.notes?.trim();
  const normalizedOfferAmount =
    typeof input.amount === 'number' && Number.isFinite(input.amount) ? input.amount : undefined;

  // Also create a movement history row in offer stage while keeping the same property data.
  // Always create a new row for each new offer.
  try {
    const { data: movementRow, error: movementError } = await supabase
      .from('movements')
      .select('*')
      .eq('id', movementId)
      .single();

    if (movementError) {
      console.error('Error loading movement for offer status clone', movementError);
    } else {
      const offerStatus = movementRow?.type === 'letting' ? 'let-offer' : 'offer';
      let relatedMovementIds: string[] = [movementId];
      let clonedFeeAmount =
        typeof movementRow?.fee_amount === 'number' && Number.isFinite(movementRow.fee_amount)
          ? movementRow.fee_amount
          : undefined;
      let clonedFeePercentage =
        typeof movementRow?.fee_percentage === 'number' && Number.isFinite(movementRow.fee_percentage)
          ? movementRow.fee_percentage
          : undefined;

      // Choose the richest row for this property so the new offer row keeps full details.
      let sourceMovementId = movementId;
      const address = (movementRow?.address ?? '').trim();
      if (address && movementRow?.agency_id) {
        let relatedQuery = supabase
          .from('movements')
          .select('*')
          .eq('agency_id', movementRow.agency_id)
          .eq('address', address)
          .order('created_at', { ascending: false })
          .limit(50);

        if (movementRow.client_id) {
          relatedQuery = relatedQuery.eq('client_id', movementRow.client_id);
        }

        const { data: relatedRows, error: relatedError } = await relatedQuery;
        if (relatedError) {
          console.error('Error loading related movements for offer clone', relatedError);
        } else {
          const candidates = ((relatedRows as Movement[] | null) ?? []).filter((row) => {
            if (!movementRow?.type) return true;
            return row.type === movementRow.type;
          });
          relatedMovementIds = Array.from(new Set(candidates.map((row) => row.id).filter(Boolean)));
          if (relatedMovementIds.length === 0) {
            relatedMovementIds = [movementId];
          }

          const scoreMovement = (row: Movement): number => {
            let score = 0;
            if ((row.property ?? '').trim()) score += 2;
            if ((row.address ?? '').trim()) score += 2;
            if (row.price !== null && row.price !== undefined) score += 2;
            if (row.fee_amount !== null && row.fee_amount !== undefined) score += 1;
            if (row.fee_percentage !== null && row.fee_percentage !== undefined) score += 1;
            if ((row.agent ?? '').trim()) score += 1;
            if (row.branch_id) score += 1;
            if (row.board !== null && row.board !== undefined) score += 1;
            if ((row.motivated_seller ?? '').trim()) score += 1;
            if ((row.notes ?? '').trim()) score += 1;
            return score;
          };

          const bestRow = candidates
            .slice()
            .sort((left, right) => {
              const scoreDiff = scoreMovement(right) - scoreMovement(left);
              if (scoreDiff !== 0) return scoreDiff;
              const rightTime = new Date(right.updated_at ?? right.created_at).getTime();
              const leftTime = new Date(left.updated_at ?? left.created_at).getTime();
              return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
            })[0];

          if (bestRow?.id) {
            sourceMovementId = bestRow.id;
          }

          if (clonedFeeAmount === undefined) {
            const candidateWithFeeAmount = candidates.find(
              (row) => typeof row.fee_amount === 'number' && Number.isFinite(row.fee_amount)
            );
            if (candidateWithFeeAmount) {
              clonedFeeAmount = candidateWithFeeAmount.fee_amount as number;
            }
          }

          if (clonedFeePercentage === undefined) {
            const candidateWithFeePercentage = candidates.find(
              (row) => typeof row.fee_percentage === 'number' && Number.isFinite(row.fee_percentage)
            );
            if (candidateWithFeePercentage) {
              clonedFeePercentage = candidateWithFeePercentage.fee_percentage as number;
            }
          }
        }
      }

      const calculatedOfferFeeAmount =
        normalizedOfferAmount !== undefined &&
        clonedFeePercentage !== undefined &&
        clonedFeePercentage > 0
          ? Math.round(((normalizedOfferAmount * clonedFeePercentage) / 100) * 100) / 100
          : clonedFeeAmount;

      const cloned = await createMovementWithNewStatus(sourceMovementId, offerStatus, {
        price: normalizedOfferAmount,
        fee_amount: calculatedOfferFeeAmount,
        fee_percentage: clonedFeePercentage,
      });
      if (cloned && normalizedOfferNotes) {
        await updateMovement(cloned.id, { notes: normalizedOfferNotes });
      }

      // Share offer text across all offers for this property timeline.
      if (normalizedOfferNotes && relatedMovementIds.length > 0) {
        const { data: relatedOffers, error: relatedOffersError } = await supabase
          .from('movement_offers')
          .select('id, notes')
          .in('movement_id', relatedMovementIds);

        if (relatedOffersError) {
          console.error('Error loading related offers for note sync', relatedOffersError);
        } else {
          await Promise.all(
            (((relatedOffers as Array<{ id: string; notes: string | null }> | null) ?? []).map(
              async (offerRow) => {
                if (!offerRow?.id) return;
                const existingNotes = (offerRow.notes ?? '').trim();
                const nextNotes = existingNotes
                  ? existingNotes.includes(normalizedOfferNotes)
                    ? existingNotes
                    : `${existingNotes}\n\n${normalizedOfferNotes}`
                  : normalizedOfferNotes;

                if (nextNotes !== (offerRow.notes ?? '')) {
                  await supabase
                    .from('movement_offers')
                    .update({ notes: nextNotes })
                    .eq('id', offerRow.id);
                }
              }
            )) ?? []
          );
        }
      }
    }
  } catch (cloneError) {
    console.error('Error creating offer status movement row', cloneError);
  }

  // We don't have the returned row due to no SELECT; fabricate a minimal object for UI usage
  return {
    id: '',
    movement_id: movementId,
    amount: input.amount ?? null,
    buyer: input.buyer ?? null,
    status: input.status ?? null,
    submitted_date: input.submitted_date ?? null,
    notes: input.notes ?? null,
    created_at: new Date().toISOString(),
  } as MovementOffer;
}

export async function updateMovementOffer(
  offerId: string,
  input: Partial<Pick<MovementOffer, 'amount' | 'buyer' | 'status' | 'submitted_date' | 'notes'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('movement_offers')
    .update(input)
    .eq('id', offerId);

  if (error) {
    console.error('Error updating movement offer', error);
    return false;
  }

  return true;
}

// Prospects
export async function fetchProspects(agencyId: string, clientId?: string | string[]): Promise<Prospect[]> {
  const clientIds = normalizeClientIds(clientId);
  const buildQuery = (includeClientIdFilter: boolean) => {
    let query = supabase
      .from('prospects')
      // Include related branch so we can display a human-friendly branch name
      .select('*, client_branches(name)')
      .eq('agency_id', agencyId)
      .order('date', { ascending: false });

    if (includeClientIdFilter && clientIds.length > 0) {
      query = clientIds.length > 1 ? query.in('client_id', clientIds) : query.eq('client_id', clientIds[0]);
    }

    return query;
  };

  const shouldUseClientIdFilter = clientIds.length > 0 && prospectsClientIdColumnAvailable !== false;
  let { data, error } = await buildQuery(shouldUseClientIdFilter);
  if (!error && shouldUseClientIdFilter) {
    prospectsClientIdColumnAvailable = true;
  }
  if (error && shouldUseClientIdFilter && isMissingClientIdColumnError(error as PostgrestLikeError)) {
    prospectsClientIdColumnAvailable = false;
    console.warn('prospects.client_id column missing; retrying fetchProspects without client_id filter');
    ({ data, error } = await buildQuery(false));
  }

  if (error) {
    console.error('Error fetching prospects', error);
    return [];
  }
  return (data as Prospect[]) ?? [];
}

export async function createProspect(agencyId: string, input: ProspectInput, clientId?: string): Promise<Prospect | null> {
  const { data, error } = await supabase
    .from('prospects')
    .insert({ agency_id: agencyId, client_id: clientId ?? null, ...input })
    .select('*')
    .single();

  if (error) {
    // Propagate error for UI to display
    const err: any = new Error(error.message);
    (err as any).supabaseError = error;
    throw err;
  }
  return data as Prospect;
}

export async function updateProspect(id: string, input: ProspectInput): Promise<Prospect | null> {
  const { data, error } = await supabase
    .from('prospects')
    .update(input)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating prospect', error);
    return null;
  }
  return data as Prospect;
}

export async function deleteProspect(id: string): Promise<boolean> {
  const { error } = await supabase.from('prospects').delete().eq('id', id);
  if (error) {
    console.error('Error deleting prospect', error);
    return false;
  }
  return true;
}

// Branch Performance Metrics
export interface BranchPerformanceMetrics {
  branchId: string;
  branchName: string;
  city: string;
  totalSales: number;
  totalLettings: number;
  totalRevenue: number;
  avgDealValue: number;
  completions: number;
  exchanges: number;
  instructions: number;
  aborts: number;
}

export interface MonthlyBranchMetrics {
  branchId: string;
  branchName: string;
  month: string;
  year: number;
  instructions: number;
  sales: number;
  salesValue: number;
  lettings: number;
  lettingsValue: number;
  exchanges: number;
  exchangesValue: number;
  completions: number;
  completionsValue: number;
  aborts: number;
  abortsValue: number;
  totalRevenue: number;
}

export async function fetchBranchPerformanceMetrics(agencyId: string): Promise<BranchPerformanceMetrics[]> {
  // Fetch branches
  const { data: branches, error: branchError } = await supabase
    .from('client_branches')
    .select('id, name, address, clients!inner(agency_id)')
    .eq('clients.agency_id', agencyId);

  if (branchError) {
    console.error('Error fetching branches for performance', branchError);
    return [];
  }

  // Fetch all movements for the agency
  const { data: movements, error: movementError } = await supabase
    .from('movements')
    .select('branch_id, type, status, price, fee_amount')
    .eq('agency_id', agencyId);

  if (movementError) {
    console.error('Error fetching movements for performance', movementError);
    return [];
  }

  // Aggregate metrics per branch
  const metricsMap = new Map<string, BranchPerformanceMetrics>();

  for (const branch of branches ?? []) {
    metricsMap.set(branch.id, {
      branchId: branch.id,
      branchName: branch.name,
      city: (branch as any).address ?? '',
      totalSales: 0,
      totalLettings: 0,
      totalRevenue: 0,
      avgDealValue: 0,
      completions: 0,
      exchanges: 0,
      instructions: 0,
      aborts: 0,
    });
  }

  for (const mov of movements ?? []) {
    if (!mov.branch_id) continue;
    const metrics = metricsMap.get(mov.branch_id);
    if (!metrics) continue;

    const revenue = mov.fee_amount ?? 0;
    metrics.totalRevenue += revenue;

    if (mov.type === 'sale') {
      metrics.totalSales += 1;
    } else if (mov.type === 'letting') {
      metrics.totalLettings += 1;
    }

    if (mov.status === 'completed') {
      metrics.completions += 1;
    } else if (mov.status === 'exchanged') {
      metrics.exchanges += 1;
    } else if (mov.status === 'on-books' || mov.status === 'valuation') {
      metrics.instructions += 1;
    } else if (mov.status === 'abort') {
      metrics.aborts += 1;
    }
  }

  // Calculate avg deal value
  for (const metrics of metricsMap.values()) {
    const totalDeals = metrics.totalSales + metrics.totalLettings;
    metrics.avgDealValue = totalDeals > 0 ? Math.round(metrics.totalRevenue / totalDeals) : 0;
  }

  return Array.from(metricsMap.values());
}

// Fetch client branches for an agency (used by UI components when movements don't include branch info)
export async function fetchClientBranches(agencyId: string): Promise<{ id: string; name: string }[]> {
  if (!agencyId) {
    console.warn('fetchClientBranches: agencyId is required');
    return [];
  }

  // Try approach 1: join via clients table
  let { data, error } = await supabase
    .from('client_branches')
    .select('id, name, clients!inner(agency_id)')
    .eq('clients.agency_id', agencyId);

  if (!error && data && (data as any[]).length > 0) {
    console.log('[fetchClientBranches] Found branches via clients join:', (data as any[]).length);
    return (data as any[]).map(r => ({ id: r.id, name: r.name }));
  }

  // Try approach 2: if join fails or returns empty, fetch all client_branches (may have looser RLS)
  console.warn('[fetchClientBranches] Join query returned empty or error, trying direct fetch...');
  const { data: directData, error: directError } = await supabase
    .from('client_branches')
    .select('id, name');

  if (directError) {
    console.error('[fetchClientBranches] Error fetching client branches (both approaches):', error?.message, directError?.message);
    return [];
  }

  if (directData && (directData as any[]).length > 0) {
    console.log('[fetchClientBranches] Found branches via direct fetch:', (directData as any[]).length);
    return (directData as any[]).map(r => ({ id: r.id, name: r.name }));
  }

  console.warn('[fetchClientBranches] No branches found for agencyId:', agencyId);
  return [];
}

export async function fetchMonthlyBranchMetrics(
  agencyId: string,
  year: number
): Promise<MonthlyBranchMetrics[]> {
  // Fetch branches
  const { data: branches, error: branchError } = await supabase
    .from('client_branches')
    .select('id, name, clients!inner(agency_id)')
    .eq('clients.agency_id', agencyId);

  if (branchError) {
    console.error('Error fetching branches', branchError);
    return [];
  }

  // Fetch movements for the given year
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data: movements, error: movementError } = await supabase
    .from('movements')
    .select('branch_id, type, status, price, fee_amount, date')
    .eq('agency_id', agencyId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (movementError) {
    console.error('Error fetching movements', movementError);
    return [];
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const results: MonthlyBranchMetrics[] = [];

  for (const branch of branches ?? []) {
    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const monthName = months[monthIndex];
      const branchMovements = (movements ?? []).filter((m) => {
        if (m.branch_id !== branch.id) return false;
        if (!m.date) return false;
        const movDate = new Date(m.date);
        return movDate.getMonth() === monthIndex;
      });

      const metrics: MonthlyBranchMetrics = {
        branchId: branch.id,
        branchName: branch.name,
        month: monthName,
        year,
        instructions: 0,
        sales: 0,
        salesValue: 0,
        lettings: 0,
        lettingsValue: 0,
        exchanges: 0,
        exchangesValue: 0,
        completions: 0,
        completionsValue: 0,
        aborts: 0,
        abortsValue: 0,
        totalRevenue: 0,
      };

      for (const mov of branchMovements) {
        const revenue = mov.fee_amount ?? 0;
        const price = mov.price ?? 0;
        metrics.totalRevenue += revenue;

        if (mov.type === 'sale') {
          metrics.sales += 1;
          metrics.salesValue += price;
        } else if (mov.type === 'letting') {
          metrics.lettings += 1;
          metrics.lettingsValue += price;
        }

        if (mov.status === 'completed') {
          metrics.completions += 1;
          metrics.completionsValue += price;
        } else if (mov.status === 'exchanged') {
          metrics.exchanges += 1;
          metrics.exchangesValue += price;
        } else if (mov.status === 'on-books' || mov.status === 'valuation') {
          metrics.instructions += 1;
        } else if (mov.status === 'abort') {
          metrics.aborts += 1;
          metrics.abortsValue += price;
        }
      }

      results.push(metrics);
    }
  }

  return results;
}

// Movement Status History
export interface MovementStatusHistoryItem {
  id: string;
  movementId: string;
  previousStatus: string | null;
  newStatus: string;
  changedBy: string | null;
  changedByName: string | null;
  notes: string | null;
  createdAt: string;
}

export async function fetchMovementStatusHistory(movementId: string): Promise<MovementStatusHistoryItem[]> {
  const { data, error } = await supabase
    .from('movement_status_history')
    .select('*')
    .eq('movement_id', movementId)
    .order('created_at', { ascending: false });

  if (error) {
    const errCode = (error as any)?.code ?? '';
    const errMessage = String((error as any)?.message ?? '').toLowerCase();
    if (errCode === 'PGRST205' || errMessage.includes('movement_status_history')) {
      return [];
    }
    console.error('Error fetching movement status history', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    movementId: row.movement_id,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    changedBy: row.changed_by,
    changedByName: row.changed_by_name,
    notes: row.notes,
    createdAt: row.created_at,
  }));
}

// Manual status history entry (for when trigger doesn't capture all info)
export async function addMovementStatusHistoryEntry(
  movementId: string,
  previousStatus: string | null,
  newStatus: string,
  notes?: string
): Promise<MovementStatusHistoryItem | null> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session?.session?.user?.id || null;
  const userName = session?.session?.user?.user_metadata?.name || null;

  const { data, error } = await supabase
    .from('movement_status_history')
    .insert({
      movement_id: movementId,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: userId,
      changed_by_name: userName,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding movement status history entry', error);
    return null;
  }

  return {
    id: data.id,
    movementId: data.movement_id,
    previousStatus: data.previous_status,
    newStatus: data.new_status,
    changedBy: data.changed_by,
    changedByName: data.changed_by_name,
    notes: data.notes,
    createdAt: data.created_at,
  };
}

// Fetch all movements for a given address (used for property history)
export async function fetchMovementsByAddress(agencyId: string, address: string, clientId?: string | string[]): Promise<Movement[]> {
  let query = supabase
    .from('movements')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('address', address)
    .order('created_at', { ascending: false });

  const clientIds = normalizeClientIds(clientId);
  if (clientIds.length > 0) {
    query = clientIds.length > 1 ? query.in('client_id', clientIds) : query.eq('client_id', clientIds[0]);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching movements by address', error);
    return [];
  }
  return (data as Movement[]) ?? [];
}

// Movement Analytics Info Cards data
export interface MovementAnalytics {
  totalMovements: number;
  salesCount: number;
  lettingsCount: number;
  valuationsCount: number;
  completedCount: number;
  exchangedCount: number;
  abortsCount: number;
  totalRevenue: number;
  avgDealValue: number;
  conversionRate: number;
}

// Create a new movement row when status changes (for status history tracking in the table)
export async function createMovementWithNewStatus(
  movementId: string,
  newStatus: string,
  overrides?: Partial<Pick<MovementInput, 'price' | 'date' | 'fee_amount' | 'fee_percentage'>>
): Promise<Movement | null> {
  const { data: originalMovement, error: originalError } = await supabase
    .from('movements')
    .select('*')
    .eq('id', movementId)
    .single();

  if (originalError || !originalMovement) {
    console.error('Error loading movement for status clone', originalError);
    return null;
  }

  const clonedDate =
    typeof overrides?.date === 'string' && overrides.date.trim().length > 0
      ? overrides.date
      : new Date().toISOString().slice(0, 10);
  const clonedPrice =
    typeof overrides?.price === 'number' && Number.isFinite(overrides.price)
      ? overrides.price
      : originalMovement.price;
  const clonedFeeAmount =
    typeof overrides?.fee_amount === 'number' && Number.isFinite(overrides.fee_amount)
      ? overrides.fee_amount
      : originalMovement.fee_amount;
  const clonedFeePercentage =
    typeof overrides?.fee_percentage === 'number' && Number.isFinite(overrides.fee_percentage)
      ? overrides.fee_percentage
      : originalMovement.fee_percentage;

  const { data, error } = await supabase
    .from('movements')
    .insert({
      agency_id: originalMovement.agency_id,
      client_id: originalMovement.client_id ?? null,
      branch_id: originalMovement.branch_id ?? null,
      property: originalMovement.property,
      address: originalMovement.address,
      type: originalMovement.type,
      status: newStatus,
      price: clonedPrice,
      fee_amount: clonedFeeAmount,
      fee_percentage: clonedFeePercentage,
      date: clonedDate,
      agent: originalMovement.agent,
      board: originalMovement.board,
      viewing_arrangements: originalMovement.viewing_arrangements ?? null,
      viewing_notes: originalMovement.viewing_notes ?? null,
      notes: originalMovement.notes,
      motivated_seller: originalMovement.motivated_seller,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating movement status row', error);
    return null;
  }
  return data as Movement;
}

export async function fetchMovementAnalytics(agencyId: string, dateFrom?: string, dateTo?: string, clientId?: string | string[]): Promise<MovementAnalytics> {
  let query = supabase
    .from('movements')
    .select('id, property, address, type, status, price, fee_amount, fee_percentage, date, agent, branch_id')
    .eq('agency_id', agencyId);

  // Filter by client_id if provided (for client users)
  const clientIds = normalizeClientIds(clientId);
  if (clientIds.length > 0) {
    query = clientIds.length > 1 ? query.in('client_id', clientIds) : query.eq('client_id', clientIds[0]);
  }

  if (dateFrom) {
    query = query.gte('date', dateFrom);
  }
  if (dateTo) {
    query = query.lte('date', dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching movement analytics', error);
    return {
      totalMovements: 0,
      salesCount: 0,
      lettingsCount: 0,
      valuationsCount: 0,
      completedCount: 0,
      exchangedCount: 0,
      abortsCount: 0,
      totalRevenue: 0,
      avgDealValue: 0,
      conversionRate: 0,
    };
  }

  const movementRows = (data ?? []) as Array<{
    id: string;
    property: string | null;
    address: string | null;
    type: string | null;
    status: string | null;
    price: number | null;
    fee_amount: number | null;
    fee_percentage: number | null;
    date: string | null;
    agent: string | null;
    branch_id: string | null;
  }>;

  const movements = dedupeMovementsByListing(movementRows);
  const totalMovements = movements.length;
  const salesCount = movements.filter(m => m.type === 'sale').length;
  const lettingsCount = movements.filter(m => m.type === 'letting').length;
  const valuationsCount = movements.filter(m => m.status === 'valuation').length;
  const completedCount = movements.filter(m => m.status === 'completed').length;
  const exchangedCount = movements.filter(m => m.status === 'exchanged').length;
  const abortsCount = movements.filter(m => m.status === 'abort').length;

  const totalSalesValue = movements
    .filter(isSalesRevenueMovement)
    .reduce((sum, m) => sum + (m.price ?? 0), 0);
  const totalLettingsRevenue = movements
    .filter(isLettingsRevenueMovement)
    .reduce((sum, m) => sum + calculateMovementRevenue(m), 0);
  const totalB2BRevenue = movements
    .filter(isB2BReferralMovement)
    .reduce((sum, m) => sum + calculateMovementRevenue(m), 0);

  const totalRevenue = totalSalesValue + totalLettingsRevenue + totalB2BRevenue;
  const successfulDeals = movements.filter(m => isSalesRevenueMovement(m) || isLettingsRevenueMovement(m)).length;
  const avgDealValue = successfulDeals > 0 ? (totalSalesValue + totalLettingsRevenue) / successfulDeals : 0;
  const conversionRate = totalMovements > 0 ? (successfulDeals / totalMovements) * 100 : 0;

  return {
    totalMovements,
    salesCount,
    lettingsCount,
    valuationsCount,
    completedCount,
    exchangedCount,
    abortsCount,
    totalRevenue,
    avgDealValue,
    conversionRate,
  };
}
