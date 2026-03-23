export type MovementLike = {
  id: string;
  property?: string | null;
  address?: string | null;
  type?: string | null;
  status?: string | null;
  price?: number | null;
  feeAmount?: number | null;
  fee_amount?: number | null;
  feePercentage?: number | null;
  fee_percentage?: number | null;
  date?: string | null;
  agent?: string | null;
  branch?: string | null;
  branch_id?: string | null;
};

const STATUS_PRIORITY: Record<string, number> = {
  valuation: 10,
  'on-books': 20,
  'on-books-status': 20,
  offer: 30,
  'let-offer': 30,
  sale: 40,
  exchanged: 50,
  completed: 60,
  let: 60,
  'price-change': 35,
  'back-on': 15,
  'back-on-let': 15,
  abort: 5,
  withdrawn: 5,
  'withdrawn-sales': 5,
  'valuation-referral': 5,
  'aml-referral': 30,
  'legal-referral': 30,
  'legal-signup': 30,
  'mortgage-referral': 30,
  'mortgage-signup': 30,
};

const B2B_STATUSES = new Set<string>([
  'mortgage-referral',
  'aml-referral',
  'legal-referral',
  'mortgage-signup',
  'legal-signup',
]);

const SALES_REVENUE_STATUSES = new Set<string>(['sale', 'exchanged', 'completed']);
const LETTINGS_REVENUE_STATUSES = new Set<string>(['let', 'completed']);

const normalize = (value: string | null | undefined): string =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const getMovementStatus = (movement: MovementLike): string => normalize(movement.status);
const getMovementType = (movement: MovementLike): string => normalize(movement.type);

const getDateValue = (date: string | null | undefined): number => {
  if (!date) return 0;
  const ts = new Date(date).getTime();
  return Number.isFinite(ts) ? ts : 0;
};

export const getMovementIdentityKey = (movement: MovementLike): string => {
  const address = normalize(movement.address);
  const property = normalize(movement.property);
  const branch = normalize(movement.branch ?? movement.branch_id);
  const type = getMovementType(movement);
  const agent = normalize(movement.agent);

  if (!address && !property) return movement.id;
  return `${type}|${address}|${property}|${branch}|${agent}`;
};

const isMoreRecentMovement = <T extends MovementLike>(candidate: T, current: T): boolean => {
  const candidateDate = getDateValue(candidate.date);
  const currentDate = getDateValue(current.date);

  if (candidateDate !== currentDate) {
    return candidateDate > currentDate;
  }

  const candidatePriority = STATUS_PRIORITY[getMovementStatus(candidate)] ?? 0;
  const currentPriority = STATUS_PRIORITY[getMovementStatus(current)] ?? 0;
  if (candidatePriority !== currentPriority) {
    return candidatePriority > currentPriority;
  }

  return candidate.id > current.id;
};

export const dedupeMovementsByListing = <T extends MovementLike>(movements: T[]): T[] => {
  const latestByListing = new Map<string, T>();

  for (const movement of movements) {
    const key = getMovementIdentityKey(movement);
    const existing = latestByListing.get(key);

    if (!existing || isMoreRecentMovement(movement, existing)) {
      latestByListing.set(key, movement);
    }
  }

  return Array.from(latestByListing.values());
};

export const calculateMovementRevenue = (movement: MovementLike): number => {
  const explicitFee = movement.feeAmount ?? movement.fee_amount ?? 0;
  if (explicitFee > 0) return explicitFee;

  const feePercentage = movement.feePercentage ?? movement.fee_percentage ?? 0;
  const price = movement.price ?? 0;
  if (feePercentage > 0 && price > 0) {
    return (price * feePercentage) / 100;
  }

  return 0;
};

export const isB2BReferralMovement = (movement: MovementLike): boolean =>
  B2B_STATUSES.has(getMovementStatus(movement));

export const isSalesRevenueMovement = (movement: MovementLike): boolean =>
  getMovementType(movement) === 'sale' && SALES_REVENUE_STATUSES.has(getMovementStatus(movement));

export const isLettingsRevenueMovement = (movement: MovementLike): boolean =>
  getMovementType(movement) === 'letting' && LETTINGS_REVENUE_STATUSES.has(getMovementStatus(movement));
