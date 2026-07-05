import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
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
  onSnapshot,
  where
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  uploadString, 
  getDownloadURL 
} from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "myarcher-fa8ce",
  appId: "1:348390449741:web:4b53ad29e1bbe75789f204",
  apiKey: "AIzaSyCpU12W3KcoVDA0BuNssF29qfHUgQxop7c",
  authDomain: "myarcher-fa8ce.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-a5518484-caa0-456c-bdf9-5380a85a83bc",
  storageBucket: "myarcher-fa8ce.firebasestorage.app",
  messagingSenderId: "348390449741",
  measurementId: ""
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const storage = getStorage(app);
const auth = getAuth(app);

export { 
  db, 
  storage,
  auth,
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
  onSnapshot,
  where,
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL
};
