import React, { useState } from 'react';
import { 
  ITProject, 
  RSSFeedItem, 
  KBArticle, 
  KBComment,
  AssetReservation, 
  SavedQuery, 
  Asset 
} from '../types';
import { 
  Wrench, 
  BookOpen, 
  Wifi, 
  FolderGit, 
  Calendar, 
  Bookmark, 
  Search, 
  Plus, 
  CheckSquare, 
  Clock, 
  User, 
  Compass,
  AlertCircle,
  Edit3,
  Trash2,
  Copy,
  Check,
  Tags,
  ArrowLeft,
  X,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  WifiOff,
  Database,
  Network,
  ChevronRight,
  Code,
  Video,
  Bold,
  List,
  Heading,
  Globe,
  RefreshCw,
  Sliders,
  Printer,
  MessageSquare,
  CornerDownRight,
  Send
} from 'lucide-react';
import KBTopologyGraph, { getCategoryColor } from './KBTopologyGraph';
import { 
  db, 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  where 
} from '../firebase';

interface OperationToolsProps {
  projects: ITProject[];
  rssFeed: RSSFeedItem[];
  kbArticles: KBArticle[];
  reservations: AssetReservation[];
  savedQueries: SavedQuery[];
  assets: Asset[];
  onAddReservation: (res: Partial<AssetReservation>) => void;
  onUpdateReservation: (id: string, updates: Partial<AssetReservation>) => void;
  onAddProject: (prj: Partial<ITProject>) => void;
  onUpdateProjectStatus: (id: string, status: ITProject['status']) => void;
  onAddKBArticle: (kb: KBArticle) => void;
  onUpdateKBArticle?: (id: string, updates: Partial<KBArticle>) => void;
  onDeleteKBArticle?: (id: string) => void;
  onSaveQuery: (name: string, queryText: string) => void;
  onTriggerSavedQuery: (queryText: string) => void;
}

interface ScheduleTask {
  id: string;
  title: string;
  assigneeId: string;
  timeSlot: string;
  color: string;
}

const TECHNICIANS = [
  { id: 'alice', name: 'Alice Smith', role: 'Lead Stage Tech' },
  { id: 'bob', name: 'Bob Jones', role: 'Audio Engineer' },
  { id: 'charlie', name: 'Charlie Brown', role: 'Pyro Specialist' },
  { id: 'david', name: 'David White', role: 'Lighting Lead' },
];

const EQUIPMENTS = [
  { id: 'projector', name: 'Laser Projector V1', role: 'Stage Video Feed' },
  { id: 'subwoofer', name: 'Lake Stage Subwoofer', role: 'Main Ground PA' },
  { id: 'pyro_trigger', name: 'Trigger Board B', role: 'Fireworks Control' },
  { id: 'dmx_splitter', name: 'DMX Splitter Node 3', role: 'Signal Booster' },
];

const TIME_SLOTS = [
  '08:00 - 10:00',
  '10:00 - 12:00',
  '12:00 - 14:00',
  '14:00 - 16:00',
  '16:00 - 18:00',
  '18:00 - 20:00',
  '20:00 - 22:00',
];

