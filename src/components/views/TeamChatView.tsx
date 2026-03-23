import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { SearchIcon, HashIcon, SendIcon, PaperclipIcon, SmileIcon, PhoneIcon, VideoIcon, InfoIcon, PlusIcon, BoldIcon, ItalicIcon, UnderlineIcon, ArchiveIcon, Loader2Icon, EditIcon, Trash2Icon, XIcon, CheckIcon, MoreVerticalIcon, MessageSquareIcon, FileIcon, ImageIcon, FileTextIcon, DownloadIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabaseClient';
import { 
  createTeamChannel, 
  createTeamMessage, 
  fetchTeamChannels, 
  fetchTeamMessages, 
  updateTeamChannel,
  deleteTeamChannel,
  updateTeamMessage,
  deleteTeamMessage,
  fetchReactionsForMessages,
  toggleMessageReaction,
  fetchDirectMessages,
  fetchDirectMessageConversations,
  fetchChannelUnreadCounts,
  createDirectMessage,
  markDirectMessagesAsRead,
  deleteDirectMessageConversation,
  uploadChatAttachment,
  formatFileSize,
  isAllowedFileType,
  isImageFile,
  MAX_FILE_SIZE,
  TeamMessageRow,
  TeamMessageReactionRow,
  TeamDirectMessageRow,
  UploadedAttachment
} from '@/lib/teamChatApi';
import { fetchClientStaffForAgency, ClientStaffRow } from '@/lib/ownerApi';

interface Message {
  id: string;
  senderId?: string;
  sender: string;
  avatar: string;
  content: string;
  timestamp: string;
  createdAt?: string;
  isEdited?: boolean;
  reactions?: { emoji: string; count: number; users: string[] }[];
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: number;
}

interface Channel {
  id: string;
  name: string;
  unreadCount?: number;
}

interface DirectMessageUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
  unreadCount?: number;
  lastMessageAt?: string;
}

interface DirectMessageConversation {
  recipientId: string;
  recipientName: string;
  unreadCount: number;
  lastMessageAt: string;
}

type ChatMode = 'channel' | 'dm';

const defaultChannelNames = ['general', 'announcements', 'sales-team', 'lettings-team', 'marketing'];
const DEFAULT_AVATAR = 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png';

const getDirectMessageIdentityKey = (staff: Pick<ClientStaffRow, 'id' | 'email' | 'name'>): string => {
  const normalizedEmail = (staff.email ?? '').trim().toLowerCase();
  if (normalizedEmail) return `email:${normalizedEmail}`;
  const normalizedName = (staff.name ?? '').trim().toLowerCase();
  if (normalizedName) return `name:${normalizedName}`;
  return `id:${staff.id}`;
};

const getDirectMessageStatus = (index: number): DirectMessageUser['status'] => {
  if (index % 3 === 0) return 'online';
  if (index % 3 === 1) return 'busy';
  return 'offline';
};

