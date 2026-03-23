const PROSPECT_META_TAG = '[grip-prospect-meta]';

export interface ProspectNoteEntry {
  content: string;
  createdBy?: string;
  createdAt?: string;
}

export interface ProspectStatusHistoryEntry {
  status: string;
  changedBy?: string;
  changedAt?: string;
}

interface ProspectNotesMetadata {
  currentAgent?: string;
  photoDataUrls?: string[];
  noteEntries?: ProspectNoteEntry[];
  statusHistory?: ProspectStatusHistoryEntry[];
}

const CURRENT_AGENT_PATTERNS: RegExp[] = [
  /^\s*\[current-agent\]\s*:\s*(.+)\s*$/i,
  /^\s*current agent\s*:\s*(.+)\s*$/i,
];

const normalizeLineEndings = (value: string) => value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const buildProspectMetadata = (
  currentAgent?: string | null,
  photoDataUrls?: string[] | null
): ProspectNotesMetadata => {
  const normalizedAgent = (currentAgent ?? '').trim();
  const normalizedPhotos = Array.from(
    new Set(
      (photoDataUrls ?? [])
        .map((value) => `${value ?? ''}`.trim())
        .filter((value) => value.length > 0)
    )
  );

  const metadata: ProspectNotesMetadata = {};
  if (normalizedAgent) {
    metadata.currentAgent = normalizedAgent;
  }
  if (normalizedPhotos.length > 0) {
    metadata.photoDataUrls = normalizedPhotos;
  }
  return metadata;
};

export const encodeProspectNotes = (
  notes?: string | null,
  currentAgent?: string | null,
  photoDataUrls?: string[] | null,
  noteEntries?: ProspectNoteEntry[] | null,
  statusHistory?: ProspectStatusHistoryEntry[] | null
): string | undefined => {
  const normalizedNotes = (notes ?? '').trim();
  const metadata = buildProspectMetadata(currentAgent, photoDataUrls);
  const normalizedNoteEntries = Array.from(
    new Set(
      (noteEntries ?? [])
        .map((entry) => {
          const content = `${entry?.content ?? ''}`.trim();
          if (!content) return null;
          return JSON.stringify({
            content,
            createdBy:
              typeof entry?.createdBy === 'string' && entry.createdBy.trim()
                ? entry.createdBy.trim()
                : undefined,
            createdAt:
              typeof entry?.createdAt === 'string' && entry.createdAt.trim()
                ? entry.createdAt.trim()
                : undefined,
          });
        })
        .filter((value): value is string => !!value)
    )
  ).map((raw) => JSON.parse(raw) as ProspectNoteEntry);
  if (normalizedNoteEntries.length > 0) {
    metadata.noteEntries = normalizedNoteEntries;
  }

  const normalizedStatusHistory = Array.from(
    new Set(
      (statusHistory ?? [])
        .map((entry) => {
          const status = `${entry?.status ?? ''}`.trim().toLowerCase();
          if (!status) return null;
          return JSON.stringify({
            status,
            changedBy:
              typeof entry?.changedBy === 'string' && entry.changedBy.trim()
                ? entry.changedBy.trim()
                : undefined,
            changedAt:
              typeof entry?.changedAt === 'string' && entry.changedAt.trim()
                ? entry.changedAt.trim()
                : undefined,
          });
        })
        .filter((value): value is string => !!value)
    )
  ).map((raw) => JSON.parse(raw) as ProspectStatusHistoryEntry);

  if (normalizedStatusHistory.length > 0) {
    metadata.statusHistory = normalizedStatusHistory;
  }
  const hasMetadata = Object.keys(metadata).length > 0;

  if (!hasMetadata) {
    return normalizedNotes || undefined;
  }

  const metadataLine = `${PROSPECT_META_TAG}: ${JSON.stringify(metadata)}`;
  if (!normalizedNotes) {
    return metadataLine;
  }

  return `${metadataLine}\n\n${normalizedNotes}`;
};

