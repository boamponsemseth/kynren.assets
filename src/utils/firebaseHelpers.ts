import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  limit,
  where
} from '../firebase';
import { 
  initialAssets, 
  initialConsumables, 
  initialTickets, 
  initialSignalLogs, 
  initialSwitchDevices, 
  initialTopologyNodes, 
  initialITProjects, 
  initialRSSFeedItems, 
  initialKBArticles, 
  initialAssignmentRules, 
  initialSavedQueries, 
  initialAssetReservations, 
  initialDirectMessages, 
  initialUserPreferences 
} from '../seedData';
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
  UserRegistryItem, 
  AssignmentRule,
  DirectMessage,
  AssetReservation,
  UserPreferences,
  SavedQuery
} from '../types';

// Seed database with initial datasets if not present
export async function seedDatabaseIfEmpty() {
  // Seeding has been disabled per user request. No mock/simulated data will be auto-generated.
  console.log('Seeding is disabled. Firestore remains pristine.');
}

// ---------------------------------------------------------------------
// Generic Helper CRUD Functions wrapped in Firestore so they match Firebase Integration Skill
// ---------------------------------------------------------------------

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function fetchCollection<T>(colName: string): Promise<T[]> {
  try {
    const snap = await getDocs(collection(db, colName));
    return snap.docs.map(d => ({ id: d.id, ...d.data() })) as T[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colName);
    return [];
  }
}

export async function saveDocument<T>(colName: string, id: string, data: any): Promise<void> {
  try {
    await setDoc(doc(db, colName, id), data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${colName}/${id}`);
  }
}

export async function createDocument<T>(colName: string, data: any): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, colName), data);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, colName);
    return '';
  }
}

export async function removeDocument(colName: string, id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, colName, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${colName}/${id}`);
  }
}

export async function fetchUserPreferences(userId: string): Promise<UserPreferences | null> {
  try {
    const d = await getDoc(doc(db, 'user_preferences', userId));
    return d.exists() ? d.data() as UserPreferences : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `user_preferences/${userId}`);
    return null;
  }
}