const getUserTheme = (name: string) => {
  const themes = [
    {
      text: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50/50 dark:bg-blue-900/10',
      border: 'border-blue-100 dark:border-blue-900/20'
    },
    {
      text: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50/50 dark:bg-green-900/10',
      border: 'border-green-100 dark:border-green-900/20'
    },
    {
      text: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50/50 dark:bg-purple-900/10',
      border: 'border-purple-100 dark:border-purple-900/20'
    },
    {
      text: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50/50 dark:bg-orange-900/10',
      border: 'border-orange-100 dark:border-orange-900/20'
    },
    {
      text: 'text-pink-600 dark:text-pink-400',
      bg: 'bg-pink-50/50 dark:bg-pink-900/10',
      border: 'border-pink-100 dark:border-pink-900/20'
    },
    {
      text: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50/50 dark:bg-teal-900/10',
      border: 'border-teal-100 dark:border-teal-900/20'
    },
    {
      text: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50/50 dark:bg-indigo-900/10',
      border: 'border-indigo-100 dark:border-indigo-900/20'
    },
    {
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50/50 dark:bg-red-900/10',
      border: 'border-red-100 dark:border-red-900/20'
    },
    {
      text: 'text-cyan-600 dark:text-cyan-400',
      bg: 'bg-cyan-50/50 dark:bg-cyan-900/10',
      border: 'border-cyan-100 dark:border-cyan-900/20'
    },
    {
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50/50 dark:bg-emerald-900/10',
      border: 'border-emerald-100 dark:border-emerald-900/20'
    },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return themes[Math.abs(hash) % themes.length];
};


interface TeamChatViewProps {
  agencyId?: string;
  branchId?: string;
}

export function TeamChatView({ agencyId, branchId }: TeamChatViewProps = {}) {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const { clientId, clientScopeIds } = useDashboardStore();
  const [clientStaff, setClientStaff] = useState<ClientStaffRow[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [showArchive, setShowArchive] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelUnreadCounts, setChannelUnreadCounts] = useState<Record<string, number>>({});
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Chat mode: channel or direct message
  const [chatMode, setChatMode] = useState<ChatMode>('channel');
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<Message[]>([]);
  const [dmConversations, setDmConversations] = useState<DirectMessageConversation[]>([]);
  const [dmUnreadCounts, setDmUnreadCounts] = useState<Record<string, number>>({});
  const [showNewDmPicker, setShowNewDmPicker] = useState(false);
  
  // Message editing
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  
  // Channel management
  const [showNewChannelInput, setShowNewChannelInput] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [creatingChannel, setCreatingChannel] = useState(false);
  
  // Reactions data from DB
  const [reactionsMap, setReactionsMap] = useState<Record<string, TeamMessageReactionRow[]>>({});
  
  // File upload state
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const effectiveClientScope = clientScopeIds && clientScopeIds.length > 0 ? clientScopeIds : (clientId ?? undefined);

  // Text formatting function
  const applyFormatting = (format: 'bold' | 'italic' | 'underline') => {
    const input = messageInputRef.current;
    if (!input) return;

    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const text = messageInput;
    const selectedText = text.substring(start, end);
    
    const formatMarkers = {
      bold: '**',
      italic: '_',
      underline: '__',
    };
    const marker = formatMarkers[format];
    
    let newText: string;
    let newCursorPos: number;
    
    if (selectedText) {
      // Wrap selected text
      newText = text.substring(0, start) + marker + selectedText + marker + text.substring(end);
      newCursorPos = end + marker.length * 2;
    } else {
      // Insert markers and place cursor between them
      newText = text.substring(0, start) + marker + marker + text.substring(end);
      newCursorPos = start + marker.length;
    }
    
    setMessageInput(newText);
    
    // Restore focus and cursor position
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const activeChannel = useMemo(
    () => channels.find(c => c.id === activeChannelId) ?? channels[0],
    [channels, activeChannelId]
  );

  const channelLastSeenStorageKey = useMemo(
    () => `team-chat-last-seen-channels:${user?.id ?? 'anonymous'}:${agencyId ?? 'no-agency'}:${(clientScopeIds && clientScopeIds.length > 0 ? clientScopeIds.join(',') : clientId) ?? 'all'}`,
    [user?.id, agencyId, clientId, clientScopeIds]
  );

  const readChannelLastSeenMap = useCallback((): Record<string, string> => {
    if (!user?.id || !agencyId) return {};
    try {
      const raw = localStorage.getItem(channelLastSeenStorageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') return {};

      const safeMap: Record<string, string> = {};
      Object.entries(parsed).forEach(([channelId, seenAt]) => {
        if (typeof seenAt === 'string' && channelId) {
          safeMap[channelId] = seenAt;
        }
      });
      return safeMap;
    } catch {
      return {};
    }
  }, [channelLastSeenStorageKey, user?.id, agencyId]);

  const markChannelAsSeen = useCallback(
    (channelId: string, seenAt?: string) => {
      if (!channelId || !user?.id || !agencyId) return;

      const safeSeenAt = seenAt ?? new Date().toISOString();
      const currentMap = readChannelLastSeenMap();
      const previousSeenAt = currentMap[channelId];
      const isOlderTimestamp =
        previousSeenAt &&
        new Date(previousSeenAt).getTime() >= new Date(safeSeenAt).getTime();

      if (!isOlderTimestamp) {
        const nextMap = { ...currentMap, [channelId]: safeSeenAt };
        try {
          localStorage.setItem(channelLastSeenStorageKey, JSON.stringify(nextMap));
        } catch {
          // Ignore storage write failures (private mode, quota, etc).
        }
      }

      setChannelUnreadCounts((prev) => ({ ...prev, [channelId]: 0 }));
      window.dispatchEvent(new CustomEvent('team-chat-last-seen-updated'));
    },
    [agencyId, channelLastSeenStorageKey, readChannelLastSeenMap, user?.id]
  );

  const syncChannelUnreadCounts = useCallback(
    async (channelIds: string[]) => {
      if (!agencyId || !user?.id) {
        setChannelUnreadCounts({});
        return;
      }
      if (channelIds.length === 0) {
        setChannelUnreadCounts({});
        return;
      }

      const unreadByChannel = await fetchChannelUnreadCounts(
        agencyId,
        user.id,
        channelIds,
        readChannelLastSeenMap(),
        effectiveClientScope
      );
      setChannelUnreadCounts(unreadByChannel);
    },
    [agencyId, effectiveClientScope, readChannelLastSeenMap, user?.id]
  );

  const refreshDmConversations = useCallback(async () => {
    if (!agencyId || !user?.id) {
      setDmConversations([]);
      setDmUnreadCounts({});
      return;
    }

    const conversations = await fetchDirectMessageConversations(
      agencyId,
      user.id,
      effectiveClientScope
    );

    const mappedConversations = conversations.map((conversation) => ({
      recipientId: conversation.recipientId,
      recipientName: conversation.recipientName,
      unreadCount: conversation.unreadCount,
      lastMessageAt: conversation.lastMessage.created_at,
    }));

    const unreadByDmUser: Record<string, number> = {};
    mappedConversations.forEach((conversation) => {
      if (conversation.unreadCount > 0) {
        unreadByDmUser[conversation.recipientId] = conversation.unreadCount;
      }
    });
    setDmConversations(mappedConversations);
    setDmUnreadCounts(unreadByDmUser);
  }, [agencyId, effectiveClientScope, user?.id]);

  // Render formatted text (bold, italic, underline)
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    
    // Split by formatting patterns and render appropriately
    // Order matters: check longer patterns first
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;
    
    while (remaining.length > 0) {
      // Bold: **text**
      const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
      if (boldMatch) {
        parts.push(<strong key={key++} className="font-bold">{boldMatch[1]}</strong>);
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }
      
      // Underline: __text__
      const underlineMatch = remaining.match(/^__(.+?)__/);
      if (underlineMatch) {
        parts.push(<span key={key++} className="underline">{underlineMatch[1]}</span>);
        remaining = remaining.slice(underlineMatch[0].length);
        continue;
      }
      
      // Italic: _text_
      const italicMatch = remaining.match(/^_(.+?)_/);
      if (italicMatch) {
        parts.push(<em key={key++} className="italic">{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }
      
      // Find next formatting marker
      const nextMarker = remaining.search(/\*\*|__|_/);
      if (nextMarker === -1) {
        // No more markers, add rest as plain text
        parts.push(remaining);
        break;
      } else if (nextMarker === 0) {
        // Marker at start but didn't match (incomplete), add one char and continue
        parts.push(remaining[0]);
        remaining = remaining.slice(1);
      } else {
        // Add text before next marker
        parts.push(remaining.slice(0, nextMarker));
        remaining = remaining.slice(nextMarker);
      }
    }
    
    return parts.length > 0 ? parts : text;
  };

  const mapRowToMessage = (row: TeamMessageRow): Message => ({
    id: row.id,
    senderId: row.sender_id ?? undefined,
    sender: row.sender_name ?? 'Unknown',
    avatar: row.sender_avatar ?? 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png',
    content: row.content,
    timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: row.created_at,
    isEdited: row.is_edited ?? false,
    attachmentUrl: row.attachment_url ?? undefined,
    attachmentName: row.attachment_name ?? undefined,
    attachmentType: row.attachment_type ?? undefined,
    attachmentSize: row.attachment_size ?? undefined,
  });

  const mapDmToMessage = (row: TeamDirectMessageRow): Message => ({
    id: row.id,
    senderId: row.sender_id,
    sender: row.sender_name ?? 'Unknown',
    avatar: row.sender_avatar ?? 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png',
    content: row.content,
    timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: row.created_at,
    attachmentUrl: row.attachment_url ?? undefined,
    attachmentName: row.attachment_name ?? undefined,
    attachmentType: row.attachment_type ?? undefined,
    attachmentSize: row.attachment_size ?? undefined,
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, dmMessages]);

  // Load channels for agency/branch
  useEffect(() => {
    const loadChannels = async () => {
      if (!agencyId) return;
      setLoadingChannels(true);
      let rows = await fetchTeamChannels(agencyId, branchId, effectiveClientScope);

      if (rows.length === 0) {
        await Promise.all(
          defaultChannelNames.map(name =>
            createTeamChannel(
              agencyId,
              { branch_id: branchId, name },
              Array.isArray(effectiveClientScope) ? effectiveClientScope[0] : effectiveClientScope
            )
          )
        );
        rows = await fetchTeamChannels(agencyId, branchId, effectiveClientScope);
      }

      const mapped = rows.map((row) => ({
        id: row.id,
        name: row.name,
      }));
      setChannels(mapped);
      void syncChannelUnreadCounts(mapped.map((channel) => channel.id));
      if (!activeChannelId && mapped.length > 0) {
        setActiveChannelId(mapped[0].id);
      }
      setLoadingChannels(false);
    };

    void loadChannels();
  }, [agencyId, branchId, effectiveClientScope, syncChannelUnreadCounts]);

  useEffect(() => {
    if (activeChannelId && channels.some(c => c.id === activeChannelId)) return;
    if (channels.length > 0) setActiveChannelId(channels[0].id);
  }, [channels, activeChannelId]);

  useEffect(() => {
    if (channels.length === 0) {
      setChannelUnreadCounts({});
      return;
    }
    void syncChannelUnreadCounts(channels.map((channel) => channel.id));
  }, [channels, syncChannelUnreadCounts]);

  useEffect(() => {
    void refreshDmConversations();
  }, [refreshDmConversations]);

  // Load messages for active channel
  useEffect(() => {
    const loadMessages = async () => {
      if (!agencyId || !activeChannelId || chatMode !== 'channel') {
        if (chatMode === 'channel') setChatMessages([]);
        return;
      }
      setLoadingMessages(true);
      const rows = await fetchTeamMessages(agencyId, activeChannelId, effectiveClientScope);
      setChatMessages(rows.map(mapRowToMessage));
      
      // Load reactions for all messages
      if (rows.length > 0) {
        const reactions = await fetchReactionsForMessages(rows.map(r => r.id));
        setReactionsMap(reactions);
      }
      
      setLoadingMessages(false);
    };

    void loadMessages();
  }, [agencyId, activeChannelId, chatMode, effectiveClientScope]);

  useEffect(() => {
    if (chatMode !== 'channel' || !activeChannelId) return;

    const latestMessage = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
    markChannelAsSeen(activeChannelId, latestMessage?.createdAt ?? new Date().toISOString());
  }, [chatMessages, chatMode, activeChannelId, markChannelAsSeen]);

  // Load direct messages
  useEffect(() => {
    const loadDmMessages = async () => {
      if (!agencyId || !user?.id || !activeDmUserId || chatMode !== 'dm') {
        if (chatMode === 'dm') setDmMessages([]);
        return;
      }
      setLoadingMessages(true);
      const rows = await fetchDirectMessages(agencyId, user.id, activeDmUserId, effectiveClientScope);
      setDmMessages(rows.map(mapDmToMessage));
      
      // Mark messages as read
      await markDirectMessagesAsRead(user.id, activeDmUserId);
      setDmUnreadCounts(prev => ({ ...prev, [activeDmUserId]: 0 }));
      void refreshDmConversations();
      window.dispatchEvent(new CustomEvent('team-chat-last-seen-updated'));
      
      setLoadingMessages(false);
    };

    void loadDmMessages();
  }, [agencyId, user?.id, activeDmUserId, chatMode, effectiveClientScope, refreshDmConversations]);

  // Subscribe to new channel messages
  useEffect(() => {
    if (!activeChannelId || chatMode !== 'channel') return;
    const channel = supabase
      .channel(`team_messages_${activeChannelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_messages', filter: `channel_id=eq.${activeChannelId}` },
        (payload) => {
          const row = payload.new as TeamMessageRow;
          if (row.sender_id !== user?.id) {
            markChannelAsSeen(row.channel_id, row.created_at);
          }
          const msg = mapRowToMessage(row);
          setChatMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'team_messages', filter: `channel_id=eq.${activeChannelId}` },
        (payload) => {
          const row = payload.new as TeamMessageRow;
          const msg = mapRowToMessage(row);
          setChatMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'team_messages', filter: `channel_id=eq.${activeChannelId}` },
        (payload) => {
          const oldRow = payload.old as { id: string };
          setChatMessages(prev => prev.filter(m => m.id !== oldRow.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChannelId, chatMode, markChannelAsSeen, user?.id]);

  // Subscribe to new direct messages
  useEffect(() => {
    if (!user?.id || !activeDmUserId || chatMode !== 'dm') return;
    const channel = supabase
      .channel(`team_dm_${user.id}_${activeDmUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_direct_messages' },
        (payload) => {
          const row = payload.new as TeamDirectMessageRow;
          if (row.sender_id !== user?.id && row.recipient_id !== user?.id) return;

          // Only add if it's part of this conversation
          if ((row.sender_id === user.id && row.recipient_id === activeDmUserId) ||
              (row.sender_id === activeDmUserId && row.recipient_id === user.id)) {
            const msg = mapDmToMessage(row);
            setDmMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          }

          void refreshDmConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, activeDmUserId, chatMode, refreshDmConversations]);

  // Subscribe to all channel inserts for unread badge counts
  useEffect(() => {
    if (!agencyId || !user?.id) return;

    const userId = user.id;
    const realtime = supabase
      .channel(`team_channel_unread_${agencyId}_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_messages', filter: `agency_id=eq.${agencyId}` },
        (payload) => {
          const row = payload.new as TeamMessageRow & { client_id?: string | null };
          if (effectiveClientScope) {
            if (Array.isArray(effectiveClientScope)) {
              if (!effectiveClientScope.includes(row.client_id ?? '')) return;
            } else if (row.client_id !== effectiveClientScope) {
              return;
            }
          }
          if (!channels.some((channel) => channel.id === row.channel_id)) return;
          if (row.sender_id === userId) return;

          if (chatMode === 'channel' && activeChannelId === row.channel_id) {
            markChannelAsSeen(row.channel_id, row.created_at);
            return;
          }

          setChannelUnreadCounts((prev) => ({
            ...prev,
            [row.channel_id]: (prev[row.channel_id] ?? 0) + 1,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtime);
    };
  }, [activeChannelId, agencyId, channels, chatMode, effectiveClientScope, markChannelAsSeen, user?.id]);

  // Subscribe to all direct message inserts for unread badge counts
  useEffect(() => {
    if (!agencyId || !user?.id) return;

    const userId = user.id;
    const realtime = supabase
      .channel(`team_dm_unread_${agencyId}_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_direct_messages', filter: `agency_id=eq.${agencyId}` },
        (payload) => {
          const row = payload.new as TeamDirectMessageRow & { client_id?: string | null };
          if (effectiveClientScope) {
            if (Array.isArray(effectiveClientScope)) {
              if (!effectiveClientScope.includes(row.client_id ?? '')) return;
            } else if (row.client_id !== effectiveClientScope) {
              return;
            }
          }
          if (row.recipient_id !== userId) return;
          if (row.sender_id === userId) return;

          if (chatMode === 'dm' && activeDmUserId === row.sender_id) {
            void (async () => {
              await markDirectMessagesAsRead(userId, row.sender_id);
              setDmUnreadCounts((prev) => ({ ...prev, [row.sender_id]: 0 }));
              window.dispatchEvent(new CustomEvent('team-chat-last-seen-updated'));
              await refreshDmConversations();
            })();
            return;
          }

          setDmUnreadCounts((prev) => ({
            ...prev,
            [row.sender_id]: (prev[row.sender_id] ?? 0) + 1,
          }));
          void refreshDmConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtime);
    };
  }, [activeDmUserId, agencyId, chatMode, effectiveClientScope, refreshDmConversations, user?.id]);

  // Subscribe to reactions
  useEffect(() => {
    if (!activeChannelId || chatMode !== 'channel') return;
    const channel = supabase
      .channel(`team_reactions_${activeChannelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_message_reactions' },
        async () => {
          // Reload reactions for current messages
          const messageIds = chatMessages.map(m => m.id);
          if (messageIds.length > 0) {
            const reactions = await fetchReactionsForMessages(messageIds);
            setReactionsMap(reactions);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChannelId, chatMode, chatMessages.length]);

  // Load client staff for direct messages
  useEffect(() => {
    const loadStaff = async () => {
      if (!agencyId) return;
      const rows = await fetchClientStaffForAgency(agencyId, branchId);
      setClientStaff(rows);
    };
    void loadStaff();
  }, [agencyId, branchId]);

  const dedupedClientStaff = useMemo(() => {
    const seen = new Set<string>();

    return clientStaff.filter((staff) => {
      if (staff.id === user?.id) return false;

      const identityKey = getDirectMessageIdentityKey(staff);
      if (seen.has(identityKey)) return false;

      seen.add(identityKey);
      return true;
    });
  }, [clientStaff, user?.id]);

  const availableDmUsers = useMemo<DirectMessageUser[]>(() => {
    return dedupedClientStaff.map((staff, index) => ({
      id: staff.id,
      name: staff.name,
      email: staff.email,
      avatar: DEFAULT_AVATAR,
      status: getDirectMessageStatus(index),
      unreadCount: dmUnreadCounts[staff.id] ?? 0,
    }));
  }, [dedupedClientStaff, dmUnreadCounts]);

  const staffById = useMemo(() => {
    const map = new Map<string, ClientStaffRow>();
    dedupedClientStaff.forEach((staff) => {
      map.set(staff.id, staff);
    });
    return map;
  }, [dedupedClientStaff]);

  const directMessageUsers = useMemo<DirectMessageUser[]>(() => {
    return [...dmConversations]
      .sort((left, right) => new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime())
      .map((conversation, index) => {
        const staff = staffById.get(conversation.recipientId);
        return {
          id: conversation.recipientId,
          name: staff?.name ?? conversation.recipientName ?? 'Unknown',
          email: staff?.email ?? '',
          avatar: DEFAULT_AVATAR,
          status: getDirectMessageStatus(index),
          unreadCount: dmUnreadCounts[conversation.recipientId] ?? conversation.unreadCount,
          lastMessageAt: conversation.lastMessageAt,
        };
      });
  }, [dmConversations, staffById, dmUnreadCounts]);

  const activeDmUser = useMemo(() => 
    directMessageUsers.find(u => u.id === activeDmUserId) ??
    availableDmUsers.find(u => u.id === activeDmUserId),
    [directMessageUsers, availableDmUsers, activeDmUserId]
  );

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!isAllowedFileType(file)) {
      alert('File type not supported. Please upload images, documents, or archives.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      alert('File too large. Maximum size is 10MB.');
      return;
    }

    setPendingFile(file);
    // Reset file input so the same file can be selected again if removed
    e.target.value = '';
  };

  // Handle removing pending file
  const handleRemovePendingFile = () => {
    setPendingFile(null);
  };

  // Handle sending a message
  const handleSendMessage = async () => {
    if ((!messageInput.trim() && !pendingFile) || !agencyId) return;
    
    setSending(true);
    setUploading(!!pendingFile);
    
    try {
      const senderName = (user?.user_metadata as any)?.name ?? user?.email ?? 'You';
      const senderAvatar = (user?.user_metadata as any)?.avatar ?? 'https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png';
      
      // Upload file if present
      let attachment: UploadedAttachment | null = null;
      if (pendingFile && user?.id) {
        attachment = await uploadChatAttachment(pendingFile, agencyId, user.id);
        if (!attachment) {
          alert('Failed to upload file. Please try again.');
          setUploading(false);
          setSending(false);
          return;
        }
      }
      setUploading(false);
      
      if (chatMode === 'channel' && activeChannel) {
        const created = await createTeamMessage(agencyId, {
          branch_id: branchId,
          channel_id: activeChannel.id,
          sender_id: user?.id,
          sender_name: senderName,
          sender_avatar: senderAvatar,
          content: messageInput || (attachment ? `Shared a file: ${attachment.name}` : ''),
          attachment_url: attachment?.url,
          attachment_name: attachment?.name,
          attachment_type: attachment?.type,
          attachment_size: attachment?.size,
        }, clientId ?? undefined);

        if (created) {
          const newMessage = mapRowToMessage(created);
          setChatMessages(prev => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
          setMessageInput('');
          setPendingFile(null);
        }
      } else if (chatMode === 'dm' && activeDmUserId && user?.id) {
        const recipientUser =
          directMessageUsers.find(u => u.id === activeDmUserId) ??
          availableDmUsers.find(u => u.id === activeDmUserId);
        const created = await createDirectMessage(agencyId, {
          sender_id: user.id,
          sender_name: senderName,
          sender_avatar: senderAvatar,
          recipient_id: activeDmUserId,
          recipient_name: recipientUser?.name,
          content: messageInput || (attachment ? `Shared a file: ${attachment.name}` : ''),
          attachment_url: attachment?.url,
          attachment_name: attachment?.name,
          attachment_type: attachment?.type,
          attachment_size: attachment?.size,
        }, clientId ?? undefined);

        if (created) {
          const newMessage = mapDmToMessage(created);
          setDmMessages(prev => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
          setMessageInput('');
          setPendingFile(null);
          await refreshDmConversations();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  // Handle editing a message
  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return;
    
    const updated = await updateTeamMessage(messageId, editContent);
    if (updated) {
      setChatMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: editContent, isEdited: true } : m));
      setEditingMessageId(null);
      setEditContent('');
    }
  };

  // Handle deleting a message
  const handleDeleteMessage = async (messageId: string) => {
    const success = await deleteTeamMessage(messageId);
    if (success) {
      setChatMessages(prev => prev.filter(m => m.id !== messageId));
    }
  };

  // Handle creating a new channel
  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !agencyId) return;
    
    setCreatingChannel(true);
    const created = await createTeamChannel(agencyId, {
      branch_id: branchId,
      name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
    }, clientId ?? undefined);
    
    if (created) {
      setChannels(prev => [...prev, { id: created.id, name: created.name }]);
      setActiveChannelId(created.id);
      setNewChannelName('');
      setShowNewChannelInput(false);
    }
    setCreatingChannel(false);
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!user?.id) return;
    
    const userName = (user?.user_metadata as any)?.name ?? user?.email ?? 'You';
    await toggleMessageReaction(messageId, user.id, userName, emoji);
    
    // Reactions will be updated via realtime subscription
  };

  // Get aggregated reactions for a message
  const getMessageReactions = (messageId: string): { emoji: string; count: number; users: string[] }[] => {
    const reactions = reactionsMap[messageId] || [];
    const grouped = new Map<string, { count: number; users: string[] }>();
    
    for (const r of reactions) {
      const existing = grouped.get(r.emoji);
      if (existing) {
        existing.count++;
        existing.users.push(r.user_name ?? 'Unknown');
      } else {
        grouped.set(r.emoji, { count: 1, users: [r.user_name ?? 'Unknown'] });
      }
    }
    
    return Array.from(grouped.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      users: data.users,
    }));
  };

  // Check if current user reacted with a specific emoji
  const hasUserReacted = (messageId: string, emoji: string): boolean => {
    if (!user?.id) return false;
    const reactions = reactionsMap[messageId] || [];
    return reactions.some(r => r.emoji === emoji && r.user_id === user.id);
  };

  // Handle switching to DM
  const handleSelectDmUser = (userId: string) => {
    setChatMode('dm');
    setActiveDmUserId(userId);
    setActiveChannelId(null);
    setShowNewDmPicker(false);
    setDmUnreadCounts(prev => ({ ...prev, [userId]: 0 }));
    if (user?.id) {
      void markDirectMessagesAsRead(user.id, userId);
      window.dispatchEvent(new CustomEvent('team-chat-last-seen-updated'));
    }
  };

  const handleDeleteDmConversation = async (dmUser: DirectMessageUser) => {
    if (!agencyId || !user?.id) return;

    const confirmed = window.confirm(`Delete the direct messages with ${dmUser.name}?`);
    if (!confirmed) return;

    const deleted = await deleteDirectMessageConversation(
      agencyId,
      user.id,
      dmUser.id,
      clientId ?? undefined
    );

    if (!deleted) {
      alert('Failed to delete direct messages. Please try again.');
      return;
    }

    setDmConversations((prev) => prev.filter((conversation) => conversation.recipientId !== dmUser.id));
    setDmUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[dmUser.id];
      return next;
    });

    if (activeDmUserId === dmUser.id) {
      const fallbackChannelId = activeChannelId ?? channels[0]?.id ?? null;
      setDmMessages([]);
      setActiveDmUserId(null);
      setChatMode('channel');
      setActiveChannelId(fallbackChannelId);
      if (fallbackChannelId) {
        markChannelAsSeen(fallbackChannelId);
      }
    }

    await refreshDmConversations();
  };

  // Handle switching to channel
  const handleSelectChannel = (channelId: string) => {
    setChatMode('channel');
    setActiveChannelId(channelId);
    setActiveDmUserId(null);
    markChannelAsSeen(channelId);
  };

  // Filter messages: show only last 7 days in main view
  const { recentMessages, archivedMessages } = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recent: Message[] = [];
    const archived: Message[] = [];

    chatMessages.forEach(msg => {
      const msgDate = msg.createdAt ? new Date(msg.createdAt) : now;
      if (msgDate < sevenDaysAgo) {
        archived.push(msg);
      } else {
        recent.push(msg);
      }
    });

    return { recentMessages: recent, archivedMessages: archived };
  }, [chatMessages]);

  const currentMessages = chatMode === 'channel' ? (showArchive ? archivedMessages : recentMessages) : dmMessages;

  return (
    <div className={cn("flex bg-background font-sans", isMobile ? "flex-col h-auto" : "h-[calc(100vh-4rem)]")}>
      {/* Sidebar */}
      <div className={cn("border-r border-border flex flex-col bg-muted/5", isMobile ? "w-full border-r-0 border-b" : "w-64")}>
        <div className="p-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Jump to..." 
              className="pl-9 bg-background border-border h-9 text-sm rounded-md shadow-sm focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-2">
          <div className="py-2 space-y-6">
            {/* Channels Section */}
            <div>
              <div className="flex items-center justify-between px-2 mb-1 group">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Channels
                </h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 opacity-100"
                  onClick={() => setShowNewChannelInput(true)}
                >
                  <PlusIcon className="h-3 w-3" />
                </Button>
              </div>
              
              {/* New channel input */}
              {showNewChannelInput && (
                <div className="px-2 py-2 flex items-center gap-1">
                  <Input
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="channel-name"
                    className="h-7 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateChannel();
                      if (e.key === 'Escape') {
                        setShowNewChannelInput(false);
                        setNewChannelName('');
                      }
                    }}
                    autoFocus
                  />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6"
                    onClick={handleCreateChannel}
                    disabled={creatingChannel || !newChannelName.trim()}
                  >
                    {creatingChannel ? <Loader2Icon className="h-3 w-3 animate-spin" /> : <CheckIcon className="h-3 w-3" />}
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6"
                    onClick={() => { setShowNewChannelInput(false); setNewChannelName(''); }}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              <div className="space-y-0.5">
                {loadingChannels && (
                  <div className="px-2 py-2 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2Icon className="h-3 w-3 animate-spin" />
                    Loading channels...
                  </div>
                )}
                {!loadingChannels && channels.length === 0 && (
                  <div className="px-2 py-2 text-xs text-muted-foreground">No channels found</div>
                )}
                {!loadingChannels && channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handleSelectChannel(channel.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors group",
                      chatMode === 'channel' && activeChannelId === channel.id 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <HashIcon className={cn("h-4 w-4 shrink-0", chatMode === 'channel' && activeChannelId === channel.id ? "opacity-100" : "opacity-70")} />
                      <span className="truncate">{channel.name}</span>
                    </div>
                    {(channelUnreadCounts[channel.id] ?? 0) > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {channelUnreadCounts[channel.id]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Messages Section */}
            <div>
              <div className="flex items-center justify-between px-2 mb-1 group">
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Direct Messages
                </h3>
                <Popover open={showNewDmPicker} onOpenChange={setShowNewDmPicker}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 opacity-100"
                      disabled={availableDmUsers.length === 0}
                    >
                      <PlusIcon className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="end">
                    <Command>
                      <CommandInput placeholder="Start direct message..." />
                      <CommandList>
                        <CommandEmpty>No team members found.</CommandEmpty>
                        <CommandGroup>
                          {availableDmUsers.map((dmUser) => (
                            <CommandItem
                              key={dmUser.id}
                              value={`${dmUser.name} ${dmUser.email}`}
                              onSelect={() => handleSelectDmUser(dmUser.id)}
                            >
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={dmUser.avatar} />
                                <AvatarFallback>{dmUser.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="truncate">{dmUser.name}</div>
                                {dmUser.email && (
                                  <div className="truncate text-xs text-muted-foreground">{dmUser.email}</div>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-0.5">
                {directMessageUsers.length === 0 && (
                  <div className="px-2 py-2 text-xs text-muted-foreground">
                    {availableDmUsers.length === 0 ? 'No team members' : 'No direct messages yet'}
                  </div>
                )}
                {directMessageUsers.map((dm) => (
                  <div
                    key={dm.id}
                    className={cn(
                      "flex items-center gap-1 rounded-md text-sm transition-colors group",
                      chatMode === 'dm' && activeDmUserId === dm.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <button
                      onClick={() => handleSelectDmUser(dm.id)}
                      className="flex min-w-0 flex-1 items-center justify-between px-2 py-1.5"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="relative shrink-0">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={dm.avatar} />
                            <AvatarFallback>{dm.name[0]}</AvatarFallback>
                          </Avatar>
                          <span className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-background",
                            dm.status === 'online' ? "bg-green-500" : 
                            dm.status === 'busy' ? "bg-red-500" : "bg-gray-400"
                          )} />
                        </div>
                        <span className="truncate">{dm.name}</span>
                      </div>
                      {dm.unreadCount && dm.unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {dm.unreadCount}
                        </span>
                      )}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete direct messages with ${dm.name}`}
                      className="mr-1 h-7 w-7 shrink-0 text-muted-foreground opacity-60 transition-opacity hover:text-destructive hover:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDeleteDmConversation(dm);
                      }}
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Chat Header */}
        <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-background shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            {chatMode === 'channel' ? (
              <>
                <div className="flex items-center gap-1 font-semibold text-foreground text-lg truncate">
                  <HashIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="truncate">{activeChannel?.name ?? 'general'}</span>
                </div>
                <span className="text-sm text-muted-foreground truncate hidden sm:inline-block border-l border-border pl-3 ml-1">
                  Team announcements and general discussion
                </span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 font-semibold text-foreground text-lg truncate">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={activeDmUser?.avatar} />
                    <AvatarFallback>{activeDmUser?.name?.[0] ?? '?'}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{activeDmUser?.name ?? 'Direct Message'}</span>
                </div>
                {activeDmUser?.email && (
                  <span className="text-sm text-muted-foreground truncate hidden sm:inline-block border-l border-border pl-3 ml-1">
                    {activeDmUser.email}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground shrink-0">
            {chatMode === 'channel' && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "h-8 px-3 hover:text-foreground gap-2",
                    showArchive && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => setShowArchive(!showArchive)}
                >
                  <ArchiveIcon className="h-4 w-4" />
                  <span className="text-xs">{showArchive ? 'Recent' : 'Archive'}</span>
                  {!showArchive && archivedMessages.length > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                      {archivedMessages.length}
                    </span>
                  )}
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
              </>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-foreground">
              <PhoneIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-foreground">
              <VideoIcon className="h-4 w-4" />
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-foreground">
              <InfoIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4">
          <div className="py-6 space-y-6 max-w-4xl mx-auto">
            {chatMode === 'channel' && showArchive && (
              <div className="bg-muted/50 rounded-lg p-4 mb-6 border border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ArchiveIcon className="h-4 w-4" strokeWidth={1.5} />
                  <span>Viewing archived messages (older than 7 days)</span>
                </div>
              </div>
            )}
            
            {chatMode === 'channel' && !showArchive && (
              <div className="relative flex items-center justify-center my-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs font-medium text-muted-foreground">
                  <span className="bg-background px-3">Today</span>
                </div>
              </div>
            )}

            {chatMode === 'dm' && (
              <div className="relative flex items-center justify-center my-8">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs font-medium text-muted-foreground">
                  <span className="bg-background px-3 flex items-center gap-2">
                    <MessageSquareIcon className="h-3 w-3" />
                    Direct conversation with {activeDmUser?.name}
                  </span>
                </div>
              </div>
            )}

            {loadingMessages ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2Icon className="h-5 w-5 animate-spin mr-2" />
                Loading messages...
              </div>
            ) : currentMessages.length > 0 ? currentMessages.map((msg) => {
              const theme = getUserTheme(msg.sender);
              const messageReactions = chatMode === 'channel' ? getMessageReactions(msg.id) : [];
              const isOwnMessage = msg.senderId === user?.id;
              const isEditing = editingMessageId === msg.id;
              
              return (
                <div key={msg.id} className={cn("group relative flex flex-col gap-1 p-4 rounded-2xl transition-all mb-3 border", theme.bg, theme.border)}>
                  {/* Action Bar */}
                  <div className="absolute -top-3 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1 bg-background border border-border shadow-sm rounded-full px-2 py-1 z-10 scale-90 group-hover:scale-100">
                    {chatMode === 'channel' && (
                      <>
                        <button 
                          onClick={() => handleToggleReaction(msg.id, '👏')}
                          className={cn("hover:scale-125 transition-transform p-1", hasUserReacted(msg.id, '👏') && "bg-primary/20 rounded")}
                          title="Clap"
                        >
                          👏
                        </button>
                        <button 
                          onClick={() => handleToggleReaction(msg.id, '👍')}
                          className={cn("hover:scale-125 transition-transform p-1", hasUserReacted(msg.id, '👍') && "bg-primary/20 rounded")}
                          title="Thumbs Up"
                        >
                          👍
                        </button>
                        <button 
                          onClick={() => handleToggleReaction(msg.id, '⭐')}
                          className={cn("hover:scale-125 transition-transform p-1", hasUserReacted(msg.id, '⭐') && "bg-primary/20 rounded")}
                          title="Star"
                        >
                          ⭐
                        </button>
                        <button 
                          onClick={() => handleToggleReaction(msg.id, '🎉')}
                          className={cn("hover:scale-125 transition-transform p-1", hasUserReacted(msg.id, '🎉') && "bg-primary/20 rounded")}
                          title="Celebrate"
                        >
                          🎉
                        </button>
                      </>
                    )}
                    {isOwnMessage && chatMode === 'channel' && (
                      <>
                        <div className="w-px h-4 bg-border mx-1" />
                        <button 
                          onClick={() => {
                            setEditingMessageId(msg.id);
                            setEditContent(msg.content);
                          }}
                          className="hover:scale-110 transition-transform p-1 text-muted-foreground hover:text-foreground"
                          title="Edit"
                        >
                          <EditIcon className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="hover:scale-110 transition-transform p-1 text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className={cn("font-bold text-sm", theme.text)}>{msg.sender}</span>
                    <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                    {msg.isEdited && <span className="text-xs text-muted-foreground italic">(edited)</span>}
                  </div>
                  
                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="flex-1 h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditMessage(msg.id);
                          if (e.key === 'Escape') {
                            setEditingMessageId(null);
                            setEditContent('');
                          }
                        }}
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditMessage(msg.id)}>
                        <CheckIcon className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingMessageId(null); setEditContent(''); }}>
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        {renderFormattedText(msg.content)}
                      </p>
                      
                      {/* Attachment Display */}
                      {msg.attachmentUrl && (
                        <div className="mt-2">
                          {msg.attachmentType && isImageFile(msg.attachmentType) ? (
                            <div className="relative inline-block">
                              <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                <img 
                                  src={msg.attachmentUrl} 
                                  alt={msg.attachmentName ?? 'Attachment'}
                                  className="max-w-xs max-h-48 rounded-lg border border-border object-cover hover:opacity-90 transition-opacity"
                                />
                              </a>
                              <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                {msg.attachmentName}
                              </div>
                            </div>
                          ) : (
                            <a 
                              href={msg.attachmentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted rounded-lg border border-border transition-colors"
                            >
                              <FileIcon className="h-5 w-5 text-muted-foreground" />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium truncate max-w-[200px]">
                                  {msg.attachmentName ?? 'Attachment'}
                                </span>
                                {msg.attachmentSize && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatFileSize(msg.attachmentSize)}
                                  </span>
                                )}
                              </div>
                              <DownloadIcon className="h-4 w-4 text-muted-foreground ml-2" />
                            </a>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  
                  {messageReactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {messageReactions.map((reaction, i) => (
                        <button 
                          key={i}
                          onClick={() => handleToggleReaction(msg.id, reaction.emoji)}
                          className={cn(
                            "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors",
                            hasUserReacted(msg.id, reaction.emoji)
                              ? "bg-primary/20 border-primary/30"
                              : "bg-background/50 hover:bg-background border-transparent hover:border-border"
                          )}
                          title={reaction.users.join(', ')}
                        >
                          <span>{reaction.emoji}</span>
                          <span className="text-muted-foreground font-medium">{reaction.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="text-center py-12">
                {chatMode === 'channel' ? (
                  <>
                    <ArchiveIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-muted-foreground">{showArchive ? 'No archived messages' : 'No messages yet'}</p>
                    <p className="text-sm text-muted-foreground mt-1">Be the first to send a message!</p>
                  </>
                ) : (
                  <>
                    <MessageSquareIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-muted-foreground">No messages yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Start a conversation with {activeDmUser?.name}</p>
                  </>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 pt-2 bg-background shrink-0">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
          />
          
          <div className="relative max-w-4xl mx-auto rounded-xl border-2 border-primary/30 bg-card shadow-lg hover:shadow-xl hover:border-primary/50 focus-within:shadow-2xl focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300">
            {/* Formatting Toolbar */}
            <div className="flex items-center gap-0.5 p-1.5 border-b border-border/40 bg-muted/30 rounded-t-xl">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-foreground rounded"
                onClick={() => applyFormatting('bold')}
                title="Bold (Ctrl+B)"
              >
                <BoldIcon className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-foreground rounded"
                onClick={() => applyFormatting('italic')}
                title="Italic (Ctrl+I)"
              >
                <ItalicIcon className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-foreground rounded"
                onClick={() => applyFormatting('underline')}
                title="Underline (Ctrl+U)"
              >
                <UnderlineIcon className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-3.5 bg-border mx-1" />
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "h-7 w-7 text-muted-foreground hover:text-foreground rounded",
                  pendingFile && "text-primary bg-primary/10"
                )}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <PaperclipIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            {/* Pending File Preview */}
            {pendingFile && (
              <div className="px-4 py-2 border-b border-border/40 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {pendingFile.type.startsWith('image/') ? (
                      <div className="relative h-12 w-12 rounded overflow-hidden border border-border bg-muted">
                        <img 
                          src={URL.createObjectURL(pendingFile)} 
                          alt="Preview" 
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded border border-border bg-muted flex items-center justify-center">
                        <FileIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{pendingFile.name}</span>
                      <span className="text-xs text-muted-foreground">{formatFileSize(pendingFile.size)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={handleRemovePendingFile}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <Input
              ref={messageInputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
                // Keyboard shortcuts for formatting
                if (e.ctrlKey || e.metaKey) {
                  if (e.key === 'b') {
                    e.preventDefault();
                    applyFormatting('bold');
                  } else if (e.key === 'i') {
                    e.preventDefault();
                    applyFormatting('italic');
                  } else if (e.key === 'u') {
                    e.preventDefault();
                    applyFormatting('underline');
                  }
                }
              }}
              placeholder={chatMode === 'channel' ? `Message #${activeChannel?.name ?? 'general'}` : `Message ${activeDmUser?.name ?? 'user'}`}
              className="border-0 focus-visible:ring-0 px-4 py-3 min-h-[48px] bg-transparent text-sm placeholder:text-muted-foreground/60"
            />
            
            <div className="flex justify-between items-center p-2">
              <div className="flex gap-0.5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted">
                  <SmileIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-3">
                {uploading && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2Icon className="h-3 w-3 animate-spin" />
                    Uploading...
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground hidden sm:inline opacity-60">
                  Enter to send
                </span>
                <Button 
                  size="sm" 
                  onClick={handleSendMessage}
                  disabled={sending || (!messageInput.trim() && !pendingFile) || (chatMode === 'channel' ? !activeChannel : !activeDmUserId)}
                  className="h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md shadow-sm transition-all"
                >
                  {sending ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <SendIcon className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
