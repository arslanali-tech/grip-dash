export type ViewingArrangement =
  | 'book-by-appointment'
  | 'keys-held'
  | 'keys-with-agent'
  | 'other';

export const viewingArrangementOptions: Array<{
  value: ViewingArrangement;
  label: string;
}> = [
  { value: 'book-by-appointment', label: 'Book by appointment' },
  { value: 'keys-held', label: 'Keys held' },
  { value: 'keys-with-agent', label: 'Keys with agent' },
  { value: 'other', label: 'Other' },
];

export const normalizeViewingArrangement = (
  value: unknown
): ViewingArrangement | undefined => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (
    normalized === 'book-by-appointment' ||
    normalized === 'keys-held' ||
    normalized === 'keys-with-agent' ||
    normalized === 'other'
  ) {
    return normalized;
  }
  return undefined;
};

export const getViewingArrangementLabel = (
  value: string | null | undefined
): string => {
  const normalized = normalizeViewingArrangement(value);
  return viewingArrangementOptions.find((option) => option.value === normalized)?.label ?? 'Not set';
};
