export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  headerColor: string; // Hex color code or Tailwind color string
  bodyColor: string;   // Hex color code or Tailwind color string
  sidebarColor: string; // Hex color code or Tailwind color string
  headerPosition: 'top' | 'left';
  clientIp: string;
  displayName: string;
  profileImage: string;
  systemAdminPassword?: string;
  autoArchivePolicyEnabled?: boolean;
  archiveAgeDays?: number;
  latencyThreshold?: number;
  packetLossThreshold?: number;
  latencyNotificationEnabled?: boolean;
  packetLossNotificationEnabled?: boolean;
  audioNotificationsEnabled?: boolean;
  widgetOrder?: string[];
  pinnedWidgets?: string[];
  hiddenWidgets?: string[];
  deviceName?: string;
  subnetMask?: string;
  defaultGateway?: string;
  maxLatencyThreshold?: number;
  autoRetry?: boolean;
}

export interface Asset {
  id: string;
  name: string;
  category: string; // 'Projector' | 'Switch' | 'Radio' | 'DMX' | 'Speaker' | 'Pyrotechnics'
  status: string;
  serialNumber: string;
  assignedTo: string; // User ID or display name
  coordinates: { x: number; y: number }; // Relative percentage coordinates [0, 100] for map-based layout
  ipAddress: string;
  lastSeen: string;
  isHighValue?: boolean;
  tags?: string[];
  batteryLevel?: number;
  registrationDate?: string;
  
  // New requested fields
  assetTag?: string;
  featuredImage?: string; // Data URL or URL string
  galleryImages?: string[]; // Array of Data URLs or URL strings
  location?: string;
  network?: string;
  comments?: string;
  technicianInCharge?: string;
  groupInCharge?: string;
  manufacturer?: string;
  model?: string;
  group?: string;
  deviceType?: string;
  isBatteryPowered?: boolean;
  emergencyRecharge?: boolean;
  batteryChangeHistory?: Array<{
    date: string;
    technicianName: string;
    batterySerialNumber: string;
  }>;
}

export interface DropdownOption {
  id: string;
  category: string;
  options: string[];
}

export interface StockLog {
  id: string;
  timestamp: string;
  action: 'add' | 'update' | 'issue' | 'approve' | 'reject';
  quantityChanged: number;
  finalQuantity: number;
  performedBy: string;
  issuedTo?: string;
  location?: string;
  notes?: string;
}

export interface PendingIssue {
  id: string;
  timestamp: string;
  quantityToIssue: number;
  issuedTo: string;
  location: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Consumable {
  id: string;
  name: string;
  category: string; // 'Cables' | 'Tape' | 'Batteries' | 'Fuses' | 'Lamp Bulbs'
  quantity: number;
  threshold: number;
  unit: string; // 'rolls' | 'pcs' | 'units'
  status: 'adequate' | 'low' | 'out';
  lastIssued?: string;
  lastIssuedTo?: string;
  lastIssuedLocation?: string;
  needsApproval?: boolean;
  logs?: StockLog[];
  pendingIssues?: PendingIssue[];
}

export interface Ticket {
  id: string;
  name: string;
  description: string;
  category: 'Hardware' | 'Network' | 'Power' | 'Lighting' | 'Audio' | 'Special Effects';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string; // User ID or Name
  createdBy: string;
  createdAt: string;
  assetId?: string; // Associated asset for location tracking and diagnostics
  changeManagement?: {
    required: boolean;
    rfcForm?: string;
    approvedBy?: string;
    approvedDate?: string;
  };
}

export interface SignalLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  source: string;
  message: string;
  user?: string;
}

export interface SwitchDevice {
  id: string;
  name: string;
  ip: string;
  status: 'online' | 'offline' | 'degraded';
  latency: number; // in ms
  rackId: string;
  rackPosition: number; // Unit (U) position, e.g., 10 (out of 42)
  ports: {
    portNo: number;
    status: 'connected' | 'empty';
    speed: string; // '10G' | '1G' | '100M'
    connectedTo?: string; // Device ID or description
  }[];
}

export interface TopologyNode {
  id: string;
  name: string;
  type: 'core_switch' | 'dist_switch' | 'edge_switch' | 'hardware' | 'gateway';
  ip: string;
  status: 'online' | 'offline' | 'degraded';
  connectedTo: string[]; // List of other Node IDs
  vlan: string; // e.g. 'VLAN 10'
  subnet: string; // e.g. '10.12.10.0/24'
  latency?: number;
  mac?: string;
  vendor?: string;
  ttl?: number;
  packetLoss?: number;
  lastSeen?: string;
  tags?: string[];
}

export interface ITProject {
  id: string;
  name: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  manager: string;
  dueDate: string;
}

export interface RSSFeedItem {
  id: string;
  title: string;
  content: string;
  pubDate: string;
  type: 'system' | 'weather' | 'announcement' | 'show';
}

export interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  updatedAt?: string;
  author?: string;
  helpfulCount?: number;
  notHelpfulCount?: number;
  dependencies?: string[]; // IDs of related articles
}

export interface SavedQuery {
  id: string;
  name: string;
  queryText: string;
  createdAt: string;
}

export interface AssetReservation {
  id: string;
  assetId: string;
  assetName: string;
  reservedBy: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
}

export interface UserRegistryItem {
  id: string;
  uid?: string;
  displayName: string;
  email: string;
  role: 'Admin' | 'Observer' | 'Self Service' | 'Super Admin' | 'Operator' | 'Technician';
  profileImage: string;
  clientIp: string;
  status: 'online' | 'offline';
  coordinates?: { x: number; y: number }; // Last reported coordinates for auto-assignment & dispatch
  
  // New rich user attributes
  login?: string;
  firstName?: string;
  lastName?: string;
  active?: 'Yes' | 'No';
  jobTitle?: string;
  emails?: string[];
  validFrom?: string;
  validUntil?: string;
  phoneNumber?: string;
  cellPhone?: string;
  extension3CX?: string;
  comment?: string;
  password?: string;
  isOTP?: boolean;
  suspended?: boolean;
  archived?: boolean;
}

export interface AssignmentRule {
  id: string;
  trigger: string; // 'category' | 'priority' | 'source'
  value: string; // e.g. 'Network'
  assignToUserId: string;
  assignToUserName: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string; // 'all' or specific user
  content: string; // Can represent 'encrypted message'
  isEncrypted: boolean;
  timestamp: string;
}

export interface ShowTimelineEvent {
  id: string;
  title: string;
  type: 'show' | 'rehearsal' | 'maintenance';
  description: string;
  startTime: string; // "YYYY-MM-DD HH:MM" format or ISO
  endTime: string;
  location: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

export interface PasswordRecord {
  id: string;
  title: string;
  category: string;
  username: string;
  encryptedPassword: string; // exactly 128 chars hex hash code
  notes: string;
  createdAt: string;
}

export interface AssetDeployment {
  id: string;
  assetId: string;
  assetName: string;
  category: string;
  timestamp: string;
  status: 'active' | 'maintenance' | 'offline';
  location: string;
}

export interface GeofenceBreach {
  id: string;
  assetId: string;
  assetName: string;
  category: string;
  coordinates: { x: number; y: number };
  timestamp: string;
  severity: 'warning' | 'critical';
  message: string;
}

export interface KBComment {
  id: string;
  articleId: string;
  author: string;
  text: string;
  createdAt: string;
  parentId?: string; // for threading (replying to a specific comment)
}

