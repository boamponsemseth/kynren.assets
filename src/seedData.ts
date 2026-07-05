import { 
  Asset, 
  Consumable, 
  Ticket, 
  SignalLog, 
  SwitchDevice, 
  TopologyNode, 
  ITProject, 
  RSSFeedItem, 
  KBArticle, 
  AssignmentRule,
  DirectMessage,
  AssetReservation,
  SavedQuery,
  UserPreferences
} from './types';

export const initialAssets: Asset[] = [];
export const initialConsumables: Consumable[] = [];
export const initialTickets: Ticket[] = [];
export const initialSignalLogs: SignalLog[] = [];
export const initialSwitchDevices: SwitchDevice[] = [];
export const initialTopologyNodes: TopologyNode[] = [];
export const initialITProjects: ITProject[] = [];
export const initialRSSFeedItems: RSSFeedItem[] = [];
export const initialKBArticles: KBArticle[] = [];
export const initialAssignmentRules: AssignmentRule[] = [];
export const initialSavedQueries: SavedQuery[] = [];
export const initialAssetReservations: AssetReservation[] = [];
export const initialDirectMessages: DirectMessage[] = [];

export const initialUserPreferences: UserPreferences = {
  theme: 'dark',
  headerColor: '#151921',
  bodyColor: '#0B0E14',
  sidebarColor: '#111827',
  headerPosition: 'top',
  clientIp: '127.0.0.1',
  displayName: 'User',
  profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'
};
