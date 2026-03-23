import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  MailIcon, 
  SendIcon, 
  EraserIcon, 
  CopyIcon, 
  CheckIcon, 
  NotebookPenIcon,
  DownloadIcon,
  MicIcon,
  MicOffIcon,
  PenIcon,
  TypeIcon,
  TrashIcon,
  PaletteIcon,
  SparklesIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListIcon,
  XIcon,
  ArrowUpDownIcon,
  UndoIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { confirmDialog } from '@/hooks/use-confirm';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Tesseract from 'tesseract.js';
import { useNotesStore, Note } from '@/stores/notesStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { SaveIcon, HistoryIcon, ChevronLeftIcon, Share2Icon, UsersIcon, LockIcon, GlobeIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface ThinkPadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialNotes?: string;
  initialSubject?: string;
}

export function ThinkPadDialog({ open, onOpenChange, initialNotes = '', initialSubject }: ThinkPadDialogProps) {
  const [mode, setMode] = useState<'text' | 'draw'>('text');
  const [notes, setNotes] = useState(initialNotes);
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(initialSubject || format(new Date(), 'MMM d, yyyy h:mm a'));
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [canvasData, setCanvasData] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [drawTool, setDrawTool] = useState<'pen' | 'eraser' | 'text'>('pen');
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [textInput, setTextInput] = useState<{x: number, y: number, text: string} | null>(null);
  
  const { savedNotes, addNote, deleteNote, shareNote, unshareNote } = useNotesStore();
  const [showSavedList, setShowSavedList] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [sharingNoteId, setSharingNoteId] = useState<string | null>(null);

  const availableRoles = [
    { value: 'owner', label: 'Owner' },
    { value: 'branch_manager', label: 'Branch Manager' },
    { value: 'negotiator', label: 'Negotiator' },
    { value: 'prospector', label: 'Prospector' },
    { value: 'administrator', label: 'Administrator' },
  ];
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const filteredNotes = savedNotes
    .filter(note => 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  useEffect(() => {
    if (open) {
      if (!initialNotes) {
        const savedNotes = localStorage.getItem('think-pad-notes');
        if (savedNotes) setNotes(savedNotes);
        
        const savedCanvas = localStorage.getItem('think-pad-canvas');
        if (savedCanvas) setCanvasData(savedCanvas);
      } else {
        setNotes(initialNotes);
      }
      if (initialSubject) setSubject(initialSubject);
    }
  }, [open, initialNotes, initialSubject]);

  useEffect(() => {
    if (open) {
      localStorage.setItem('think-pad-notes', notes);
    }
  }, [notes, open]);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setNotes(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  useEffect(() => {
    if (open && mode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }

      if (canvasData && ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setHistory([imageData]);
          setHistoryStep(0);
        };
        img.src = canvasData;
      } else if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([imageData]);
        setHistoryStep(0);
      }
      
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
      }
    }
  }, [open, mode]);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current?.start();
      setIsRecording(true);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = async () => {
    const ok = await confirmDialog('Are you sure you want to clear your notes?', {
      title: 'Clear notes?',
      confirmText: 'Clear',
      variant: 'destructive',
    });
    if (!ok) return;

    if (mode === 'text') {
      setNotes('');
      localStorage.removeItem('think-pad-notes');
    } else {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setCanvasData(null);
        localStorage.removeItem('think-pad-canvas');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([imageData]);
        setHistoryStep(0);
      }
    }
  };

  const saveHistory = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const newHistory = history.slice(0, historyStep + 1);
      newHistory.push(imageData);
      if (newHistory.length > 20) newHistory.shift();
      
      setHistory(newHistory);
      setHistoryStep(newHistory.length - 1);
      
      const dataUrl = canvas.toDataURL();
      setCanvasData(dataUrl);
      localStorage.setItem('think-pad-canvas', dataUrl);
    }
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx && history[newStep]) {
        ctx.putImageData(history[newStep], 0, 0);
        setHistoryStep(newStep);
        
        const dataUrl = canvas.toDataURL();
        setCanvasData(dataUrl);
        localStorage.setItem('think-pad-canvas', dataUrl);
      }
    }
  };

  const handleSaveNote = async () => {
    if (!notes.trim() && !canvasData) {
      alert('Cannot save empty note.');
      return;
    }

    await addNote({
      title: subject || 'Untitled Note',
      content: notes,
      canvasData: canvasData,
      type: mode === 'text' ? 'text' : 'draw'
    });

    alert('Note saved successfully!');
  };

  const handleOpenShareDialog = (noteId: string, currentRoles: string[] = []) => {
    setSharingNoteId(noteId);
    setSelectedRoles(currentRoles);
    setShowShareOptions(true);
  };

  const handleToggleRole = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSaveSharing = async () => {
    if (!sharingNoteId) return;
    
    if (selectedRoles.length > 0) {
      await shareNote(sharingNoteId, selectedRoles);
    } else {
      await unshareNote(sharingNoteId);
    }
    
    setShowShareOptions(false);
    setSharingNoteId(null);
    setSelectedRoles([]);
  };

  const handleLoadNote = async (note: Note) => {
    const hasUnsavedWork = (notes.trim().length > 0) || (canvasData !== null && mode === 'draw');
    
    if (hasUnsavedWork) {
      const ok = await confirmDialog('Loading this note will replace your current work. Continue?', {
        title: 'Replace current note?',
        confirmText: 'Continue',
        variant: 'destructive',
      });
      if (!ok) return;
    }

    setNotes(note.content || '');
    setCanvasData(note.canvasData || null);
    setSubject(note.title);
    
    if (note.canvasData) {
      setMode('draw');
    } else {
      setMode('text');
    }
    
    setShowSavedList(false);
  };

  const handleSendEmail = () => {
    if (!email) {
      alert('Please enter an email address.');
      return;
    }
    
    setIsSending(true);
    setTimeout(() => {
      console.log('Sending notes to:', email);
      console.log('Subject:', subject);
      console.log('Content:', notes);
      if (canvasData) {
        console.log('Attachment: Drawing image data included');
      }
      
      setIsSending(false);
      setShowEmailForm(false);
      alert(`Notes sent to ${email}`);
      setEmail('');
    }, 1500);
  };

  const handleDownload = () => {
    if (mode === 'text') {
      const element = document.createElement("a");
      const file = new Blob([notes], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${subject.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } else if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `${subject.replace(/\s+/g, '_')}_drawing.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (drawTool === 'text') return;
    
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.globalCompositeOperation = drawTool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = drawTool === 'eraser' ? 'rgba(0,0,0,1)' : strokeColor;
      ctx.lineWidth = drawTool === 'eraser' ? 20 : lineWidth;
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || drawTool === 'text') return;
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveHistory();
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (drawTool === 'text') {
      const { x, y } = getCoordinates(e);
      setTextInput({ x, y, text: '' });
    }
  };

  const handleTextComplete = () => {
    if (textInput && textInput.text.trim()) {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.font = '16px sans-serif';
        ctx.fillStyle = strokeColor;
        ctx.fillText(textInput.text, textInput.x, textInput.y + 12);
        saveHistory();
      }
    }
    setTextInput(null);
  };

  const handleConvertToText = async () => {
    if (!canvasRef.current) return;
    
    setIsConverting(true);
    try {
      const { data: { text } } = await Tesseract.recognize(
        canvasRef.current,
        'eng',
        { logger: m => console.log(m) }
      );
      
      if (text.trim()) {
        setNotes(prev => prev + (prev ? '\n' : '') + text.trim());
        setMode('text');
      } else {
        alert("Could not recognize any text. Please try writing more clearly.");
      }
    } catch (error) {
      console.error("OCR Error:", error);
      alert("Failed to convert handwriting to text.");
    } finally {
      setIsConverting(false);
    }
  };

  const handleAIPolish = () => {
    if (!notes.trim()) return;
    setIsPolishing(true);
    
    setTimeout(() => {
      setNotes(prev => {
        let polished = prev
          .replace(/([.?!])\s*([a-z])/g, (match, p1, p2) => p1 + ' ' + p2.toUpperCase())
          .replace(/^\s*[a-z]/, (match) => match.toUpperCase())
          .trim();
          
        if (polished && !/[.?!]$/.test(polished)) {
          polished += '.';
        }
        return polished;
      });
      setIsPolishing(false);
    }, 1000);
  };

  const handleNewNote = async () => {
    const hasUnsavedWork = (notes.trim().length > 0) || (canvasData !== null);
    
    if (hasUnsavedWork) {
      const ok = await confirmDialog('Start a new note? Any unsaved changes to the current note will be lost.', {
        title: 'Start new note?',
        confirmText: 'Start new',
        variant: 'destructive',
      });
      if (!ok) return;
    }

    setNotes('');
    setCanvasData(null);
    setSubject(format(new Date(), 'MMM d, yyyy h:mm a'));
    setMode('text');
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    
    localStorage.removeItem('think-pad-notes');
    localStorage.removeItem('think-pad-canvas');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-card text-card-foreground h-[85vh] flex flex-col">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <NotebookPenIcon className="h-5 w-5 text-primary" />
              Think Pad
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              {!showSavedList && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleNewNote}
                  className="h-8 gap-1 mr-2"
                  title="Start a new note"
                >
                  <PlusIcon className="h-3.5 w-3.5" /> New
                </Button>
              )}
              {showSavedList ? (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowSavedList(false)}
                  className="h-8 gap-1"
                >
                  <ChevronLeftIcon className="h-4 w-4" /> Back
                </Button>
              ) : (
                <div className="flex bg-muted p-1 rounded-lg">
                  <Button
                    variant={mode === 'text' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setMode('text')}
                    className="h-7 px-3 text-xs"
                  >
                    <TypeIcon className="h-3 w-3 mr-1.5" /> Text
                  </Button>
                  <Button
                    variant={mode === 'draw' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setMode('draw')}
                    className="h-7 px-3 text-xs"
                  >
                    <PenIcon className="h-3 w-3 mr-1.5" /> Draw
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 py-4 flex flex-col gap-4 min-h-0 relative">
          {showSavedList ? (
            <div className="flex flex-col h-full gap-4">
              <div className="flex items-center justify-end gap-2 px-1">
                {searchOpen ? (
                  <div className="relative flex-1 animate-in fade-in slide-in-from-right-5 duration-200">
                    <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      autoFocus
                      placeholder="Search notes..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onBlur={() => !searchQuery && setSearchOpen(false)}
                      className="pl-8 h-8 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-8 w-8 hover:bg-transparent"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchOpen(false);
                      }}
                    >
                      <XIcon className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground ml-auto"
                    onClick={() => setSearchOpen(true)}
                    title="Search"
                  >
                    <SearchIcon className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  title={`Sort by date (${sortOrder === 'desc' ? 'Newest' : 'Oldest'})`}
                >
                  <ArrowUpDownIcon className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-3">
                  {savedNotes.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <HistoryIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No saved notes yet.</p>
                    </div>
                  ) : filteredNotes.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <SearchIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No notes match your search.</p>
                    </div>
                  ) : (
                    filteredNotes.map((note) => (
                      <div 
                        key={note.id} 
                        className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
                        onClick={() => {
                          if (window.getSelection()?.toString()) return;
                          handleLoadNote(note);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm truncate">{note.title}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {note.content || (note.canvasData ? 'Drawing content' : 'Empty note')}
                          </p>
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-medium">
                            {format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {note.isShared && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <UsersIcon className="h-3 w-3" />
                              Shared
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenShareDialog(note.id, note.sharedWithRoles || []);
                            }}
                            title="Share note"
                          >
                            <Share2Icon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const ok = await confirmDialog('Delete this note?', {
                                title: 'Delete note?',
                                confirmText: 'Delete',
                                variant: 'destructive',
                              });
                              if (ok) deleteNote(note.id);
                            }}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <>
              {showEmailForm ? (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border animate-in slide-in-from-top-2 z-10">
                  <div className="space-y-2">
                    <Label htmlFor="email-to">To:</Label>
                    <div className="relative">
                      <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="email-to" 
                        type="email" 
                        placeholder="recipient@example.com" 
                        className="pl-9"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowEmailForm(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleSendEmail} disabled={isSending}>
                      {isSending ? 'Sending...' : 'Send Email'}
                      {!isSending && <SendIcon className="ml-2 h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input 
                    placeholder="Note Title (e.g. Meeting with Client)" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="font-semibold text-lg border-transparent hover:border-border focus:border-primary px-0 h-auto py-1 rounded-none border-b transition-colors"
                  />
                </div>
              )}

              <div className="flex-1 relative border border-border rounded-md overflow-hidden bg-background flex flex-col">
                {mode === 'text' ? (
                  <>
                    <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/20">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded hover:bg-muted">
                        <BoldIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded hover:bg-muted">
                        <ItalicIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded hover:bg-muted">
                        <UnderlineIcon className="h-3.5 w-3.5" />
                      </Button>
                      <div className="w-px h-4 bg-border mx-1" />
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded hover:bg-muted">
                        <ListIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Textarea 
                      className="flex-1 w-full resize-none p-4 text-base leading-relaxed bg-transparent border-0 focus-visible:ring-0"
                      placeholder="Start typing your notes here..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 gap-2 shadow-sm"
                        onClick={handleAIPolish}
                        disabled={isPolishing || !notes.trim()}
                        title="Polish with AI"
                      >
                        {isPolishing ? (
                          <Loader2Icon className="h-3 w-3 animate-spin" />
                        ) : (
                          <SparklesIcon className="h-3 w-3" />
                        )}
                        AI Polish
                      </Button>
                      <Button
                        variant={isRecording ? "destructive" : "secondary"}
                        size="sm"
                        className="h-8 gap-2 shadow-sm"
                        onClick={toggleRecording}
                      >
                        {isRecording ? (
                          <>
                            <MicOffIcon className="h-3 w-3 animate-pulse" /> Stop Recording
                          </>
                        ) : (
                          <>
                            <MicIcon className="h-3 w-3" /> Dictate
                          </>
                        )}
                      </Button>
                      <div className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded border border-border">
                        {notes.length} chars
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full relative touch-none">
                    <canvas
                      ref={canvasRef}
                      className={cn(
                        "w-full h-full",
                        drawTool === 'text' ? "cursor-text" : "cursor-crosshair"
                      )}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      onClick={handleCanvasClick}
                    />
                    
                    {textInput && (
                      <input
                        autoFocus
                        value={textInput.text}
                        onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
                        onBlur={handleTextComplete}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleTextComplete();
                        }}
                        style={{
                          position: 'absolute',
                          left: textInput.x,
                          top: textInput.y - 8,
                          font: '16px sans-serif',
                          color: strokeColor,
                          background: 'transparent',
                          border: '1px dashed #ccc',
                          outline: 'none',
                          padding: '0 4px',
                          minWidth: '50px'
                        }}
                      />
                    )}

                    <div className="absolute top-4 left-4 flex gap-2 bg-background/90 p-1.5 rounded-lg border border-border shadow-sm">
                      <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
                        <Button
                          variant={drawTool === 'pen' ? 'secondary' : 'ghost'}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDrawTool('pen')}
                          title="Pen"
                        >
                          <PenIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={drawTool === 'eraser' ? 'secondary' : 'ghost'}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDrawTool('eraser')}
                          title="Eraser"
                        >
                          <EraserIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={drawTool === 'text' ? 'secondary' : 'ghost'}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDrawTool('text')}
                          title="Text"
                        >
                          <TypeIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleUndo}
                          disabled={historyStep <= 0}
                          title="Undo"
                        >
                          <UndoIcon className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-1 border-r border-border pr-2 mr-1">
                        {['#000000', '#EF4444', '#3B82F6', '#10B981'].map(color => (
                          <button
                            key={color}
                            className={cn(
                              "w-5 h-5 rounded-full border border-border transition-transform hover:scale-110",
                              strokeColor === color && "ring-2 ring-offset-1 ring-primary"
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              setStrokeColor(color);
                              if (canvasRef.current) {
                                const ctx = canvasRef.current.getContext('2d');
                                if (ctx) ctx.strokeStyle = color;
                              }
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        {[2, 4, 6].map(width => (
                          <button
                            key={width}
                            className={cn(
                              "w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors",
                              lineWidth === width && "bg-muted text-primary"
                            )}
                            onClick={() => {
                              setLineWidth(width);
                              if (canvasRef.current) {
                                const ctx = canvasRef.current.getContext('2d');
                                if (ctx) ctx.lineWidth = width;
                              }
                            }}
                          >
                            <div 
                              className="bg-current rounded-full" 
                              style={{ width: width + 2, height: width + 2 }} 
                            />
                          </button>
                        ))}
                      </div>
                      <div className="w-px h-6 bg-border mx-1" />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={handleConvertToText}
                        disabled={isConverting}
                        title="Convert to Text"
                      >
                        {isConverting ? (
                          <Loader2Icon className="h-4 w-4 animate-spin" />
                        ) : (
                          <SparklesIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border pt-4 flex justify-between sm:justify-between items-center">
          <div className="flex gap-2">
            {!showSavedList && (
              <>
                <Button variant="ghost" size="icon" onClick={handleClear} title="Clear" className="text-muted-foreground hover:text-destructive">
                  <TrashIcon className="h-4 w-4" />
                </Button>
                {mode === 'text' && (
                  <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy to Clipboard">
                    {copied ? <CheckIcon className="h-4 w-4 text-green-600" /> : <CopyIcon className="h-4 w-4" />}
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={handleDownload} title="Download">
                  <DownloadIcon className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowSavedList(!showSavedList)}
              className={cn("gap-2", showSavedList && "bg-accent")}
            >
              <HistoryIcon className="h-4 w-4" />
              {showSavedList ? 'Hide Saved' : 'Saved Notes'}
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            {!showSavedList && (
              <>
                <Button 
                  onClick={handleSaveNote}
                  variant="secondary"
                  className="gap-2"
                >
                  <SaveIcon className="h-4 w-4" />
                  Save
                </Button>
                <Button 
                  onClick={() => setShowEmailForm(true)} 
                  className={cn("bg-primary text-primary-foreground hover:bg-primary/90", showEmailForm && "hidden")}
                  disabled={mode === 'text' && !notes.trim()}
                >
                  <MailIcon className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Share Options Dialog */}
      <Dialog open={showShareOptions} onOpenChange={setShowShareOptions}>
        <DialogContent className="sm:max-w-[400px] bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2Icon className="h-5 w-5" />
              Share Note
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Select which roles can view this note:
            </p>
            <div className="space-y-3">
              {availableRoles.map((role) => (
                <div key={role.value} className="flex items-center space-x-3">
                  <Checkbox
                    id={`role-${role.value}`}
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={() => handleToggleRole(role.value)}
                  />
                  <label
                    htmlFor={`role-${role.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {role.label}
                  </label>
                </div>
              ))}
            </div>
            {selectedRoles.length === 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <LockIcon className="h-3 w-3" />
                Note will be private (only visible to you)
              </p>
            )}
            {selectedRoles.length > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <GlobeIcon className="h-3 w-3" />
                Note will be shared with {selectedRoles.length} role(s)
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowShareOptions(false)}>Cancel</Button>
            <Button onClick={handleSaveSharing}>
              {selectedRoles.length > 0 ? 'Share' : 'Make Private'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
