import { supabase } from '@/lib/supabaseClient';

export interface TeamChannelRow {
  id: string;
  agency_id: string;
  branch_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMessageRow {
  id: string;
  agency_id: string;
  branch_id: string | null;
  channel_id: string;
  sender_id: string | null;
  sender_name: string | null;
  sender_avatar: string | null;
  content: string;
  created_at: string;
  updated_at: string | null;
  is_edited: boolean;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
}

export interface TeamMessageReactionRow {
  id: string;
  message_id: string;
  user_id: string;
  user_name: string | null;
  emoji: string;
  created_at: string;
}

export interface TeamDirectMessageRow {
  id: string;
  agency_id: string;
  sender_id: string;
  sender_name: string | null;
  sender_avatar: string | null;
  recipient_id: string;
  recipient_name: string | null;
  content: string;
  read_at: string | null;
  created_at: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
}

const normalizeClientIds = (clientId?: string | string[] | null): string[] => {
  if (!clientId) return [];
  const values = Array.isArray(clientId) ? clientId : [clientId];
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
};

export async function fetchTeamChannels(agencyId: string, branchId?: string, clientId?: string | string[]): Promise<TeamChannelRow[]> {
  let query = supabase
    .from('team_channels')
    .select('*')
    .eq('agency_id', agencyId)
    .order('name', { ascending: true });

  // Filter by client_id if provided (for client users)
  const clientIds = normalizeClientIds(clientId);
  if (clientIds.length > 0) {
    query = clientIds.length > 1 ? query.in('client_id', clientIds) : query.eq('client_id', clientIds[0]);
  }

  if (branchId) {
    query = query.or(`branch_id.is.null,branch_id.eq.${branchId}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching team channels', error);
    return [];
  }

  return (data as TeamChannelRow[]) ?? [];
}

export async function createTeamChannel(
  agencyId: string,
  input: {
    branch_id?: string;
    name: string;
    description?: string;
  },
  clientId?: string
): Promise<TeamChannelRow | null> {
  const { data, error } = await supabase
    .from('team_channels')
    .insert({
      agency_id: agencyId,
      client_id: clientId ?? null,
      branch_id: input.branch_id ?? null,
      name: input.name,
      description: input.description ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating team channel', error);
    return null;
  }

  return data as TeamChannelRow;
}

export async function fetchTeamMessages(
  agencyId: string,
  channelId: string,
  clientId?: string | string[]
): Promise<TeamMessageRow[]> {
  let query = supabase
    .from('team_messages')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true });

  // Filter by client_id if provided (for client users)
  const clientIds = normalizeClientIds(clientId);
  if (clientIds.length > 0) {
    query = clientIds.length > 1 ? query.in('client_id', clientIds) : query.eq('client_id', clientIds[0]);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching team messages', error);
    return [];
  }

  return (data as TeamMessageRow[]) ?? [];
}

export async function fetchChannelUnreadCounts(
  agencyId: string,
  userId: string,
  channelIds: string[],
  lastSeenByChannel: Record<string, string>,
  clientId?: string | string[]
): Promise<Record<string, number>> {
  const unreadByChannel: Record<string, number> = {};
  channelIds.forEach((channelId) => {
    unreadByChannel[channelId] = 0;
  });

  if (channelIds.length === 0) {
    return unreadByChannel;
  }

  let query = supabase
    .from('team_messages')
    .select('channel_id, sender_id, created_at')
    .eq('agency_id', agencyId)
    .in('channel_id', channelIds);

  const clientIds = normalizeClientIds(clientId);
  if (clientIds.length > 0) {
    query = clientIds.length > 1 ? query.in('client_id', clientIds) : query.eq('client_id', clientIds[0]);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching channel unread counts', error);
    return unreadByChannel;
  }

  const rows = (data ?? []) as Array<{
    channel_id: string;
    sender_id: string | null;
    created_at: string;
  }>;

  for (const row of rows) {
    if (row.sender_id && row.sender_id === userId) continue;

    const seenAt = lastSeenByChannel[row.channel_id];
    if (seenAt && new Date(row.created_at).getTime() <= new Date(seenAt).getTime()) {
      continue;
    }

    unreadByChannel[row.channel_id] = (unreadByChannel[row.channel_id] ?? 0) + 1;
  }

  return unreadByChannel;
}

/** Recent team messages across all channels (e.g. for Daily Briefing "Team Updates") */
export interface RecentTeamMessageRow extends TeamMessageRow {
  team_channels?: { name: string } | null;
}

export async function fetchRecentTeamMessages(
  agencyId: string,
  options?: { since?: Date; limit?: number; clientId?: string | string[] }
): Promise<RecentTeamMessageRow[]> {
  let query = supabase
    .from('team_messages')
    .select('*, team_channels(name)')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 10);

  // Filter by client_id if provided (for client users)
  const clientIds = normalizeClientIds(options?.clientId);
  if (clientIds.length > 0) {
    query = clientIds.length > 1 ? query.in('client_id', clientIds) : query.eq('client_id', clientIds[0]);
  }

  if (options?.since) {
    query = query.gte('created_at', options.since.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recent team messages', error);
    return [];
  }

  return (data as RecentTeamMessageRow[]) ?? [];
}

export async function createTeamMessage(
  agencyId: string,
  input: {
    branch_id?: string;
    channel_id: string;
    sender_id?: string;
    sender_name?: string;
    sender_avatar?: string;
    content: string;
    attachment_url?: string;
    attachment_name?: string;
    attachment_type?: string;
    attachment_size?: number;
  },
  clientId?: string
): Promise<TeamMessageRow | null> {
  const { data, error } = await supabase
    .from('team_messages')
    .insert({
      agency_id: agencyId,
      client_id: clientId ?? null,
      branch_id: input.branch_id ?? null,
      channel_id: input.channel_id,
      sender_id: input.sender_id ?? null,
      sender_name: input.sender_name ?? null,
      sender_avatar: input.sender_avatar ?? null,
      content: input.content,
      attachment_url: input.attachment_url ?? null,
      attachment_name: input.attachment_name ?? null,
      attachment_type: input.attachment_type ?? null,
      attachment_size: input.attachment_size ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating team message', error);
    return null;
  }

  return data as TeamMessageRow;
}

// =============================
// Channel Management
// =============================

export async function updateTeamChannel(
  channelId: string,
  input: { name?: string; description?: string }
): Promise<TeamChannelRow | null> {
  const { data, error } = await supabase
    .from('team_channels')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', channelId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating team channel', error);
    return null;
  }

  return data as TeamChannelRow;
}

export async function deleteTeamChannel(channelId: string): Promise<boolean> {
  const { error } = await supabase
    .from('team_channels')
    .delete()
    .eq('id', channelId);

  if (error) {
    console.error('Error deleting team channel', error);
    return false;
  }

  return true;
}

// =============================
// Message Management
// =============================

export async function updateTeamMessage(
  messageId: string,
  content: string
): Promise<TeamMessageRow | null> {
  const { data, error } = await supabase
    .from('team_messages')
    .update({
      content,
      updated_at: new Date().toISOString(),
      is_edited: true,
    })
    .eq('id', messageId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating team message', error);
    return null;
  }

  return data as TeamMessageRow;
}

export async function deleteTeamMessage(messageId: string): Promise<boolean> {
  const { error } = await supabase
    .from('team_messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    console.error('Error deleting team message', error);
    return false;
  }

  return true;
}

// =============================
// Message Reactions
// =============================

export async function fetchMessageReactions(
  messageId: string
): Promise<TeamMessageReactionRow[]> {
  const { data, error } = await supabase
    .from('team_message_reactions')
    .select('*')
    .eq('message_id', messageId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching message reactions', error);
    return [];
  }

  return (data as TeamMessageReactionRow[]) ?? [];
}

export async function fetchReactionsForMessages(
  messageIds: string[]
): Promise<Record<string, TeamMessageReactionRow[]>> {
  if (messageIds.length === 0) return {};

  const { data, error } = await supabase
    .from('team_message_reactions')
    .select('*')
    .in('message_id', messageIds)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching reactions for messages', error);
    return {};
  }

  const grouped: Record<string, TeamMessageReactionRow[]> = {};
  for (const reaction of (data as TeamMessageReactionRow[]) ?? []) {
    if (!grouped[reaction.message_id]) {
      grouped[reaction.message_id] = [];
    }
    grouped[reaction.message_id].push(reaction);
  }

  return grouped;
}

export async function addMessageReaction(
  messageId: string,
  userId: string,
  userName: string,
  emoji: string
): Promise<TeamMessageReactionRow | null> {
  const { data, error } = await supabase
    .from('team_message_reactions')
    .insert({
      message_id: messageId,
      user_id: userId,
      user_name: userName,
      emoji,
    })
    .select('*')
    .single();

  if (error) {
    // Ignore unique constraint violation (user already reacted with this emoji)
    if (error.code === '23505') {
      return null;
    }
    console.error('Error adding message reaction', error);
    return null;
  }

  return data as TeamMessageReactionRow;
}

export async function removeMessageReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<boolean> {
  const { error } = await supabase
    .from('team_message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji);

  if (error) {
    console.error('Error removing message reaction', error);
    return false;
  }

  return true;
}

export async function toggleMessageReaction(
  messageId: string,
  userId: string,
  userName: string,
  emoji: string
): Promise<{ added: boolean; reaction: TeamMessageReactionRow | null }> {
  // Check if reaction exists
  const { data: existing } = await supabase
    .from('team_message_reactions')
    .select('*')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing) {
    // Remove the reaction
    await removeMessageReaction(messageId, userId, emoji);
    return { added: false, reaction: null };
  } else {
    // Add the reaction
    const reaction = await addMessageReaction(messageId, userId, userName, emoji);
    return { added: true, reaction };
  }
}

// =============================
// Direct Messages
// =============================

export async function fetchDirectMessages(
  agencyId: string,
  userId: string,
  otherUserId: string,
  clientId?: string | string[]
): Promise<TeamDirectMessageRow[]> {
  let query = supabase
    .from('team_direct_messages')
    .select('*')
    .eq('agency_id', agencyId)
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
    .order('created_at', { ascending: true });

  // Filter by client_id if provided (for client users)
  const clientIds = normalizeClientIds(clientId);
  if (clientIds.length > 0) {
    query = clientIds.length > 1 ? query.in('client_id', clientIds) : query.eq('client_id', clientIds[0]);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching direct messages', error);
    return [];
  }

  return (data as TeamDirectMessageRow[]) ?? [];
}

export async function fetchDirectMessageConversations(
  agencyId: string,
  userId: string,
  clientId?: string | string[]
): Promise<{ recipientId: string; recipientName: string; lastMessage: TeamDirectMessageRow; unreadCount: number }[]> {
  // Get all DMs for this user
  let query = supabase
    .from('team_direct_messages')
    .select('*')
    .eq('agency_id', agencyId)
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  // Filter by client_id if provided (for client users)
  const clientIds = normalizeClientIds(clientId);
  if (clientIds.length > 0) {
    query = clientIds.length > 1 ? query.in('client_id', clientIds) : query.eq('client_id', clientIds[0]);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching DM conversations', error);
    return [];
  }

  const messages = (data as TeamDirectMessageRow[]) ?? [];
  const conversationMap = new Map<string, { lastMessage: TeamDirectMessageRow; unreadCount: number }>();

  for (const msg of messages) {
    const otherId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
    
    if (!conversationMap.has(otherId)) {
      const unreadCount = messages.filter(
        m => m.sender_id === otherId && m.recipient_id === userId && !m.read_at
      ).length;
      
      conversationMap.set(otherId, {
        lastMessage: msg,
        unreadCount,
      });
    }
  }

  return Array.from(conversationMap.entries()).map(([recipientId, data]) => ({
    recipientId,
    recipientName: data.lastMessage.sender_id === userId 
      ? data.lastMessage.recipient_name ?? 'Unknown'
      : data.lastMessage.sender_name ?? 'Unknown',
    lastMessage: data.lastMessage,
    unreadCount: data.unreadCount,
  }));
}

export async function createDirectMessage(
  agencyId: string,
  input: {
    sender_id: string;
    sender_name?: string;
    sender_avatar?: string;
    recipient_id: string;
    recipient_name?: string;
    content: string;
    attachment_url?: string;
    attachment_name?: string;
    attachment_type?: string;
    attachment_size?: number;
  },
  clientId?: string
): Promise<TeamDirectMessageRow | null> {
  const { data, error } = await supabase
    .from('team_direct_messages')
    .insert({
      agency_id: agencyId,
      client_id: clientId ?? null,
      sender_id: input.sender_id,
      sender_name: input.sender_name ?? null,
      sender_avatar: input.sender_avatar ?? null,
      recipient_id: input.recipient_id,
      recipient_name: input.recipient_name ?? null,
      content: input.content,
      attachment_url: input.attachment_url ?? null,
      attachment_name: input.attachment_name ?? null,
      attachment_type: input.attachment_type ?? null,
      attachment_size: input.attachment_size ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating direct message', error);
    return null;
  }

  return data as TeamDirectMessageRow;
}

export async function markDirectMessagesAsRead(
  recipientId: string,
  senderId: string
): Promise<void> {
  const { error } = await supabase
    .from('team_direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', recipientId)
    .eq('sender_id', senderId)
    .is('read_at', null);

  if (error) {
    console.error('Error marking messages as read', error);
  }
}

export async function deleteDirectMessage(messageId: string): Promise<boolean> {
  const { error } = await supabase
    .from('team_direct_messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    console.error('Error deleting direct message', error);
    return false;
  }

  return true;
}

export async function deleteDirectMessageConversation(
  agencyId: string,
  userId: string,
  otherUserId: string,
  clientId?: string
): Promise<boolean> {
  let query = supabase
    .from('team_direct_messages')
    .delete()
    .eq('agency_id', agencyId)
    .or(
      `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
    );

  const clientIds = normalizeClientIds(clientId);
  if (clientIds.length > 0) {
    query = clientIds.length > 1 ? query.in('client_id', clientIds) : query.eq('client_id', clientIds[0]);
  }

  const { error } = await query;

  if (error) {
    console.error('Error deleting direct message conversation', error);
    return false;
  }

  return true;
}

// =============================
// File Upload Functions
// =============================

const CHAT_ATTACHMENTS_BUCKET = 'chat-attachments';

export interface UploadedAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

/**
 * Upload a file to Supabase Storage for chat attachments
 */
export async function uploadChatAttachment(
  file: File,
  agencyId: string,
  userId: string
): Promise<UploadedAttachment | null> {
  try {
    // Generate unique filename with timestamp and original extension
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${agencyId}/${userId}/${timestamp}-${randomStr}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(CHAT_ATTACHMENTS_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading file:', error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(CHAT_ATTACHMENTS_BUCKET)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      name: file.name,
      type: file.type,
      size: file.size,
    };
  } catch (error) {
    console.error('Error uploading chat attachment:', error);
    return null;
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteChatAttachment(fileUrl: string): Promise<boolean> {
  try {
    // Extract path from URL
    const url = new URL(fileUrl);
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/chat-attachments\/(.+)/);
    if (!pathMatch) {
      console.error('Could not extract path from URL:', fileUrl);
      return false;
    }

    const filePath = pathMatch[1];
    const { error } = await supabase.storage
      .from(CHAT_ATTACHMENTS_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting chat attachment:', error);
    return false;
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if file type is allowed
 */
export function isAllowedFileType(file: File): boolean {
  const allowedTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    'text/plain', 'text/csv',
    // Archives
    'application/zip', 'application/x-rar-compressed',
  ];
  return allowedTypes.includes(file.type);
}

/**
 * Max file size: 10MB
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Check if file is an image
 */
export function isImageFile(type: string): boolean {
  return type.startsWith('image/');
}