export const decodeProspectNotes = (
  rawNotes?: string | null
): {
  notes: string;
  currentAgent?: string;
  photoDataUrls?: string[];
  noteEntries?: ProspectNoteEntry[];
  statusHistory?: ProspectStatusHistoryEntry[];
} => {
  if (!rawNotes) {
    return { notes: '' };
  }

  const lines = normalizeLineEndings(rawNotes).split('\n');
  const keptLines: string[] = [];
  let currentAgent: string | undefined;
  let photoDataUrls: string[] | undefined;
  let noteEntries: ProspectNoteEntry[] | undefined;
  let statusHistory: ProspectStatusHistoryEntry[] | undefined;

  for (const line of lines) {
    const metaMatch = line.match(/^\s*\[grip-prospect-meta\]\s*:\s*(\{.*\})\s*$/i);
    if (metaMatch) {
      try {
        const parsed = JSON.parse(metaMatch[1]) as ProspectNotesMetadata;
        const parsedAgent =
          typeof parsed.currentAgent === 'string' ? parsed.currentAgent.trim() : '';
        if (parsedAgent && !currentAgent) {
          currentAgent = parsedAgent;
        }

        const parsedPhotos = Array.isArray(parsed.photoDataUrls)
          ? parsed.photoDataUrls
              .map((value) => `${value ?? ''}`.trim())
              .filter((value) => value.length > 0)
          : [];
        if (parsedPhotos.length > 0) {
          photoDataUrls = Array.from(new Set(parsedPhotos));
        }

        const parsedEntries = Array.isArray(parsed.noteEntries)
          ? parsed.noteEntries
              .map((entry) => {
                const content =
                  typeof entry?.content === 'string' ? entry.content.trim() : '';
                if (!content) return null;
                return {
                  content,
                  createdBy:
                    typeof entry?.createdBy === 'string' && entry.createdBy.trim()
                      ? entry.createdBy.trim()
                      : undefined,
                  createdAt:
                    typeof entry?.createdAt === 'string' && entry.createdAt.trim()
                      ? entry.createdAt.trim()
                      : undefined,
                };
              })
              .filter((entry): entry is ProspectNoteEntry => !!entry)
          : [];
        if (parsedEntries.length > 0) {
          noteEntries = parsedEntries;
        }

        const parsedStatusHistory = Array.isArray(parsed.statusHistory)
          ? parsed.statusHistory
              .map((entry) => {
                const status =
                  typeof entry?.status === 'string' ? entry.status.trim().toLowerCase() : '';
                if (!status) return null;
                return {
                  status,
                  changedBy:
                    typeof entry?.changedBy === 'string' && entry.changedBy.trim()
                      ? entry.changedBy.trim()
                      : undefined,
                  changedAt:
                    typeof entry?.changedAt === 'string' && entry.changedAt.trim()
                      ? entry.changedAt.trim()
                      : undefined,
                };
              })
              .filter((entry): entry is ProspectStatusHistoryEntry => !!entry)
          : [];
        if (parsedStatusHistory.length > 0) {
          statusHistory = parsedStatusHistory;
        }
      } catch {
        keptLines.push(line);
      }
      continue;
    }

    let matched = false;
    for (const pattern of CURRENT_AGENT_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        const parsed = match[1]?.trim();
        if (parsed && !currentAgent) {
          currentAgent = parsed;
        }
        matched = true;
        break;
      }
    }
    if (!matched) {
      keptLines.push(line);
    }
  }

  const notes = keptLines.join('\n').trim();
  if (!noteEntries && notes) {
    noteEntries = [{ content: notes }];
  }

  const result: {
    notes: string;
    currentAgent?: string;
    photoDataUrls?: string[];
    noteEntries?: ProspectNoteEntry[];
    statusHistory?: ProspectStatusHistoryEntry[];
  } = {
    notes,
  };
  if (currentAgent) {
    result.currentAgent = currentAgent;
  }
  if (photoDataUrls && photoDataUrls.length > 0) {
    result.photoDataUrls = photoDataUrls;
  }
  if (noteEntries && noteEntries.length > 0) {
    result.noteEntries = noteEntries;
  }
  if (statusHistory && statusHistory.length > 0) {
    result.statusHistory = statusHistory;
  }
  return result;
};

export const appendProspectStatusHistory = (
  current: ProspectStatusHistoryEntry[] | undefined,
  nextStatus: string,
  changedBy?: string | null,
  changedAt?: string | null
): ProspectStatusHistoryEntry[] => {
  const normalizedStatus = `${nextStatus ?? ''}`.trim().toLowerCase();
  if (!normalizedStatus) return current ?? [];

  const base = Array.isArray(current) ? [...current] : [];
  const last = base[base.length - 1];
  if (last?.status === normalizedStatus) {
    return base;
  }

  const entry: ProspectStatusHistoryEntry = {
    status: normalizedStatus,
    changedBy: changedBy?.trim() || undefined,
    changedAt: changedAt?.trim() || new Date().toISOString(),
  };

  return [...base, entry];
};