export default function OperationTools({
  projects,
  rssFeed,
  kbArticles,
  reservations,
  savedQueries,
  assets,
  onAddReservation,
  onUpdateReservation,
  onAddProject,
  onUpdateProjectStatus,
  onAddKBArticle,
  onUpdateKBArticle,
  onDeleteKBArticle,
  onSaveQuery,
  onTriggerSavedQuery
}: OperationToolsProps) {
  const [activeTab, setActiveTab] = useState<'projects' | 'rss' | 'kb' | 'reservations' | 'queries' | 'scheduling'>('projects');

  // Resource scheduling states
  const [scheduleTasks, setScheduleTasks] = useState<ScheduleTask[]>([
    { id: 'st-1', title: 'Lake Projector Calibration', assigneeId: 'alice', timeSlot: '10:00 - 12:00', color: 'indigo' },
    { id: 'st-2', title: 'Mic Array Tuning', assigneeId: 'bob', timeSlot: '12:00 - 14:00', color: 'cyan' },
    { id: 'st-3', title: 'Pyro Trigger Tests', assigneeId: 'charlie', timeSlot: '14:00 - 16:00', color: 'rose' },
    { id: 'st-4', title: 'Lake PA Alignments', assigneeId: 'subwoofer', timeSlot: '16:00 - 18:00', color: 'emerald' },
    { id: 'st-5', title: 'Sunset Showground Verification', assigneeId: 'alice', timeSlot: '18:00 - 20:00', color: 'amber' },
    { id: 'st-6', title: 'DMX Signal Routing Check', assigneeId: 'david', timeSlot: '08:00 - 10:00', color: 'purple' },
  ]);

  // Form state for creating new scheduling task
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('alice');
  const [newTaskTimeSlot, setNewTaskTimeSlot] = useState('08:00 - 10:00');
  const [newTaskColor, setNewTaskColor] = useState('indigo');
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  const handleAddScheduleTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    const newTask: ScheduleTask = {
      id: `st-${Date.now()}`,
      title: newTaskTitle,
      assigneeId: newTaskAssignee,
      timeSlot: newTaskTimeSlot,
      color: newTaskColor
    };
    setScheduleTasks(prev => [...prev, newTask]);
    setNewTaskTitle('');
    setShowScheduleForm(false);
  };

  const handleDragStartTask = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDropOnSlot = (e: React.DragEvent, assigneeId: string, timeSlot: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    setScheduleTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, assigneeId, timeSlot };
      }
      return t;
    }));
  };

  // New reservation state
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [reservedBy, setReservedBy] = useState('Seth Boa Amponsem');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  // New project state
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projManager, setProjManager] = useState('');
  const [projDue, setProjDue] = useState('');
  const [selectedProject, setSelectedProject] = useState<ITProject | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<ScheduleTask | null>(null);

  // Saved query state
  const [queryName, setQueryName] = useState('');
  const [queryText, setQueryText] = useState('');

  // KB Search state
  const [kbSearch, setKbSearch] = useState('');

  // NEW Advanced KB States
  const [clientIp, setClientIp] = useState<string>('Detecting...');
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => {
    return localStorage.getItem('kb_offline_mode') === 'true';
  });
  const [offlineCache, setOfflineCache] = useState<KBArticle[]>(() => {
    try {
      const saved = localStorage.getItem('kb_offline_cache');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [lastCacheSync, setLastCacheSync] = useState<string | null>(() => localStorage.getItem('kb_cache_sync_time'));
  const [useAssistantContext, setUseAssistantContext] = useState<boolean>(false);
  const [activeTabMode, setActiveTabMode] = useState<'browse' | 'topology'>('browse');
  const [formEditorView, setFormEditorView] = useState<'edit' | 'split' | 'preview'>('split');
  const [kbFormDependencies, setKbFormDependencies] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // User ratings state: track voted articles
  const [userVotes, setUserVotes] = useState<Record<string, 'helpful' | 'nothelpful'>>(() => {
    try {
      const saved = localStorage.getItem('kb_user_votes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Fetch real client IP on component mount
  React.useEffect(() => {
    const fetchClientIp = async () => {
      try {
        const res = await fetch('/api/client-ip');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.ip) {
            setClientIp(data.ip);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch client IP:', err);
        setClientIp('127.0.0.1 (Local Loopback)');
      }
    };
    fetchClientIp();
  }, []);

  // Sync local offline cache copy automatically when kbArticles are loaded/changed online
  React.useEffect(() => {
    if (kbArticles && kbArticles.length > 0 && !isOfflineMode) {
      localStorage.setItem('kb_offline_cache', JSON.stringify(kbArticles));
      const syncTime = new Date().toLocaleString();
      localStorage.setItem('kb_cache_sync_time', syncTime);
      setLastCacheSync(syncTime);
      setOfflineCache(kbArticles);
    }
  }, [kbArticles, isOfflineMode]);

  // Extract keywords from Kynren Assistant Conversation history to match articles semantically
  const assistantRecommendations = React.useMemo(() => {
    try {
      const chatHistoryStr = localStorage.getItem('kynren_chat_history');
      if (!chatHistoryStr) return [];
      const history = JSON.parse(chatHistoryStr);
      if (!Array.isArray(history) || history.length === 0) return [];
      
      const recentMessages = history.slice(-4);
      const combinedText = recentMessages.map((m: any) => (m.text || '')).join(' ').toLowerCase();
      
      const dictionary = [
        'fiber', 'network', 'dmx', 'audio', 'light', 'pyro', 'power', 
        'backup', 'dns', 'ping', 'ip', 'stage', 'security', 'vault', 
        'password', 'credentials', 'weather', 'failover', 'sensor', 
        'lake', 'projector', 'trigger', 'fireworks', 'switch', 'router'
      ];
      
      const foundTerms = dictionary.filter(term => combinedText.includes(term));
      if (foundTerms.length === 0) return [];

      const scored = (isOfflineMode ? offlineCache : kbArticles).map(art => {
        let score = 0;
        const artTitle = art.title.toLowerCase();
        const artContent = art.content.toLowerCase();
        const artCategory = art.category.toLowerCase();
        const artTags = (art.tags || []).map(t => t.toLowerCase());

        foundTerms.forEach(term => {
          if (artTitle.includes(term)) score += 5;
          if (artCategory.includes(term)) score += 3;
          if (artTags.includes(term)) score += 4;
          if (artContent.includes(term)) score += 1;
        });

        return { 
          article: art, 
          score, 
          matchedTerms: foundTerms.filter(t => artTitle.includes(t) || artTags.includes(t) || artCategory.includes(t)) 
        };
      });

      return scored
        .filter(item => item.score > 1)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    } catch (e) {
      console.warn("Failed to parse assistant context for semantic suggestions:", e);
      return [];
    }
  }, [kbArticles, offlineCache, isOfflineMode]);

  const currentKBDataset = isOfflineMode ? offlineCache : kbArticles;

  const handleManualCacheSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      localStorage.setItem('kb_offline_cache', JSON.stringify(kbArticles));
      const syncTime = new Date().toLocaleString();
      localStorage.setItem('kb_cache_sync_time', syncTime);
      setLastCacheSync(syncTime);
      setOfflineCache(kbArticles);
      setIsSyncing(false);
    }, 1200);
  };

  const handleToggleOfflineMode = (val: boolean) => {
    setIsOfflineMode(val);
    localStorage.setItem('kb_offline_mode', String(val));
  };

  const handleVoteArticle = async (articleId: string, voteType: 'helpful' | 'nothelpful') => {
    const currentVotes = { ...userVotes };
    const dataset = isOfflineMode ? offlineCache : kbArticles;
    const article = dataset.find(a => a.id === articleId);
    if (!article) return;

    let helpfulDiff = 0;
    let notHelpfulDiff = 0;

    const previousVote = currentVotes[articleId];
    if (previousVote === voteType) {
      delete currentVotes[articleId];
      if (voteType === 'helpful') helpfulDiff = -1;
      else notHelpfulDiff = -1;
    } else {
      if (previousVote) {
        if (previousVote === 'helpful') helpfulDiff = -1;
        else notHelpfulDiff = -1;
      }
      currentVotes[articleId] = voteType;
      if (voteType === 'helpful') helpfulDiff = 1;
      else notHelpfulDiff = 1;
    }

    setUserVotes(currentVotes);
    localStorage.setItem('kb_user_votes', JSON.stringify(currentVotes));

    const updatedHelpful = Math.max(0, (article.helpfulCount || 0) + helpfulDiff);
    const updatedNotHelpful = Math.max(0, (article.notHelpfulCount || 0) + notHelpfulDiff);

    const updates = {
      helpfulCount: updatedHelpful,
      notHelpfulCount: updatedNotHelpful
    };

    const updatedArticle = { ...article, ...updates };
    if (selectedKbArticle?.id === articleId) {
      setSelectedKbArticle(updatedArticle);
    }

    if (!isOfflineMode && onUpdateKBArticle) {
      try {
        await onUpdateKBArticle(articleId, updates);
      } catch (err) {
        console.error("Failed to update article ratings in database:", err);
      }
    } else {
      const updatedOffline = offlineCache.map(a => a.id === articleId ? { ...a, ...updates } : a);
      setOfflineCache(updatedOffline);
      localStorage.setItem('kb_offline_cache', JSON.stringify(updatedOffline));
    }
  };

  // Robust Knowledge Base state variables
  const [kbCategoryFilter, setKbCategoryFilter] = useState<string>('all');
  const [selectedKbArticle, setSelectedKbArticle] = useState<KBArticle | null>(null);
  const [showKbForm, setShowKbForm] = useState(false);
  const [kbEditingArticleId, setKbEditingArticleId] = useState<string | null>(null);

  // Print support ref
  const printIframeRef = React.useRef<HTMLIFrameElement | null>(null);

  // Recently Viewed state
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kb_recently_viewed');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Track article views for Recently Viewed section
  React.useEffect(() => {
    if (selectedKbArticle) {
      setRecentlyViewedIds(prev => {
        const next = [selectedKbArticle.id, ...prev.filter(id => id !== selectedKbArticle.id)].slice(0, 5);
        localStorage.setItem('kb_recently_viewed', JSON.stringify(next));
        return next;
      });
    }
  }, [selectedKbArticle]);

  // Last Synced state
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => {
    return localStorage.getItem('kb_last_synced') || new Date().toLocaleString();
  });

  React.useEffect(() => {
    if (kbArticles && kbArticles.length > 0) {
      const nowStr = new Date().toLocaleString();
      setLastSyncedTime(nowStr);
      localStorage.setItem('kb_last_synced', nowStr);
    }
  }, [kbArticles]);

  // Comments state
  const [comments, setComments] = useState<KBComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('Seth Boa Amponsem');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Sync Comments in Realtime
  React.useEffect(() => {
    if (!selectedKbArticle) {
      setComments([]);
      return;
    }

    const q = query(
      collection(db, 'kb_comments'),
      where('articleId', '==', selectedKbArticle.id),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as KBComment[];
      setComments(loadedComments);
    }, (error) => {
      console.error("Failed to fetch comments: ", error);
    });

    return () => unsubscribe();
  }, [selectedKbArticle]);

  const handleAddComment = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    const text = parentId ? replyText : newCommentText;
    const author = commentAuthor;
    if (!text.trim() || !selectedKbArticle) return;

    const newComment = {
      articleId: selectedKbArticle.id,
      author,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      ...(parentId && { parentId })
    };

    try {
      await addDoc(collection(db, 'kb_comments'), newComment);
      if (parentId) {
        setReplyText('');
        setReplyingToId(null);
      } else {
        setNewCommentText('');
      }
    } catch (err) {
      console.error("Failed to add comment: ", err);
    }
  };

  const handlePrintToPDF = (article: KBArticle) => {
    const iframe = printIframeRef.current;
    if (!iframe) return;

    const docToWrite = iframe.contentDocument || iframe.contentWindow?.document;
    if (!docToWrite) return;

    let contentHtml = '';
    article.content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        contentHtml += '<h4>' + trimmed.replace(/^###\s*/, '') + '</h4>';
      } else if (trimmed.startsWith('##')) {
        contentHtml += '<h3>' + trimmed.replace(/^##\s*/, '') + '</h3>';
      } else if (trimmed.startsWith('#')) {
        contentHtml += '<h2>' + trimmed.replace(/^#\s*/, '') + '</h2>';
      } else if (trimmed) {
        contentHtml += '<p>' + line + '</p>';
      }
    });

    docToWrite.open();
    docToWrite.write(
      '<html>' +
        '<head>' +
          '<title>' + article.title + '</title>' +
          '<style>' +
            'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; line-height: 1.6; padding: 40px; background: #ffffff; }' +
            '.header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }' +
            '.category { display: inline-block; background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: bold; text-transform: uppercase; padding: 4px 8px; border-radius: 4px; margin-bottom: 12px; }' +
            'h1 { font-size: 24px; color: #0f172a; margin: 0 0 10px 0; }' +
            '.meta { font-size: 12px; color: #64748b; }' +
            '.meta span { margin-right: 20px; }' +
            '.meta strong { color: #334155; }' +
            '.content { font-size: 14px; white-space: pre-wrap; }' +
            '.content h3 { font-size: 18px; color: #0f172a; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }' +
            '.content h4 { font-size: 16px; color: #1e293b; margin-top: 20px; }' +
            '.footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center; }' +
          '</style>' +
        '</head>' +
        '<body>' +
          '<div class="header">' +
            '<span class="category">' + article.category + '</span>' +
            '<h1>' + article.title + '</h1>' +
            '<div class="meta">' +
              '<span>Author: <strong>' + (article.author || 'Anonymous') + '</strong></span>' +
              '<span>Updated: <strong>' + (article.updatedAt ? new Date(article.updatedAt).toLocaleString() : 'N/A') + '</strong></span>' +
              '<span>Doc ID: <strong>' + article.id + '</strong></span>' +
            '</div>' +
          '</div>' +
          '<div class="content">' + contentHtml + '</div>' +
          '<div class="footer">' +
            'Kynren Technology Operations Security Protocol - Confidential Field Use Only. Printed on ' + new Date().toLocaleString() + '.' +
          '</div>' +
        '</body>' +
      '</html>'
    );
    docToWrite.close();

    // Wait a moment for rendering and then print
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 300);
  };
  
  // KB Form values
  const [kbFormTitle, setKbFormTitle] = useState('');
  const [kbFormCategory, setKbFormCategory] = useState('Network');
  const [kbFormContent, setKbFormContent] = useState('');
  const [kbFormTags, setKbFormTags] = useState<string[]>([]);
  const [kbFormTagInput, setKbFormTagInput] = useState('');
  const [kbFormAuthor, setKbFormAuthor] = useState('Seth Boa Amponsem');

  const [kbArticleToDelete, setKbArticleToDelete] = useState<KBArticle | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper to add tag in KB form
  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter' && (e as React.KeyboardEvent).key !== ',') {
      return;
    }
    e.preventDefault();
    const cleanTag = kbFormTagInput.trim().toLowerCase().replace(/#/g, '').replace(/,/g, '');
    if (cleanTag && !kbFormTags.includes(cleanTag)) {
      setKbFormTags([...kbFormTags, cleanTag]);
      setKbFormTagInput('');
    }
  };

  // Helper to remove tag in KB form
  const handleRemoveTag = (tagToRemove: string) => {
    setKbFormTags(kbFormTags.filter(t => t !== tagToRemove));
  };

  // Prepare form for drafting a new article
  const handleResetKbForm = () => {
    setKbFormTitle('');
    setKbFormCategory('Network');
    setKbFormContent('');
    setKbFormTags([]);
    setKbFormTagInput('');
    setKbFormAuthor('Seth Boa Amponsem');
    setKbFormDependencies([]);
    setKbEditingArticleId(null);
    setShowKbForm(true);
  };

  // Initialize edit form with existing article data
  const handleStartEditKBArticle = (art: KBArticle) => {
    setKbFormTitle(art.title);
    setKbFormCategory(art.category);
    setKbFormContent(art.content);
    setKbFormTags(art.tags);
    setKbFormTagInput('');
    setKbFormAuthor(art.author || 'Seth Boa Amponsem');
    setKbFormDependencies(art.dependencies || []);
    setKbEditingArticleId(art.id);
    setShowKbForm(true);
    setSelectedKbArticle(null); // close detail reader if open
  };

  // Form submit handler for creating/updating
  const handleCreateOrUpdateKBArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kbFormTitle.trim() || !kbFormContent.trim()) return;

    const dataset = isOfflineMode ? offlineCache : kbArticles;
    const matchedPrev = dataset.find(a => a.id === kbEditingArticleId);

    const payload: KBArticle = {
      id: kbEditingArticleId || `kb-${Date.now().toString().slice(-6)}`,
      title: kbFormTitle.trim(),
      category: kbFormCategory,
      content: kbFormContent.trim(),
      tags: kbFormTags,
      author: kbFormAuthor.trim(),
      updatedAt: new Date().toISOString(),
      dependencies: kbFormDependencies,
      helpfulCount: matchedPrev?.helpfulCount || 0,
      notHelpfulCount: matchedPrev?.notHelpfulCount || 0
    };

    try {
      if (!isOfflineMode) {
        if (kbEditingArticleId) {
          if (onUpdateKBArticle) {
            await onUpdateKBArticle(kbEditingArticleId, payload);
          } else {
            // fallback if parent handler is not ready
            await onAddKBArticle(payload);
          }
        } else {
          await onAddKBArticle(payload);
        }
      } else {
        // Save to offline cache
        const isNew = !kbEditingArticleId;
        let updated: KBArticle[] = [];
        if (isNew) {
          updated = [...offlineCache, payload];
        } else {
          updated = offlineCache.map(a => a.id === kbEditingArticleId ? payload : a);
        }
        setOfflineCache(updated);
        localStorage.setItem('kb_offline_cache', JSON.stringify(updated));
      }
      
      // Reset & close form
      setShowKbForm(false);
      setKbEditingArticleId(null);
      // If we were editing, open the updated article in detailed viewer
      if (kbEditingArticleId) {
        setSelectedKbArticle(payload);
      }
    } catch (err) {
      console.error("Error saving KB article:", err);
    }
  };

  // Delete article confirmation handler
  const handleDeleteKBArticleConfirm = async () => {
    if (!kbArticleToDelete) return;
    try {
      if (onDeleteKBArticle) {
        await onDeleteKBArticle(kbArticleToDelete.id);
      }
      if (selectedKbArticle?.id === kbArticleToDelete.id) {
        setSelectedKbArticle(null);
      }
      setKbArticleToDelete(null);
    } catch (err) {
      console.error("Error deleting KB article:", err);
    }
  };

  // Copy to clipboard utility
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  };

  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !startTime || !endTime) return;

    const matchedAsset = assets.find(a => a.id === selectedAssetId);
    if (!matchedAsset) return;

    onAddReservation({
      id: `res-${Date.now().toString().substring(8)}`,
      assetId: selectedAssetId,
      assetName: matchedAsset.name,
      reservedBy,
      startTime,
      endTime,
      status: 'pending'
    });

    setSelectedAssetId('');
    setStartTime('');
    setEndTime('');
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName || !projDesc) return;

    onAddProject({
      id: `prj-${Date.now().toString().substring(8)}`,
      name: projName,
      description: projDesc,
      status: 'todo',
      manager: projManager || 'Seth Boa Amponsem',
      dueDate: projDue || new Date().toISOString().substring(0, 10)
    });

    setProjName('');
    setProjDesc('');
    setShowProjectForm(false);
  };

  const handleSaveQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryName || !queryText) return;
    onSaveQuery(queryName, queryText);
    setQueryName('');
    setQueryText('');
  };

  const filteredKB = kbArticles.filter(art => {
    const matchesCategory = kbCategoryFilter === 'all' || art.category.toLowerCase() === kbCategoryFilter.toLowerCase();
    const query = kbSearch.toLowerCase();
    const matchesQuery = !query || 
      art.title.toLowerCase().includes(query) ||
      art.content.toLowerCase().includes(query) ||
      art.category.toLowerCase().includes(query) ||
      (art.tags && art.tags.some(t => t.toLowerCase().includes(query))) ||
      (art.author && art.author.toLowerCase().includes(query));
    return matchesCategory && matchesQuery;
  });

  return (
    <div id="operations-toolbox-panel" className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl p-5">
      
      {/* Tab Selectors */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4 mb-5">
        <div>
          <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
            <Wrench className="w-5 h-5 text-rose-500" /> Showground Operational Tools
          </h3>
          <p className="text-xs text-slate-400">Launch secondary support workflows including IT scheduling, knowledge base, reservations, and query bookmarking.</p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'projects' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderGit className="w-3.5 h-3.5 inline mr-1" /> IT Projects
          </button>
          <button
            onClick={() => setActiveTab('rss')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'rss' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="w-3.5 h-3.5 inline mr-1" /> Live RSS Feed
          </button>
          <button
            onClick={() => setActiveTab('kb')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'kb' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 inline mr-1" /> Knowledge Base
          </button>
          <button
            onClick={() => setActiveTab('reservations')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'reservations' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 inline mr-1" /> Asset Bookings
          </button>
          <button
            onClick={() => setActiveTab('queries')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'queries' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 inline mr-1" /> Saved Queries
          </button>
          <button
            onClick={() => setActiveTab('scheduling')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'scheduling' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 inline mr-1" /> Resource Scheduling
          </button>
        </div>
      </div>

      {/* IT Projects Kanban Board */}
      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-950 p-4 border border-slate-800 rounded-lg">
            <span className="text-xs text-slate-400 font-mono">Fiber expansions and network structuring roadmap board</span>
            <button
              onClick={() => setShowProjectForm(!showProjectForm)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg cursor-pointer uppercase"
            >
              <Plus className="w-3.5 h-3.5 inline mr-1" /> Slot IT Project
            </button>
          </div>

          {showProjectForm && (
            <form onSubmit={handleCreateProject} className="bg-slate-950 p-5 border border-slate-800 rounded-lg space-y-4">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">Draft IT Task Card</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1">Project Heading</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Backstage VLAN Routing"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                      value={projName}
                      onChange={(e) => setProjName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-mono mb-1">Lead Manager</label>
                      <input
                        type="text"
                        placeholder="Seth Boa Amponsem"
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                        value={projManager}
                        onChange={(e) => setProjManager(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-mono mb-1">Target Completion</label>
                      <input
                        type="date"
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                        value={projDue}
                        onChange={(e) => setProjDue(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">Detailed Technical Scope</label>
                  <textarea
                    required
                    placeholder="Provide instructions on hardware connections, trunk links, or required fiber loops..."
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none h-24"
                    value={projDesc}
                    onChange={(e) => setProjDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg cursor-pointer uppercase"
                >
                  Mount Project Card
                </button>
              </div>
            </form>
          )}

          {/* Kanban Board Columns */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(['todo', 'in_progress', 'review', 'done'] as const).map((column) => (
              <div key={column} className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col min-h-[300px]">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
                  <span className="text-xs font-bold uppercase text-slate-300 font-mono">
                    {column.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 border border-slate-800 rounded text-rose-400 font-bold">
                    {projects.filter(p => p.status === column).length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {projects.filter(p => p.status === column).map((p) => (
                    <div 
                      key={p.id} 
                      className="bg-slate-900 p-3.5 border border-slate-800/80 rounded-lg hover:border-slate-700 hover:bg-slate-900/40 transition-all space-y-3 cursor-pointer group"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('button')) return;
                        setSelectedProject(p);
                      }}
                    >
                      <div>
                        <h4 className="font-semibold text-slate-200 text-xs leading-tight">{p.name}</h4>
                        <p className="text-slate-400 text-[11px] leading-relaxed mt-1 line-clamp-3">{p.description}</p>
                      </div>

                      <div className="flex justify-between items-center border-t border-slate-950 pt-2 text-[10px] font-mono text-slate-500">
                        <span className="flex items-center gap-1 text-slate-300">
                          <User className="w-3 h-3 text-rose-400" /> {p.manager.split(' ')[0]}
                        </span>
                        <span>Due: {p.dueDate}</span>
                      </div>

                      {/* Moving Controls */}
                      <div className="flex justify-end gap-1 pt-1.5 border-t border-slate-950">
                        {column !== 'todo' && (
                          <button
                            onClick={() => onUpdateProjectStatus(p.id, column === 'in_progress' ? 'todo' : column === 'review' ? 'in_progress' : 'review')}
                            className="p-1 bg-slate-950 hover:bg-slate-800 rounded text-slate-400 hover:text-white font-mono text-[9px]"
                            title="Move back"
                          >
                            ◀
                          </button>
                        )}
                        {column !== 'done' && (
                          <button
                            onClick={() => onUpdateProjectStatus(p.id, column === 'todo' ? 'in_progress' : column === 'in_progress' ? 'review' : 'done')}
                            className="p-1 bg-slate-950 hover:bg-slate-800 rounded text-slate-400 hover:text-white font-mono text-[9px]"
                            title="Move forward"
                          >
                            ▶
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Details Modal Dialog */}
      {selectedProject && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl text-left">
            {/* Header */}
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-850 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-rose-400 font-bold bg-rose-950/20 px-2 py-0.5 rounded border border-rose-950/40">{selectedProject.id}</span>
                <span className="text-[10px] uppercase font-mono text-slate-500 font-bold">Project Dispatch Charter</span>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-1 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <h3 className="text-slate-100 font-bold text-base leading-snug">{selectedProject.name}</h3>
                <div className="flex items-center gap-2 pt-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
                    selectedProject.status === 'todo' ? 'bg-slate-800 text-slate-400' :
                    selectedProject.status === 'in_progress' ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-900' :
                    selectedProject.status === 'review' ? 'bg-amber-950/30 text-amber-400 border border-amber-900' :
                    'bg-emerald-950/30 text-emerald-400 border border-emerald-900'
                  }`}>
                    {selectedProject.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Due Date: {selectedProject.dueDate}</span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 border border-slate-850 rounded-lg space-y-2">
                <h4 className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-bold">Scope of Work & Objectives</h4>
                <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">{selectedProject.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-left">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block">Project Lead Manager</span>
                  <span className="font-bold text-rose-300 font-sans mt-0.5 block">{selectedProject.manager}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-left">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block">Due Date Deadline</span>
                  <span className="font-bold text-slate-200 font-mono mt-0.5 block">{selectedProject.dueDate}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-950 px-5 py-3 border-t border-slate-850 flex justify-end gap-2">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-mono font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RSS Feed Tab */}
      {activeTab === 'rss' && (
        <div className="space-y-4">
          <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">Live syslog announcements, cast alerts, and rehearsal weather warnings</span>
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
          </div>

          <div className="divide-y divide-slate-800 bg-slate-950 border border-slate-800 rounded-lg">
            {rssFeed.map((item) => (
              <div key={item.id} className="p-4 flex gap-4 items-start hover:bg-slate-900/20 transition-all">
                <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 border ${
                  item.type === 'weather' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  item.type === 'system' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                  'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {item.type}
                </span>

                <div className="space-y-1">
                  <h4 className="font-semibold text-slate-200 text-xs leading-snug">{item.title}</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">{item.content}</p>
                  <span className="text-[10px] text-slate-500 font-mono block">Published: {new Date(item.pubDate).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Base */}
      {activeTab === 'kb' && (
        <div className="space-y-6 font-sans">
          
          {/* Top Info Bar and Action Toggle */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950 p-4 border border-slate-800 rounded-xl">
            <div className="space-y-1 text-left">
              <span className="text-[10px] text-rose-400 font-mono font-bold uppercase tracking-wider block">Central Engineering Wiki</span>
              <h4 className="text-sm font-bold text-slate-100">Showground Operations Intelligence</h4>
              <p className="text-xs text-slate-400">Manage, query, and edit standard troubleshooting manuals, system configurations, and safety procedures.</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {!showKbForm && !selectedKbArticle && (
                <button
                  onClick={handleResetKbForm}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 uppercase tracking-wider shadow"
                >
                  <Plus className="w-4 h-4" />
                  Publish Protocol
                </button>
              )}
            </div>
          </div>

          {/* Signal, Cache and Mode HUD */}
          {!showKbForm && !selectedKbArticle && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 border border-slate-800 rounded-xl font-sans">
              
              {/* WAN IP & Network Status */}
              <div className="flex items-center gap-3 bg-slate-900/40 p-3 border border-slate-850 rounded-lg">
                <div className={`p-2 rounded-full ${isOfflineMode ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {isOfflineMode ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">WAN Network Client IP</span>
                  <span className="text-xs font-mono font-bold text-slate-100">{isOfflineMode ? 'Air-Gapped Simulation' : clientIp}</span>
                </div>
                <button
                  onClick={() => handleToggleOfflineMode(!isOfflineMode)}
                  className={`px-2 py-1 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${
                    isOfflineMode 
                      ? 'bg-red-650 text-white' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title="Simulate offline field connectivity"
                >
                  {isOfflineMode ? 'Offline' : 'Online'}
                </button>
              </div>

              {/* Local Storage Offline Cache */}
              <div className="flex items-center gap-3 bg-slate-900/40 p-3 border border-slate-850 rounded-lg">
                <div className="p-2 rounded-full bg-cyan-500/10 text-cyan-400">
                  <Database className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-[9px] font-mono text-slate-500 uppercase block">Offline Cache Database</span>
                  <span className="text-xs font-mono font-bold text-slate-100">{offlineCache.length} Articles Cached</span>
                </div>
                <button
                  disabled={isOfflineMode || isSyncing}
                  onClick={handleManualCacheSync}
                  className={`px-2 py-1 rounded text-[9px] font-mono font-bold uppercase transition-all flex items-center gap-1 ${
                    isOfflineMode 
                      ? 'bg-slate-900 text-slate-600 border border-slate-850 cursor-not-allowed' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer'
                  }`}
                  title="Manually synchronize client NVRAM database backup with cloud master"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Sync' : 'Sync'}
                </button>
              </div>

              {/* View Topology Mode Segmented Control */}
              <div className="flex items-center gap-2 bg-slate-900/40 p-3 border border-slate-850 rounded-lg justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-rose-500/10 text-rose-400">
                    <Network className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Wiki Structure Interface</span>
                    <span className="text-xs font-bold text-slate-200">{activeTabMode === 'browse' ? 'Manuals Grid' : 'Network Topology'}</span>
                  </div>
                </div>
                <div className="flex gap-1 bg-slate-950 p-0.5 border border-slate-850 rounded-md">
                  <button
                    onClick={() => setActiveTabMode('browse')}
                    className={`px-2.5 py-1 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${
                      activeTabMode === 'browse' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Browse
                  </button>
                  <button
                    onClick={() => setActiveTabMode('topology')}
                    className={`px-2.5 py-1 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${
                      activeTabMode === 'topology' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Map
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* KB Statistics Dashboard */}
          {!showKbForm && !selectedKbArticle && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg flex flex-col justify-between text-left">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Total Manuals</span>
                <span className="text-lg font-bold text-slate-100 font-mono mt-1">{currentKBDataset.length}</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg flex flex-col justify-between text-left">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Filtered Matches</span>
                <span className="text-lg font-bold text-rose-400 font-mono mt-1">{filteredKB.length}</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg flex flex-col justify-between text-left">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Top Category</span>
                <span className="text-xs font-bold text-slate-100 mt-1 truncate">
                  {(() => {
                    const categoryCounts: Record<string, number> = {};
                    currentKBDataset.forEach(a => { categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1; });
                    let topCat = 'N/A';
                    let maxVal = 0;
                    Object.entries(categoryCounts).forEach(([c, v]) => {
                      if (v > maxVal) { topCat = c; maxVal = v; }
                    });
                    return topCat === 'N/A' ? 'None' : `${topCat} (${maxVal})`;
                  })()}
                </span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg flex flex-col justify-between text-left">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Unique Tags</span>
                <span className="text-lg font-bold text-cyan-400 font-mono mt-1">
                  {new Set(currentKBDataset.flatMap(a => a.tags || [])).size}
                </span>
              </div>
            </div>
          )}

          {/* Create or Edit Article Form */}
          {showKbForm && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 animate-fade-in">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-rose-500" />
                  <h3 className="font-bold text-slate-100 text-xs uppercase tracking-wider">
                    {kbEditingArticleId ? 'Modify System Protocol Card' : 'Draft New Operations Protocol'}
                  </h3>
                </div>
                <button
                  onClick={() => { setShowKbForm(false); setKbEditingArticleId(null); }}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateOrUpdateKBArticleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase">Document Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lake Stage Fiber Ring Recovery Steps"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50"
                      value={kbFormTitle}
                      onChange={(e) => setKbFormTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase">System Category</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50"
                      value={kbFormCategory}
                      onChange={(e) => setKbFormCategory(e.target.value)}
                    >
                      <option value="Network">Network Architecture</option>
                      <option value="Power">Power & Grids</option>
                      <option value="Lighting">Stage Lighting</option>
                      <option value="Stage/Audio">Stage & Audio Systems</option>
                      <option value="Pyrotechnics">Pyrotechnics & FX</option>
                      <option value="Procedures">Procedures & Drills</option>
                      <option value="Security">Operational Security</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase">Lead Contributor / Author</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Seth Boa Amponsem"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50"
                      value={kbFormAuthor}
                      onChange={(e) => setKbFormAuthor(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase">
                      Tags / Keywords <span className="text-slate-500 font-sans font-normal">(Press Enter or Comma to add)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. fiber, backup, failover"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50"
                        value={kbFormTagInput}
                        onChange={(e) => setKbFormTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                      />
                      <button
                        type="button"
                        onClick={(e) => handleAddTag(e)}
                        className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono font-bold"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tags lists */}
                {kbFormTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900/50 border border-slate-800 rounded-lg">
                    {kbFormTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/30 px-2 py-0.5 rounded-full"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:bg-cyan-900/40 p-0.5 rounded text-cyan-500 hover:text-cyan-200 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Connections / Dependencies Selection */}
                <div className="text-left">
                  <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase">Related / Dependent Articles (Relational Topology Link)</label>
                  {currentKBDataset.length <= 1 ? (
                    <div className="text-[10px] text-slate-500 italic p-2 bg-slate-900 border border-slate-850 rounded-lg">
                      No other articles currently exist to link as dependencies.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-slate-900 border border-slate-850 rounded-lg">
                      {currentKBDataset.filter(a => a.id !== kbEditingArticleId).map(a => {
                        const isChecked = kbFormDependencies.includes(a.id);
                        return (
                          <label key={a.id} className="flex items-center gap-1.5 text-[10px] text-slate-300 bg-slate-950/40 px-2.5 py-1 border border-slate-800 rounded hover:border-slate-600 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setKbFormDependencies(kbFormDependencies.filter(id => id !== a.id));
                                } else {
                                  setKbFormDependencies([...kbFormDependencies, a.id]);
                                }
                              }}
                              className="rounded border-slate-800 text-rose-500 focus:ring-rose-500/30 w-3 h-3"
                            />
                            <span>{a.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Templates & Formatting Toolbar */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 border border-slate-850 p-2 rounded-lg">
                    {/* Template Loader */}
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Load SOP Template:</span>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const template = [
                            {
                              name: 'Network',
                              title: 'Core Switch Fiber Loop Recovery Protocol',
                              category: 'Network',
                              tags: ['network', 'fiber', 'failover', 'switch'],
                              content: '### SYSTEM SUMMARY\nThis manual details standard emergency loop restoration steps for the Showground Central Ring network fiber loop switches.\n\n### RECOVERY ACTIONS\n- Establish terminal console link via backup copper serial connection:\n```ssh operator@10.1.1.254 -p 2202```\n- Diagnose spanning tree loop status and active port state diagnostics:\n```show spanning-tree detail```\n- Isolate the faulty fiber transceiver interface by disabling it manually:\n```config t\ninterface fiber-0/1\nshutdown\nexit\nwrite memory```\n\n### DIAGNOSTIC SCHEMATIC GRAPH\n![Network Fiber Ring Map](https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=60)\n\n### VERIFICATION STEPS\nVerify latency parameters to ensure redundancy interfaces took over:\n```ping 10.1.0.1 -c 10```\nContact Lead NOC specialist for master route alignment check.'
                            },
                            {
                              name: 'Power',
                              title: 'Main Generator Phase Balance Rectification SOP',
                              category: 'Power',
                              tags: ['power', 'generator', 'grid', 'safety'],
                              content: '### PROTOCOL HAZARD ADVISORY\n**WARNING: High Voltage Operation.** Only certified technical electrical leads should perform physical mechanical breaker resets.\n\n### PROCEDURE ACTION CHECKLIST\n- Inspect main breaker status log panel via browser web ingress:\n```curl -u operator:pass http://10.20.1.5/status```\n- If phase imbalance registers > 15%, follow physical load shedding routines.\n- Balance phase loads across distribution nodes.\n\n### VIDEO OVERVIEW PROTOCOL\n@[Breaker Switch Panel Walkthrough](https://assets.mixkit.co/videos/preview/mixkit-mechanical-breaker-gears-moving-41614-large.mp4)'
                            },
                            {
                              name: 'Lighting',
                              title: 'DMX Lighting Node Reboot and Signal Rectification',
                              category: 'Lighting',
                              tags: ['lighting', 'dmx', 'fixtures', 'reboot'],
                              content: '### INCIDENT PATTERN\nFixture flicker across Lake Stage moving wash washheads indicates intermittent data line interference or bad DMX termination.\n\n### RESOLUTION PATHWAY\n- Ping lighting node controllers to verify signal reachability:\n```ping 10.12.5.1```\n- If unresponsive, issue remote hardware reset command:\n```ssh lights@10.12.5.1 "sudo /sbin/reboot"```\n- Ensure terminating 120-ohm resistor is plugged on final chain element.'
                            }
                          ].find(t => t.name === val);
                          if (template) {
                            setKbFormTitle(template.title);
                            setKbFormCategory(template.category);
                            setKbFormTags(template.tags);
                            setKbFormContent(template.content);
                          }
                          e.target.value = '';
                        }}
                        className="bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-mono rounded px-2 py-1 focus:outline-none"
                      >
                        <option value="">-- Select SOP Template --</option>
                        <option value="Network">Network Failover SOP</option>
                        <option value="Power">Electrical Phase Trip SOP</option>
                        <option value="Lighting">DMX Lighting Interference SOP</option>
                      </select>
                    </div>

                    {/* Editor View Options */}
                    <div className="flex bg-slate-950 p-0.5 border border-slate-800 rounded-md">
                      {(['edit', 'split', 'preview'] as const).map((view) => (
                        <button
                          key={view}
                          type="button"
                          onClick={() => setFormEditorView(view)}
                          className={`px-2 py-1 rounded text-[9px] font-mono font-bold uppercase transition-all cursor-pointer ${
                            formEditorView === view ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {view}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Formatting helper bar */}
                  <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-850 rounded-lg">
                    {[
                      { label: 'H1', before: '# ', after: '', desc: 'Header 1' },
                      { label: 'H3', before: '### ', after: '', desc: 'Header 3' },
                      { label: 'Bold', before: '**', after: '**', desc: 'Bold text' },
                      { label: 'Inline Code', before: '`', after: '`', desc: 'Code highlight' },
                      { label: 'Terminal Code Block', before: '```\n$', after: '\n```', desc: 'Command block' },
                      { label: 'Bullet List', before: '- ', after: '', desc: 'List element' },
                      { label: 'Embed Image Schematic', before: '![Fiber Network Loop Diagram](https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=60)', after: '', desc: 'Schematic' },
                      { label: 'Embed SOP Video', before: '@[Breaker Walkthrough Video](https://assets.mixkit.co/videos/preview/mixkit-mechanical-breaker-gears-moving-41614-large.mp4)', after: '', desc: 'Video guide' },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        type="button"
                        onClick={() => {
                          const textarea = document.getElementById('kb-form-content-area') as HTMLTextAreaElement;
                          if (!textarea) return;
                          const start = textarea.selectionStart;
                          const end = textarea.selectionEnd;
                          const originalText = kbFormContent;
                          const selectedText = originalText.substring(start, end);
                          const replacement = btn.before + selectedText + btn.after;
                          const newText = originalText.substring(0, start) + replacement + originalText.substring(end);
                          setKbFormContent(newText);
                          setTimeout(() => {
                            textarea.focus();
                            textarea.setSelectionRange(start + btn.before.length, start + btn.before.length + selectedText.length);
                          }, 50);
                        }}
                        className="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-850 text-[10px] text-slate-300 font-mono rounded hover:text-white cursor-pointer"
                        title={btn.desc}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Editor View: Dynamic Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Editor Box */}
                  {(formEditorView === 'edit' || formEditorView === 'split') && (
                    <div className="text-left">
                      <textarea
                        id="kb-form-content-area"
                        required
                        placeholder="Provide full technical instructions using Markdown style. Use buttons above or pre-fill a complete SOP Template to format custom commands, videos, and technical diagrams seamlessly."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500/50 h-[380px] font-mono leading-relaxed"
                        value={kbFormContent}
                        onChange={(e) => setKbFormContent(e.target.value)}
                      />
                    </div>
                  )}

                  {/* High Fidelity Live Preview Box */}
                  {(formEditorView === 'preview' || formEditorView === 'split') && (
                    <div className={`text-left bg-slate-950/60 border border-slate-850 rounded-lg p-4 h-[380px] overflow-y-auto space-y-3 ${
                      formEditorView === 'preview' ? 'col-span-2' : ''
                    }`}>
                      <div className="flex items-center gap-1.5 pb-2 border-b border-slate-900">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">High-Fidelity SOP Renderer Preview</span>
                      </div>
                      
                      {kbFormContent.trim() ? (
                        <div className="space-y-4 text-xs text-slate-300 leading-relaxed max-h-[320px] overflow-y-auto">
                          {/* Rich inline-parser split */}
                          {kbFormContent.split('\n').map((line, lineIdx) => {
                            const trimmed = line.trim();
                            
                            // Headers
                            if (trimmed.startsWith('###')) {
                              return <h5 key={lineIdx} className="text-sm font-bold text-slate-100 uppercase border-b border-slate-900 pb-1 mt-3 mb-1.5">{trimmed.replace(/^###\s*/, '')}</h5>;
                            }
                            if (trimmed.startsWith('##')) {
                              return <h4 key={lineIdx} className="text-base font-extrabold text-slate-100 border-b border-slate-900 pb-1 mt-4 mb-2">{trimmed.replace(/^##\s*/, '')}</h4>;
                            }
                            if (trimmed.startsWith('#')) {
                              return <h3 key={lineIdx} className="text-lg font-black text-rose-400 mt-5 mb-2.5">{trimmed.replace(/^#\s*/, '')}</h3>;
                            }

                            // Bullet Lists
                            if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                              return (
                                <ul key={lineIdx} className="list-disc list-inside pl-3 text-slate-300 space-y-1">
                                  <li>
                                    {/* Bold & Inline Code parser */}
                                    {trimmed.substring(1).trim().split(/`([^`]+)`/g).map((part, i) => {
                                      if (i % 2 === 1) return <code key={i} className="bg-slate-950 px-1 py-0.5 font-mono text-emerald-400 rounded text-[10px]">{part}</code>;
                                      return part;
                                    })}
                                  </li>
                                </ul>
                              );
                            }

                            // Block code
                            if (trimmed.startsWith('```') || trimmed.startsWith('$') || trimmed.startsWith('sudo') || trimmed.startsWith('ssh') || trimmed.startsWith('npm') || trimmed.startsWith('git') || trimmed.startsWith('docker')) {
                              const commandText = trimmed.startsWith('$') ? trimmed.substring(1).trim() : trimmed;
                              if (commandText === '```') return null;
                              return (
                                <div key={lineIdx} className="bg-slate-950 border border-slate-900 rounded-lg p-2.5 font-mono text-emerald-400 text-[10px] flex items-center justify-between gap-2">
                                  <span>$ {commandText}</span>
                                </div>
                              );
                            }

                            // Media image embed
                            const imgMatch = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
                            if (imgMatch) {
                              return (
                                <div key={lineIdx} className="my-3 bg-slate-950 border border-slate-900 p-1.5 rounded-lg text-center">
                                  <img src={imgMatch[2]} alt={imgMatch[1]} className="max-h-40 mx-auto object-contain rounded" referrerPolicy="no-referrer" />
                                  <span className="text-[8px] text-slate-500 font-mono mt-1 block italic">{imgMatch[1]}</span>
                                </div>
                              );
                            }

                            // Media video embed
                            const videoMatch = trimmed.match(/@\[(.*?)\]\((.*?)\)/);
                            if (videoMatch) {
                              return (
                                <div key={lineIdx} className="my-3 bg-slate-950 border border-slate-900 p-1.5 rounded-lg text-center">
                                  <div className="text-[8px] text-slate-500 font-mono mb-1">▶ {videoMatch[1]}</div>
                                  <div className="text-[10px] text-rose-400 truncate underline">{videoMatch[2]}</div>
                                </div>
                              );
                            }

                            if (!trimmed) return <div key={lineIdx} className="h-2" />;
                            return <p key={lineIdx} className="whitespace-pre-wrap">{line}</p>;
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-1.5">
                          <BookOpen className="w-6 h-6 animate-pulse text-slate-800" />
                          <p className="text-[10px] font-mono">Form content is empty. Write documentation to preview markup rendering.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowKbForm(false); setKbEditingArticleId(null); }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs font-bold rounded-lg cursor-pointer uppercase transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-mono text-xs font-bold rounded-lg cursor-pointer uppercase tracking-wider transition-all active:scale-95"
                  >
                    {kbEditingArticleId ? 'Save Protocol Changes' : 'Publish Protocol to Wiki'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Interactive Detailed Reader View */}
          {selectedKbArticle && !showKbForm && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-5 animate-fade-in font-sans">
                       {/* Reader Header / Actions */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setSelectedKbArticle(null)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Wiki List
                  </button>

                  {/* Sync Status Indicator */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/60 border border-slate-850 rounded-lg text-[10px] font-mono text-slate-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${isOfflineMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`} />
                    <span>{isOfflineMode ? 'Cached Offline' : 'Live Sync'}</span>
                    <span className="text-slate-700 text-[8px]">•</span>
                    <span>Synced: {lastSyncedTime}</span>
                  </div>

                  {/* Print to PDF Button */}
                  <button
                    onClick={() => handlePrintToPDF(selectedKbArticle)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Format and Print to PDF"
                  >
                    <Printer className="w-3.5 h-3.5 text-rose-400" />
                    Print to PDF
                  </button>
                  
                  {/* Hidden iframe for print target */}
                  <iframe ref={printIframeRef} className="hidden" style={{ display: 'none' }} title="Print Handler" />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartEditKBArticle(selectedKbArticle)}
                    className="p-2 bg-slate-900 hover:bg-slate-800 hover:text-rose-400 text-slate-400 rounded-lg transition-all cursor-pointer"
                    title="Edit Protocol"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setKbArticleToDelete(selectedKbArticle)}
                    className="p-2 bg-slate-900 hover:bg-slate-800 hover:text-red-500 text-slate-400 rounded-lg transition-all cursor-pointer"
                    title="Delete Protocol"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    {selectedKbArticle.category}
                  </span>
                  {selectedKbArticle.tags?.map((t) => (
                    <span key={t} className="text-[9px] text-cyan-400 bg-cyan-950/30 border border-cyan-800/20 px-2 py-0.5 rounded-full font-mono">
                      #{t}
                    </span>
                  ))}
                </div>

                <h2 className="text-lg font-bold text-slate-100 tracking-tight leading-snug">{selectedKbArticle.title}</h2>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-slate-400 font-mono">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Contributor: <strong className="text-slate-300">{selectedKbArticle.author || 'Anonymous'}</strong></span>
                  </div>
                  {selectedKbArticle.updatedAt && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Last Updated: <strong className="text-slate-300">{new Date(selectedKbArticle.updatedAt).toLocaleString()}</strong></span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Tags className="w-3.5 h-3.5 text-slate-500" />
                    <span>ID: <strong className="text-slate-300 font-mono">{selectedKbArticle.id}</strong></span>
                  </div>
                </div>
              </div>

              {/* Relational Connections & Dependencies (Relational Topology Links) */}
              {selectedKbArticle.dependencies && selectedKbArticle.dependencies.length > 0 && (
                <div className="bg-slate-900/40 p-3.5 rounded-lg border border-slate-850 space-y-2 text-left">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Relational Connections & Dependencies</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedKbArticle.dependencies.map(depId => {
                      const depArt = currentKBDataset.find(a => a.id === depId);
                      if (!depArt) return null;
                      return (
                        <button
                          key={depId}
                          onClick={() => setSelectedKbArticle(depArt)}
                          className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[10px] text-rose-400 hover:text-rose-300 font-mono rounded flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-rose-500" />
                          {depArt.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamic Rich Content Parser (Formats manual headers, codeblocks, images, and videos) */}
              <div className="bg-slate-900/30 border border-slate-900/60 p-5 rounded-xl space-y-4 text-xs text-slate-300 leading-relaxed font-sans max-h-[500px] overflow-y-auto text-left">
                {selectedKbArticle.content.split('\n').map((line, lineIdx) => {
                  const trimmed = line.trim();

                  // Headers
                  if (trimmed.startsWith('###')) {
                    return <h5 key={lineIdx} className="text-sm font-bold text-slate-100 uppercase border-b border-slate-800 pb-1 mt-4 mb-2">{trimmed.replace(/^###\s*/, '')}</h5>;
                  }
                  if (trimmed.startsWith('##')) {
                    return <h4 key={lineIdx} className="text-base font-extrabold text-slate-100 border-b border-slate-800 pb-1 mt-5 mb-2.5">{trimmed.replace(/^##\s*/, '')}</h4>;
                  }
                  if (trimmed.startsWith('#')) {
                    return <h3 key={lineIdx} className="text-lg font-black text-rose-400 mt-6 mb-3">{trimmed.replace(/^#\s*/, '')}</h3>;
                  }

                  // Bullet lists
                  if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                    return (
                      <ul key={lineIdx} className="list-disc list-inside pl-4 text-slate-300 space-y-1 my-1">
                        <li>
                          {trimmed.substring(1).trim().split(/`([^`]+)`/g).map((part, i) => {
                            if (i % 2 === 1) return <code key={i} className="bg-slate-950 px-1 py-0.5 font-mono text-emerald-400 rounded text-[10px]">{part}</code>;
                            return part;
                          })}
                        </li>
                      </ul>
                    );
                  }

                  // Check if it's a command block or terminal action line
                  if (trimmed.startsWith('```') || trimmed.startsWith('$') || trimmed.startsWith('sudo') || trimmed.startsWith('ssh') || trimmed.startsWith('npm') || trimmed.startsWith('git') || trimmed.startsWith('docker')) {
                    const commandText = trimmed.startsWith('$') ? trimmed.substring(1).trim() : (trimmed.startsWith('```') ? '' : trimmed);
                    if (!commandText || commandText === '```') return null;
                    const blockId = `cmd-${lineIdx}`;
                    const isCopied = copiedId === blockId;
                    return (
                      <div key={lineIdx} className="bg-slate-950 border border-slate-850 rounded-lg p-3 font-mono text-slate-200 flex items-center justify-between gap-4 shadow-inner my-2">
                        <span className="text-rose-400 mr-2 shrink-0 select-none">$</span>
                        <code className="flex-1 overflow-x-auto whitespace-pre pr-2 text-[11px] text-emerald-400 select-all">{commandText}</code>
                        <button
                          onClick={() => copyToClipboard(commandText, blockId)}
                          className={`p-1.5 rounded transition-all shrink-0 cursor-pointer ${
                            isCopied ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    );
                  }

                  // Embedded Image Schematic
                  const imgMatch = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
                  if (imgMatch) {
                    return (
                      <div key={lineIdx} className="my-4 bg-slate-950 border border-slate-850 p-2 rounded-lg text-center">
                        <img src={imgMatch[2]} alt={imgMatch[1]} className="max-h-60 mx-auto object-contain rounded" referrerPolicy="no-referrer" />
                        <span className="text-[9px] text-slate-500 font-mono mt-1.5 block italic">{imgMatch[1]}</span>
                      </div>
                    );
                  }

                  // Embedded SOP Video Guide
                  const videoMatch = trimmed.match(/@\[(.*?)\]\((.*?)\)/);
                  if (videoMatch) {
                    return (
                      <div key={lineIdx} className="my-4 bg-slate-950 border border-slate-850 p-3 rounded-lg text-center flex flex-col items-center justify-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <Video className="w-4 h-4 text-rose-500 animate-pulse" />
                          <span className="text-[10px] font-mono font-bold text-slate-300 uppercase">{videoMatch[1]}</span>
                        </div>
                        <div className="w-full max-w-lg aspect-video bg-slate-900 rounded-md border border-slate-800 flex items-center justify-center text-slate-500 text-[10px] font-mono relative overflow-hidden group">
                          {videoMatch[2].endsWith('.mp4') ? (
                            <video src={videoMatch[2]} controls className="w-full h-full object-cover" preload="metadata" />
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Globe className="w-8 h-8 text-slate-700 group-hover:text-rose-500 transition-colors" />
                              <span className="text-slate-400 text-center px-4">External Protocol Link: {videoMatch[2]}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Empty lines
                  if (!trimmed) return <div key={lineIdx} className="h-2" />;

                  // Standard paragraphs with inline backticks formatting helper
                  return (
                    <p key={lineIdx} className="whitespace-pre-wrap">
                      {line.split(/`([^`]+)`/g).map((part, i) => {
                        if (i % 2 === 1) return <code key={i} className="bg-slate-950 px-1 py-0.5 font-mono text-emerald-400 rounded text-[10px]">{part}</code>;
                        return part;
                      })}
                    </p>
                  );
                })}
              </div>

              {/* Helpful Rating Indicator and Copy Utility Row */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1 text-left">
                  <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">Feedback Rating</h5>
                  <p className="text-[10px] text-slate-400">Rate this protocol to help other engineering staff locate effective solutions.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  {/* Score percentage */}
                  {((selectedKbArticle.helpfulCount || 0) + (selectedKbArticle.notHelpfulCount || 0)) > 0 && (
                    <div className="text-left sm:text-right font-mono mr-1">
                      <span className="text-[9px] text-slate-500 block uppercase">Helpfulness Score</span>
                      <span className="text-xs font-bold text-emerald-400">
                        {Math.round((selectedKbArticle.helpfulCount || 0) / ((selectedKbArticle.helpfulCount || 0) + (selectedKbArticle.notHelpfulCount || 0)) * 100)}%
                      </span>
                      <span className="text-[8px] text-slate-500 block">({(selectedKbArticle.helpfulCount || 0) + (selectedKbArticle.notHelpfulCount || 0)} ratings)</span>
                    </div>
                  )}

                  <div className="flex gap-1 bg-slate-900 p-1 border border-slate-800 rounded-lg">
                    <button
                      onClick={() => handleVoteArticle(selectedKbArticle.id, 'helpful')}
                      className={`px-2.5 py-1.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        userVotes[selectedKbArticle.id] === 'helpful' 
                          ? 'bg-emerald-600 text-white' 
                          : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                      }`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span>{selectedKbArticle.helpfulCount || 0}</span>
                    </button>
                    <button
                      onClick={() => handleVoteArticle(selectedKbArticle.id, 'nothelpful')}
                      className={`px-2.5 py-1.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        userVotes[selectedKbArticle.id] === 'nothelpful' 
                          ? 'bg-red-650 text-white' 
                          : 'text-slate-400 hover:text-red-400 hover:bg-slate-800'
                      }`}
                    >
                      <ThumbsDown className="w-3 h-3" />
                      <span>{selectedKbArticle.notHelpfulCount || 0}</span>
                    </button>
                  </div>

                  <button
                    onClick={() => copyToClipboard(selectedKbArticle.content, 'full')}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-mono text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                  >
                    {copiedId === 'full' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy Raw
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Threaded Comments System */}
              <div className="border-t border-slate-900 pt-5 space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-rose-500" />
                    <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">Field Notes & Threaded Comments ({comments.length})</h4>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Real-time technician warnings & tips</span>
                </div>

                {/* Comment Posting Form */}
                <form onSubmit={(e) => handleAddComment(e)} className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Technician Identity:</span>
                    <select
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                      className="bg-slate-905 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 font-sans outline-none focus:border-rose-500/50"
                    >
                      <option value="Seth Boa Amponsem">Seth Boa Amponsem (Active Tech)</option>
                      <option value="Alice Smith">Alice Smith (Lead Stage Tech)</option>
                      <option value="Bob Jones">Bob Jones (Audio Engineer)</option>
                      <option value="Charlie Brown">Charlie Brown (Pyro Specialist)</option>
                      <option value="David White">David White (Lighting Lead)</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add an operational tip, edge-case warning, or question..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-rose-500/30 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!newCommentText.trim()}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Post
                    </button>
                  </div>
                </form>

                {/* Comments List */}
                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                  {comments.filter(c => !c.parentId).length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic py-4 text-center">No technician notes left on this protocol yet. Be the first to share an operational warning!</p>
                  ) : (
                    comments.filter(c => !c.parentId).map(parent => {
                      const replies = comments.filter(c => c.parentId === parent.id);
                      const isReplying = replyingToId === parent.id;

                      return (
                        <div key={parent.id} className="space-y-2 border-b border-slate-900/40 pb-3 last:border-0 last:pb-0">
                          {/* Parent Comment */}
                          <div className="bg-slate-900/40 p-3 border border-slate-900/60 rounded-xl space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                              <span className="font-bold text-slate-300">{parent.author}</span>
                              <span>{new Date(parent.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-slate-300 font-sans">{parent.text}</p>
                            <div className="flex justify-between items-center pt-1">
                              <button
                                onClick={() => {
                                  if (isReplying) {
                                    setReplyingToId(null);
                                    setReplyText('');
                                  } else {
                                    setReplyingToId(parent.id);
                                    setReplyText('');
                                  }
                                }}
                                className="text-[10px] text-rose-400 hover:text-rose-300 font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <MessageSquare className="w-3 h-3" />
                                {isReplying ? 'Cancel Reply' : `Reply (${replies.length})`}
                              </button>
                              {parent.author === commentAuthor && (
                                <button
                                  onClick={async () => {
                                    if (confirm("Delete this note permanently?")) {
                                      try {
                                        await deleteDoc(doc(db, 'kb_comments', parent.id));
                                        // Also delete child replies
                                        for (const rep of replies) {
                                          await deleteDoc(doc(db, 'kb_comments', rep.id));
                                        }
                                      } catch (err) {
                                        console.error("Failed to delete comment:", err);
                                      }
                                    }
                                  }}
                                  className="text-[9px] text-slate-600 hover:text-red-500 font-mono transition-colors cursor-pointer"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Replies */}
                          <div className="pl-6 space-y-2 border-l border-slate-800/60 ml-3.5">
                            {replies.map(reply => (
                              <div key={reply.id} className="bg-slate-950/40 p-2.5 border border-slate-900/40 rounded-lg space-y-1">
                                <div className="flex justify-between items-center text-[9px] font-mono text-slate-500">
                                  <div className="flex items-center gap-1">
                                    <CornerDownRight className="w-3 h-3 text-slate-600" />
                                    <span className="font-bold text-slate-400">{reply.author}</span>
                                  </div>
                                  <span>{new Date(reply.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-xs text-slate-300 pl-4 font-sans">{reply.text}</p>
                                {reply.author === commentAuthor && (
                                  <div className="text-right">
                                    <button
                                      onClick={async () => {
                                        if (confirm("Delete this reply permanently?")) {
                                          try {
                                            await deleteDoc(doc(db, 'kb_comments', reply.id));
                                          } catch (err) {
                                            console.error("Failed to delete reply:", err);
                                          }
                                        }
                                      }}
                                      className="text-[9px] text-slate-600 hover:text-red-500 font-mono transition-colors cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* Reply Form */}
                            {isReplying && (
                              <form onSubmit={(e) => handleAddComment(e, parent.id)} className="flex gap-2 animate-fade-in pt-1">
                                <input
                                  type="text"
                                  placeholder={`Reply to ${parent.author}...`}
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  className="flex-1 bg-slate-900 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-rose-500/30 transition-colors"
                                />
                                <button
                                  type="submit"
                                  disabled={!replyText.trim()}
                                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Send className="w-3 h-3" />
                                  Reply
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Delete Confirmation Alert Modal */}
          {kbArticleToDelete && (
            <div className="bg-red-950/40 border border-red-500/30 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-shake">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-4 h-4 animate-pulse" />
                  <h4 className="font-bold text-sm">Irreversible Wiki Deletion Protocol</h4>
                </div>
                <p className="text-xs text-slate-400">
                  Are you absolutely sure you want to delete <strong className="text-white">"{kbArticleToDelete.title}"</strong>? This will permanently erase it from the central cloud database schema.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setKbArticleToDelete(null)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-mono font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteKBArticleConfirm}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-mono font-bold cursor-pointer uppercase tracking-wider"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          )}
                  {/* Search, Filter Pills, and Matching Grid / Network Map */}
          {!showKbForm && !selectedKbArticle && (
            <div className="space-y-4">
              
              {/* Filter Row */}
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Search Bar */}
                <div className="flex-1 flex gap-2 bg-slate-950 p-3 border border-slate-800 rounded-lg focus-within:border-rose-500/30 transition-colors">
                  <Search className="w-4 h-4 text-slate-400 self-center" />
                  <input
                    type="text"
                    placeholder="Search titles, logs, codes, tags (e.g., #fiber) or authors..."
                    className="flex-1 bg-transparent text-slate-200 text-xs outline-none font-sans"
                    value={kbSearch}
                    onChange={(e) => setKbSearch(e.target.value)}
                  />
                  {kbSearch && (
                    <button onClick={() => setKbSearch('')} className="p-0.5 hover:bg-slate-800 rounded text-slate-400 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Category Pills Slider */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-950/40 p-1 rounded-lg border border-slate-850 overflow-x-auto justify-start">
                  {[
                    { id: 'all', label: 'All Manuals' },
                    { id: 'Network', label: 'Network' },
                    { id: 'Power', label: 'Power' },
                    { id: 'Lighting', label: 'Lighting' },
                    { id: 'Stage/Audio', label: 'Audio' },
                    { id: 'Pyrotechnics', label: 'Pyro' },
                    { id: 'Procedures', label: 'Procedures' },
                    { id: 'Security', label: 'Security' },
                  ].map((cat) => {
                    const count = cat.id === 'all' 
                      ? currentKBDataset.length 
                      : currentKBDataset.filter(a => a.category.toLowerCase() === cat.id.toLowerCase()).length;
                    
                    const isSelected = kbCategoryFilter === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setKbCategoryFilter(cat.id)}
                        className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                          isSelected 
                            ? 'bg-rose-600 text-white' 
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                        }`}
                      >
                        {cat.label}
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-sans ${
                          isSelected ? 'bg-rose-700 text-rose-100' : 'bg-slate-900 text-slate-500'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recently Viewed Guides Section */}
              {recentlyViewedIds.length > 0 && !kbSearch && (
                <div className="bg-slate-950/20 p-3.5 border border-slate-850/60 rounded-xl space-y-2 animate-fade-in text-left">
                  <div className="flex items-center gap-1.5 pb-1.5 border-b border-slate-900/60">
                    <Clock className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-[10px] font-mono font-bold text-slate-200 uppercase tracking-wider">Recently Viewed Guides</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentlyViewedIds.map(id => {
                      const article = currentKBDataset.find(a => a.id === id);
                      if (!article) return null;
                      return (
                        <button
                          key={id}
                          onClick={() => setSelectedKbArticle(article)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-750 rounded-lg text-xs text-slate-300 hover:text-rose-400 transition-all cursor-pointer font-sans"
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCategoryColor(article.category) }} />
                          <span className="font-medium truncate max-w-[150px]">{article.title}</span>
                          <span className="text-[8px] font-mono text-slate-500 uppercase">{article.category}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Proactive Semantic Suggested Matches Panel */}
              {assistantRecommendations.length > 0 && !kbSearch && (
                <div className="bg-slate-950/40 p-3.5 border border-slate-850 rounded-xl space-y-2.5 text-left animate-fade-in">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-900/60">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                      <span className="text-[10px] font-mono font-bold text-slate-200 uppercase tracking-wider">Semantic Suggested Matches (Assistant Context)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] text-slate-500 font-mono">Conversation history matched concepts</span>
                      <button
                        onClick={() => {
                          const active = !useAssistantContext;
                          setUseAssistantContext(active);
                          if (active) {
                            const bestKeyword = assistantRecommendations[0]?.matchedTerms[0] || '';
                            setKbSearch(bestKeyword);
                          } else {
                            setKbSearch('');
                          }
                        }}
                        className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                          useAssistantContext ? 'bg-rose-600 text-white shadow' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {useAssistantContext ? 'Filter Applied' : 'Auto Filter'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {assistantRecommendations.map(({ article, score, matchedTerms }) => (
                      <div
                        key={article.id}
                        onClick={() => setSelectedKbArticle(article)}
                        className="p-3 bg-slate-950 hover:bg-slate-900/80 border border-slate-850 hover:border-slate-700 rounded-lg cursor-pointer transition-all flex flex-col justify-between group"
                      >
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] font-mono text-rose-400 uppercase bg-rose-950/20 px-1.5 py-0.2 rounded border border-rose-950/40">{article.category}</span>
                            <span className="text-[8px] font-mono text-slate-500">{score}pt match</span>
                          </div>
                          <h5 className="text-[11px] font-semibold text-slate-200 line-clamp-1 group-hover:text-rose-400 transition-colors">{article.title}</h5>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[8px] font-mono border-t border-slate-900/60 pt-1.5">
                          <span className="text-slate-500 truncate max-w-[100px]">Query: {matchedTerms.join(', ')}</span>
                          <span className="text-rose-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-bold">Read →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Switchable Display Mode */}
              {activeTabMode === 'topology' ? (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 min-h-[500px] flex flex-col justify-between animate-fade-in">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-900 text-left">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-1.5">
                        <Network className="w-4 h-4 text-rose-500" />
                        Relational Topology Network Map
                      </h4>
                      <p className="text-[10px] text-slate-400">Force-directed layout mapping articles based on categories, tags, and custom dependency links. Hover nodes to view connections, zoom or drag to explore, double-click a node to read.</p>
                    </div>
                    <div className="text-[8px] text-slate-400 font-mono flex items-center gap-2 bg-slate-900 px-2.5 py-1.5 border border-slate-850 rounded">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Selected</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Category Match</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Other Nodes</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 bg-slate-950/40 rounded-lg overflow-hidden relative border border-slate-900 mt-2 min-h-[420px]">
                    <KBTopologyGraph
                      articles={filteredKB}
                      activeArticleId={selectedKbArticle?.id || undefined}
                      onSelectArticle={(id) => {
                        const found = currentKBDataset.find(a => a.id === id);
                        if (found) setSelectedKbArticle(found);
                      }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {filteredKB.length === 0 ? (
                    <div className="bg-slate-950/30 border border-slate-800 rounded-xl p-10 text-center space-y-3">
                      <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                      <div className="space-y-1">
                        <h5 className="text-slate-200 font-bold text-xs uppercase tracking-wider">No matching protocols in repository</h5>
                        <p className="text-slate-400 text-xs max-w-md mx-auto">No knowledge base articles match your keyword query or category filter. Try clearing your filters or create a new wiki card.</p>
                      </div>
                      <div className="pt-2 flex justify-center gap-2">
                        {(kbSearch || kbCategoryFilter !== 'all') && (
                          <button
                            onClick={() => { setKbSearch(''); setKbCategoryFilter('all'); }}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono font-bold rounded cursor-pointer"
                          >
                            Reset Filters
                          </button>
                        )}
                        <button
                          onClick={handleResetKbForm}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold rounded flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Publish New Protocol
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredKB.map((art) => (
                        <div
                          key={art.id}
                          onClick={() => setSelectedKbArticle(art)}
                          className="bg-slate-950 p-4 border border-slate-850 hover:border-slate-700 rounded-xl space-y-3 group cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-slate-950/40 flex flex-col justify-between text-left"
                        >
                          <div className="space-y-2">
                            {/* Card Header */}
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-bold text-slate-100 text-xs leading-snug group-hover:text-rose-400 transition-colors line-clamp-2">
                                {art.title}
                              </h4>
                              <div className="flex items-center gap-1 shrink-0">
                                {/* Rating score badge on browse card */}
                                {(() => {
                                  const h = art.helpfulCount || 0;
                                  const n = art.notHelpfulCount || 0;
                                  if (h + n > 0) {
                                    const pct = Math.round(h / (h + n) * 100);
                                    return (
                                      <div className="flex items-center gap-0.5 text-[8px] text-emerald-400 bg-emerald-950/10 border border-emerald-500/10 px-1 rounded font-mono" title={`${h} helpful, ${n} not helpful`}>
                                        <ThumbsUp className="w-2 h-2" />
                                        <span>{pct}%</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                                <span className="text-[9px] text-rose-400 font-mono font-bold uppercase bg-rose-950/20 border border-rose-500/10 px-2 py-0.5 rounded">
                                  {art.category}
                                </span>
                              </div>
                            </div>

                            {/* Card Content Snippet */}
                            <p className="text-slate-400 text-xs leading-relaxed line-clamp-3 font-sans h-12 overflow-hidden">
                              {art.content.replace(/[#*`!\[\]@()]/g, '')}
                            </p>
                          </div>

                          {/* Card Footer / Metadata / Tags */}
                          <div className="space-y-2.5 pt-3 border-t border-slate-900">
                            {/* Tags list */}
                            {art.tags && art.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {art.tags.slice(0, 3).map((t, idx) => (
                                  <span key={idx} className="text-[9px] text-cyan-400 bg-cyan-950/20 border border-cyan-800/10 px-2 py-0.5 rounded-full font-mono">
                                    #{t}
                                  </span>
                                ))}
                                {art.tags.length > 3 && (
                                  <span className="text-[9px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded font-mono">
                                    +{art.tags.length - 3} more
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                              <span className="truncate max-w-[120px]">By: <strong className="text-slate-400">{art.author || 'Anonymous'}</strong></span>
                              <div className="flex items-center gap-1">
                                {art.dependencies && art.dependencies.length > 0 && (
                                  <span className="text-[8px] text-rose-400 font-mono bg-rose-950/10 px-1 rounded border border-rose-900/10 mr-1.5">
                                    🔗 {art.dependencies.length} connections
                                  </span>
                                )}
                                <span>{art.updatedAt ? new Date(art.updatedAt).toLocaleDateString() : 'Historical'}</span>
                              </div>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

            </div>
          )}

        </div>
      )}

      {/* Asset Reservations */}
      {activeTab === 'reservations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Reservation Booking Form */}
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 h-fit">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 pb-2 border-b border-slate-800">
              Book Showground Resource
            </h4>
            <form onSubmit={handleCreateReservation} className="space-y-3.5">
              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">Select Hardware Device</label>
                <select
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                >
                  <option value="">Choose item...</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">Reservation Lead Engineer</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  value={reservedBy}
                  onChange={(e) => setReservedBy(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">Start DateTime</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">End DateTime</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded transition-all cursor-pointer uppercase"
              >
                File Reservation Proposal
              </button>
            </form>
          </div>

          {/* Active Bookings Calendar List */}
          <div className="lg:col-span-2 bg-slate-950 p-4 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-300 font-bold uppercase tracking-wider block mb-4 border-b border-slate-800 pb-2">Active Calendar Bookings</span>
            <div className="space-y-3">
              {reservations.map((res) => (
                <div key={res.id} className="p-3 bg-slate-900/50 border border-slate-850 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">{res.assetName}</h5>
                    <p className="text-[10px] text-rose-300 font-mono mt-0.5">Reserved by: {res.reservedBy}</p>
                    <div className="flex gap-4 text-[10px] text-slate-500 font-mono mt-1">
                      <span>Start: {new Date(res.startTime).toLocaleString()}</span>
                      <span>End: {new Date(res.endTime).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-mono border ${
                      res.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      res.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {res.status}
                    </span>

                    {res.status === 'pending' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => onUpdateReservation(res.id, { status: 'approved' })}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-mono font-bold rounded cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onUpdateReservation(res.id, { status: 'rejected' })}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-mono font-bold rounded cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bookmarked Saved Queries */}
      {activeTab === 'queries' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
              Bookmark Custom App Search Filter
            </h4>
            <form onSubmit={handleSaveQuerySubmit} className="space-y-3.5">
              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">Bookmark Name / Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Offline Audio Devices"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  value={queryName}
                  onChange={(e) => setQueryName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">Query Search Text</label>
                <input
                  type="text"
                  required
                  placeholder="status:offline category:Audio"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded transition-all cursor-pointer uppercase"
              >
                Save Query Shortcut
              </button>
            </form>
          </div>

          <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg space-y-3">
            <span className="text-xs text-slate-300 font-bold uppercase tracking-wider block border-b border-slate-800 pb-2">Your Bookmarks</span>
            <div className="space-y-2">
              {savedQueries.map((q) => (
                <button
                  key={q.id}
                  onClick={() => onTriggerSavedQuery(q.queryText)}
                  className="w-full p-3 bg-slate-900 hover:bg-rose-500/5 border border-slate-850 hover:border-rose-500/30 rounded-lg text-left transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div>
                    <h5 className="text-xs font-semibold text-slate-200 group-hover:text-rose-400">{q.name}</h5>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{q.queryText}</p>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 group-hover:text-rose-400">Trigger Filter →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Resource Scheduling Tab Panel */}
      {activeTab === 'scheduling' && (
        <div className="space-y-5">
          {/* Header Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950 p-4 border border-slate-800 rounded-lg">
            <div>
              <h4 className="text-xs font-bold font-mono text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-500 animate-pulse" /> Dispatch & Allocation Grid
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Visual block-based technician shifts and hardware reservation coordinator. <strong className="text-slate-200">Drag & drop</strong> blocks horizontally or vertically to reschedule instantly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowScheduleForm(!showScheduleForm)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg cursor-pointer uppercase flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> {showScheduleForm ? 'Close Scheduler' : 'Schedule Block'}
            </button>
          </div>

          {/* Quick Schedule Form */}
          {showScheduleForm && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-4 animate-fadeIn">
              <span className="text-xs text-slate-200 font-bold uppercase tracking-wider block border-b border-slate-800 pb-2">
                Allocate Resource Time-Block
              </span>
              <form onSubmit={handleAddScheduleTask} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">Task Title / Operation</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Test DMX Fixture Loops"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">Target Resource</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                  >
                    <optgroup label="Crews & Technicians">
                      {TECHNICIANS.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.role})</option>
                      ))}
                    </optgroup>
                    <optgroup label="Reservable Hardware">
                      {EQUIPMENTS.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">Pre-allocated Time-Slot</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                    value={newTaskTimeSlot}
                    onChange={(e) => setNewTaskTimeSlot(e.target.value)}
                  >
                    {TIME_SLOTS.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] text-slate-400 font-mono mb-1">Accent Color</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                      value={newTaskColor}
                      onChange={(e) => setNewTaskColor(e.target.value)}
                    >
                      <option value="indigo">Indigo (Standard)</option>
                      <option value="cyan">Cyan (Audio)</option>
                      <option value="rose">Rose (Pyrotechnic)</option>
                      <option value="emerald">Emerald (Hardware)</option>
                      <option value="amber">Amber (Warning/Checks)</option>
                      <option value="purple">Purple (Lighting)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="h-9 px-4 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded cursor-pointer uppercase flex items-center justify-center transition-all"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Block-based Scheduler Grid */}
          <div className="overflow-x-auto border border-slate-800 rounded-lg shadow-inner">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800">
                  <th className="p-3 text-[10px] font-mono uppercase text-slate-400 w-48 border-r border-slate-800">Resource / Crew</th>
                  {TIME_SLOTS.map(slot => (
                    <th key={slot} className="p-3 text-[10px] font-mono uppercase text-slate-400 text-center border-r border-slate-850 last:border-0">{slot}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-slate-900/50 border-b border-slate-800">
                  <td colSpan={TIME_SLOTS.length + 1} className="p-2 pl-3 text-[10px] font-bold tracking-wider text-rose-500 uppercase bg-slate-950/40">Technicians & Crews</td>
                </tr>
                {TECHNICIANS.map(tech => (
                  <tr key={tech.id} className="border-b border-slate-800/60 hover:bg-slate-900/30 transition-colors">
                    <td className="p-3 border-r border-slate-800 bg-slate-900/10">
                      <div className="font-semibold text-xs text-slate-200">{tech.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tech.role}</div>
                    </td>
                    {TIME_SLOTS.map(slot => {
                      const slotTask = scheduleTasks.find(t => t.assigneeId === tech.id && t.timeSlot === slot);
                      return (
                        <td 
                          key={slot} 
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDropOnSlot(e, tech.id, slot)}
                          className="p-2 text-center border-r border-slate-850 bg-slate-950/5 min-h-[75px] relative hover:bg-slate-950/20 transition-all"
                        >
                          {slotTask ? (
                            <div
                              draggable
                              onDragStart={(e) => handleDragStartTask(e, slotTask.id)}
                              onClick={(e) => {
                                const target = e.target as HTMLElement;
                                if (target.closest('button')) return;
                                setSelectedTaskDetail(slotTask);
                              }}
                              className={`p-2.5 rounded border text-left cursor-pointer transition-all select-none group/card shadow-sm hover:shadow-md ${
                                slotTask.color === 'indigo' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' :
                                slotTask.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' :
                                slotTask.color === 'rose' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' :
                                slotTask.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
                                slotTask.color === 'amber' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' :
                                slotTask.color === 'purple' ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' :
                                'bg-slate-800 border-slate-700 text-slate-300'
                              }`}
                            >
                              <div className="text-[11px] font-bold leading-tight line-clamp-2">{slotTask.title}</div>
                              <div className="text-[9px] font-mono opacity-85 mt-2 flex items-center justify-between">
                                <span className="text-[8px] bg-black/40 px-1 py-0.5 rounded uppercase tracking-wide">● Shift</span>
                                <button
                                  type="button"
                                  onClick={() => setScheduleTasks(prev => prev.filter(t => t.id !== slotTask.id))}
                                  className="text-rose-400 hover:text-rose-350 ml-1.5 focus:outline-none font-bold text-xs"
                                  title="Remove Block"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setNewTaskAssignee(tech.id);
                                setNewTaskTimeSlot(slot);
                                setShowScheduleForm(true);
                              }}
                              className="w-full h-12 border border-dashed border-slate-850 hover:border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-600 hover:text-slate-400 transition-all text-[11px] group cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all mb-0.5" />
                              <span className="group-hover:hidden text-[9px] font-mono tracking-wider">Empty</span>
                              <span className="hidden group-hover:inline text-[8px] font-mono tracking-wider">Add Block</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                <tr className="bg-slate-900/50 border-b border-slate-800">
                  <td colSpan={TIME_SLOTS.length + 1} className="p-2 pl-3 text-[10px] font-bold tracking-wider text-rose-500 uppercase bg-slate-950/40">Hardware & Equipment Reservations</td>
                </tr>
                {EQUIPMENTS.map(equip => (
                  <tr key={equip.id} className="border-b border-slate-800/60 hover:bg-slate-900/30 transition-colors">
                    <td className="p-3 border-r border-slate-800 bg-slate-900/10">
                      <div className="font-semibold text-xs text-slate-200">{equip.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{equip.role}</div>
                    </td>
                    {TIME_SLOTS.map(slot => {
                      const slotTask = scheduleTasks.find(t => t.assigneeId === equip.id && t.timeSlot === slot);
                      return (
                        <td 
                          key={slot} 
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDropOnSlot(e, equip.id, slot)}
                          className="p-2 text-center border-r border-slate-850 bg-slate-950/5 min-h-[75px] relative hover:bg-slate-950/20 transition-all"
                        >
                          {slotTask ? (
                            <div
                              draggable
                              onDragStart={(e) => handleDragStartTask(e, slotTask.id)}
                              onClick={(e) => {
                                const target = e.target as HTMLElement;
                                if (target.closest('button')) return;
                                setSelectedTaskDetail(slotTask);
                              }}
                              className={`p-2.5 rounded border text-left cursor-pointer transition-all select-none group/card shadow-sm hover:shadow-md ${
                                slotTask.color === 'indigo' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' :
                                slotTask.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' :
                                slotTask.color === 'rose' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' :
                                slotTask.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
                                slotTask.color === 'amber' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' :
                                slotTask.color === 'purple' ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' :
                                'bg-slate-800 border-slate-700 text-slate-300'
                              }`}
                            >
                              <div className="text-[11px] font-bold leading-tight line-clamp-2">{slotTask.title}</div>
                              <div className="text-[9px] font-mono opacity-85 mt-2 flex items-center justify-between">
                                <span className="text-[8px] bg-black/40 px-1 py-0.5 rounded uppercase tracking-wide">⎋ Reserve</span>
                                <button
                                  type="button"
                                  onClick={() => setScheduleTasks(prev => prev.filter(t => t.id !== slotTask.id))}
                                  className="text-rose-400 hover:text-rose-355 ml-1.5 focus:outline-none font-bold text-xs"
                                  title="Remove Reservation"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setNewTaskAssignee(equip.id);
                                setNewTaskTimeSlot(slot);
                                setShowScheduleForm(true);
                              }}
                              className="w-full h-12 border border-dashed border-slate-850 hover:border-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-600 hover:text-slate-400 transition-all text-[11px] group cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all mb-0.5" />
                              <span className="group-hover:hidden text-[9px] font-mono tracking-wider">Empty</span>
                              <span className="hidden group-hover:inline text-[8px] font-mono tracking-wider">Reserve</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visual Scheduling Block Details Dialog */}
      {selectedTaskDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md overflow-hidden shadow-2xl text-left">
            {/* Header */}
            <div className="bg-slate-950 px-5 py-4 border-b border-slate-850 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-rose-400 font-bold bg-rose-950/20 px-2 py-0.5 rounded border border-rose-950/40">{selectedTaskDetail.id}</span>
                <span className="text-[10px] uppercase font-mono text-slate-500 font-bold">Shift Allocation Record</span>
              </div>
              <button
                onClick={() => setSelectedTaskDetail(null)}
                className="p-1 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono text-rose-400 font-bold">Allocated Objective</span>
                <h3 className="text-slate-100 font-bold text-sm leading-snug">{selectedTaskDetail.title}</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-left">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block">Assigned Resource</span>
                  <span className="font-bold text-slate-200 font-sans mt-0.5 block">
                    {TECHNICIANS.find(t => t.id === selectedTaskDetail.assigneeId)?.name || 
                     EQUIPMENTS.find(e => e.id === selectedTaskDetail.assigneeId)?.name || 
                     selectedTaskDetail.assigneeId}
                  </span>
                  <span className="text-[8px] text-slate-400 font-mono mt-0.5 block">
                    {TECHNICIANS.find(t => t.id === selectedTaskDetail.assigneeId)?.role || 
                     EQUIPMENTS.find(e => e.id === selectedTaskDetail.assigneeId)?.role || 
                     'Hardware Class'}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-left">
                  <span className="text-[9px] text-slate-500 font-mono uppercase block">Allocated Time Slot</span>
                  <span className="font-bold text-rose-300 font-mono mt-0.5 block">{selectedTaskDetail.timeSlot}</span>
                </div>
              </div>

              <div className="bg-slate-950/40 p-3 border border-slate-850 rounded-lg text-left text-xs space-y-1">
                <h5 className="text-[9px] text-slate-400 uppercase font-mono font-bold tracking-wider">Field Safety & Protocol Guidelines</h5>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  All tech shifts and hardware reservations must respect on-site RF parameters and safety setbacks. Maintain direct contact with dispatch via primary talkback lines.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-950 px-5 py-3 border-t border-slate-850 flex justify-end gap-2">
              <button
                onClick={() => setSelectedTaskDetail(null)}
                className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-mono font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
