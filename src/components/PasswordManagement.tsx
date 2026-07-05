import React, { useState } from 'react';
import { PasswordRecord, UserPreferences } from '../types';
import { encryptPassword, decryptPassword } from '../utils/crypto';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Unlock, 
  Key, 
  Eye, 
  EyeOff, 
  Trash2, 
  Plus, 
  Search, 
  ShieldCheck, 
  Copy, 
  Check, 
  Database,
  Activity,
  X,
  AlertCircle
} from 'lucide-react';

interface PasswordManagementProps {
  passwords: PasswordRecord[];
  preferences: UserPreferences;
  onAddPassword: (pwd: Partial<PasswordRecord>) => Promise<void>;
  onDeletePassword: (id: string) => Promise<void>;
}

export default function PasswordManagement({
  passwords,
  preferences,
  onAddPassword,
  onDeletePassword
}: PasswordManagementProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Password reveal states
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [showNewPlainPassword, setShowNewPlainPassword] = useState(false);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // New Credential Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Network');
  const [newUsername, setNewUsername] = useState('');
  const [newPlainPassword, setNewPlainPassword] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password decryption map to temporarily show individual password values
  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [passwordToDelete, setPasswordToDelete] = useState<PasswordRecord | null>(null);

  // Decrypting animation popup state
  const [decryptingRecord, setDecryptingRecord] = useState<PasswordRecord | null>(null);
  const [decryptingText, setDecryptingText] = useState('');
  const [decryptingLog, setDecryptingLog] = useState<string[]>([]);
  const [isDecryptComplete, setIsDecryptComplete] = useState(false);

  // Track timestamps for revealed passwords to drive the 1-minute auto-expiry countdowns
  const [revealTimestamps, setRevealTimestamps] = useState<Record<string, number>>({});
  const [ticker, setTicker] = useState(0);

  // Re-encrypting animation popup state
  const [encryptingRecord, setEncryptingRecord] = useState<PasswordRecord | null>(null);
  const [encryptingText, setEncryptingText] = useState('');
  const [encryptingLog, setEncryptingLog] = useState<string[]>([]);
  const [isEncryptComplete, setIsEncryptComplete] = useState(false);

  // The active admin password stored in system settings (default to becareful if not customized)
  const systemAdminPassword = preferences.systemAdminPassword || 'becareful';

  // Real-time ticking state for updating the countdown UI text every second
  React.useEffect(() => {
    if (Object.keys(revealTimestamps).length === 0) return;
    const interval = setInterval(() => {
      setTicker(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [revealTimestamps]);

  // Monitor auto-expiry countdowns and trigger re-encryption popup when 1-minute passes
  React.useEffect(() => {
    const activeIds = Object.keys(revealTimestamps);
    if (activeIds.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const updatedTimestamps = { ...revealTimestamps };
      const updatedDecrypted = { ...decryptedPasswords };
      let changed = false;

      activeIds.forEach(id => {
        const elapsed = now - revealTimestamps[id];
        if (elapsed >= 60000) { // 1 minute
          delete updatedTimestamps[id];
          delete updatedDecrypted[id];
          changed = true;

          const record = passwords.find(p => p.id === id);
          if (record) {
            setEncryptingRecord(record);
            setDecryptingRecord(null);
          }
        }
      });

      if (changed) {
        setRevealTimestamps(updatedTimestamps);
        setDecryptedPasswords(updatedDecrypted);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [revealTimestamps, decryptedPasswords, passwords]);

  // Re-encryption animation logic
  React.useEffect(() => {
    if (!encryptingRecord) {
      setEncryptingText('');
      setEncryptingLog([]);
      setIsEncryptComplete(false);
      return;
    }

    // Hide decryption popup when password encryption is shown
    setDecryptingRecord(null);

    const targetCipher = encryptingRecord.encryptedPassword;
    let progress = 0;
    const totalSteps = 15;

    const logsList = [
      'De-allocating memory blocks...',
      'Re-padding plain-text payload...',
      'Executing AES-256 block encapsulation...',
      'Wiping administrator master token from volatile registry...',
      'SUCCESS: Cryptographic block sealed.'
    ];

    const logInterval = setInterval(() => {
      const stepIdx = Math.floor((progress / totalSteps) * logsList.length);
      setEncryptingLog(() => {
        const nextLog = logsList.slice(0, stepIdx + 1);
        return nextLog;
      });
    }, 120);

    const charPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}|:<>?';

    const interval = setInterval(() => {
      progress++;
      if (progress >= totalSteps) {
        clearInterval(interval);
        clearInterval(logInterval);
        setEncryptingText(targetCipher);
        setIsEncryptComplete(true);
        setEncryptingLog(logsList);
        
        // Remove from decrypted passwords just in case
        setDecryptedPasswords(prev => {
          const updated = { ...prev };
          delete updated[encryptingRecord.id];
          return updated;
        });
      } else {
        const cipherToLock = Math.floor((progress / totalSteps) * targetCipher.length);
        let displayStr = '';
        for (let i = 0; i < targetCipher.length; i++) {
          if (i < cipherToLock) {
            displayStr += targetCipher[i];
          } else {
            displayStr += charPool[Math.floor(Math.random() * charPool.length)];
          }
        }
        setEncryptingText(displayStr);
      }
    }, 80);

    return () => {
      clearInterval(interval);
      clearInterval(logInterval);
    };
  }, [encryptingRecord, systemAdminPassword]);

  React.useEffect(() => {
    if (!decryptingRecord) {
      setDecryptingText('');
      setDecryptingLog([]);
      setIsDecryptComplete(false);
      return;
    }

    const targetPassword = decryptPassword(decryptingRecord.encryptedPassword, systemAdminPassword) || 'UNKNOWN_ERR';
    let progress = 0;
    const totalSteps = 15; // 15 frames of animation
    
    // Add logs step-by-step
    const logsList = [
      'Establishing TLS secure handshake...',
      'Injecting administrator master token...',
      'Executing SHA-256 block extraction...',
      'De-padding cryptographic payload...',
      'SUCCESS: Plaintext stream decrypted.'
    ];
    
    const logInterval = setInterval(() => {
      const stepIdx = Math.floor((progress / totalSteps) * logsList.length);
      setDecryptingLog(() => {
        const nextLog = logsList.slice(0, stepIdx + 1);
        return nextLog;
      });
    }, 120);

    const charPool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}|:<>?';
    
    const interval = setInterval(() => {
      progress++;
      if (progress >= totalSteps) {
        clearInterval(interval);
        clearInterval(logInterval);
        setDecryptingText(targetPassword);
        setIsDecryptComplete(true);
        setDecryptingLog(logsList);
        
        // Also add to the main decrypted list so they can see it in the main table too
        setDecryptedPasswords(prev => ({
          ...prev,
          [decryptingRecord.id]: targetPassword
        }));

        // Record the reveal timestamp for the 1-minute countdown
        setRevealTimestamps(prev => ({
          ...prev,
          [decryptingRecord.id]: Date.now()
        }));
      } else {
        // Generate random letters of the target length, but lock in some of them based on progress
        const lockedChars = Math.floor((progress / totalSteps) * targetPassword.length);
        let displayStr = '';
        for (let i = 0; i < targetPassword.length; i++) {
          if (i < lockedChars) {
            displayStr += targetPassword[i];
          } else {
            displayStr += charPool[Math.floor(Math.random() * charPool.length)];
          }
        }
        setDecryptingText(displayStr);
      }
    }, 80);

    return () => {
      clearInterval(interval);
      clearInterval(logInterval);
    };
  }, [decryptingRecord, systemAdminPassword]);

  const handleVerifyAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminInput === systemAdminPassword) {
      setIsAuthorized(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Access Denied. Incorrect System Admin Password.');
    }
  };

  const handleAddCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newUsername || !newPlainPassword) return;

    setIsSubmitting(true);
    try {
      // 1. Encrypt the password using the System Admin Password, generating exactly 128 characters of hex data
      const encryptedHash = encryptPassword(newPlainPassword, systemAdminPassword);
      
      const newRecord: Partial<PasswordRecord> = {
        id: `pwd-${Date.now()}`,
        title: newTitle,
        category: newCategory,
        username: newUsername,
        encryptedPassword: encryptedHash,
        notes: newNotes || 'No notes provided.',
        createdAt: new Date().toISOString()
      };

      await onAddPassword(newRecord);
      
      // Reset Form
      setNewTitle('');
      setNewUsername('');
      setNewPlainPassword('');
      setNewNotes('');
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding credential:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleReveal = (record: PasswordRecord) => {
    if (decryptedPasswords[record.id]) {
      // Hide
      const updated = { ...decryptedPasswords };
      delete updated[record.id];
      setDecryptedPasswords(updated);

      const updatedTimestamps = { ...revealTimestamps };
      delete updatedTimestamps[record.id];
      setRevealTimestamps(updatedTimestamps);
    } else {
      // Decrypt using our cryptographic helper and admin password
      const decrypted = decryptPassword(record.encryptedPassword, systemAdminPassword);
      if (decrypted !== null) {
        setDecryptedPasswords({
          ...decryptedPasswords,
          [record.id]: decrypted
        });
        setRevealTimestamps({
          ...revealTimestamps,
          [record.id]: Date.now()
        });
      } else {
        alert('Decryption failed! The System Admin Password may have changed or the storage is corrupt.');
      }
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLockVault = () => {
    setIsAuthorized(false);
    setAdminInput('');
    setDecryptedPasswords({});
    setRevealTimestamps({});
  };

  // Filter passwords
  const filteredPasswords = passwords.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', 'Network', 'Audio', 'Lighting', 'Special Effects', 'Server', 'Hardware'];

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl animate-fade-in">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center text-rose-500 animate-pulse">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-slate-100 text-lg">Infrastructure Password Vault</h3>
            <p className="text-xs text-slate-400 mt-1">
              Technical Ops credentials are secure under 128-bit block padding encryption. Enter the System Admin Password to proceed.
            </p>
          </div>
        </div>

        <form onSubmit={handleVerifyAdmin} className="mt-6 space-y-4">
          <div>
            <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">System Admin Password</label>
            <div className="relative">
              <input
                type={showAdminInput ? "text" : "password"}
                required
                placeholder="••••••••"
                value={adminInput}
                onChange={(e) => setAdminInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded pl-3 pr-10 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowAdminInput(!showAdminInput)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
              >
                {showAdminInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2.5 text-xs text-red-400 font-sans">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg transition-all cursor-pointer uppercase flex items-center justify-center gap-2 shadow-lg hover:shadow-rose-500/25"
          >
            <Unlock className="w-4 h-4" /> Authenticate & Open
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-[10px] text-slate-500 font-mono">
          <span>DEFAULT CREDENTIAL: </span>
          <span className="text-rose-400/80">admin123</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl p-5 animate-fade-in space-y-6">
      
      {/* Authorized Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
              <Key className="w-5 h-5 text-emerald-400" /> Infrastructure Password Management
            </h3>
            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider animate-pulse flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Vault Unlocked
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Store, generate, and monitor hardware and switch console credentials. All values are stored as exact 128-character encrypted hex hashes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold rounded-lg transition-all cursor-pointer uppercase flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Credential
          </button>
          <button
            onClick={handleLockVault}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer uppercase flex items-center gap-1.5"
          >
            <Lock className="w-4 h-4" /> Lock Vault
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Search credentials by system, username, notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none"
          />
        </div>
        <div className="flex gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer uppercase shrink-0 ${
                selectedCategory === cat 
                  ? 'bg-rose-600 text-white' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Vault List */}
      <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-lg">
        {filteredPasswords.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">
            No secure credentials found matching the search criteria.
          </div>
        ) : (
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px] font-mono uppercase bg-slate-900/50">
                <th className="p-4 w-1/4">System & Title</th>
                <th className="p-4 w-1/6">Category</th>
                <th className="p-4 w-1/6">Username</th>
                <th className="p-4 w-1/3">128-Char Hex Hash / Plaintext</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPasswords.map(p => {
                const isRevealed = !!decryptedPasswords[p.id];
                const displayedValue = isRevealed ? decryptedPasswords[p.id] : p.encryptedPassword;
                
                // Countdown calculation
                let countdownText = '';
                if (isRevealed && revealTimestamps[p.id]) {
                  const elapsed = Date.now() - revealTimestamps[p.id];
                  const remainingSecs = Math.max(0, Math.ceil((60000 - elapsed) / 1000));
                  countdownText = `Auto-locking in ${remainingSecs}s`;
                }
                
                return (
                  <tr key={p.id} className="hover:bg-slate-900/30 transition-colors">
                    {/* System & Title */}
                    <td className="p-4">
                      <div className="font-semibold text-slate-200 text-xs">{p.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 max-w-xs truncate" title={p.notes}>
                        {p.notes}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="p-4">
                      <span className="text-[9px] font-mono bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase">
                        {p.category}
                      </span>
                    </td>

                    {/* Username */}
                    <td className="p-4">
                      <span className="font-mono text-xs text-slate-300 bg-slate-950/80 px-2 py-1 rounded border border-white/5">
                        {p.username}
                      </span>
                    </td>

                    {/* Encrypted Hash / Plaintext value */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-900 rounded p-1.5 max-w-sm">
                          <div className={`font-mono text-[10px] break-all leading-normal flex-1 select-all ${
                            isRevealed ? 'text-emerald-400 font-bold' : 'text-slate-500 truncate'
                          }`}>
                            {isRevealed ? displayedValue : `${displayedValue.substring(0, 20)}...${displayedValue.substring(108)}`}
                          </div>
                          
                          <div className="flex gap-1 shrink-0">
                            {/* Reveal Button */}
                            <button
                              onClick={() => {
                                if (isRevealed) {
                                  handleToggleReveal(p);
                                } else {
                                  setDecryptingRecord(p);
                                }
                              }}
                              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded transition-colors"
                              title={isRevealed ? 'Mask Password' : 'Decrypt Password'}
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            
                            {/* Copy Button */}
                            <button
                              onClick={() => handleCopyText(displayedValue, p.id)}
                              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded transition-colors relative"
                              title={isRevealed ? 'Copy Decrypted Plaintext' : 'Copy 128-Char Hash'}
                            >
                              {copiedId === p.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        {countdownText && (
                          <div className="text-[9px] font-mono text-amber-500/90 flex items-center gap-1 pl-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            {countdownText}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setPasswordToDelete(p)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 rounded transition-all cursor-pointer"
                        title="Delete credential"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Verification footer indicator */}
      <div className="flex justify-between items-center bg-slate-950 p-3 border border-slate-800 rounded-lg font-mono text-[9px] text-slate-500 uppercase">
        <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-emerald-500" /> AES-padded block size verification: 64 bytes (128 hex chars)</span>
        <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> Decryption Key verified</span>
      </div>

      {/* Add Credential Modal Dialog */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h4 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-sm uppercase tracking-wide">
                <Key className="w-4 h-4 text-emerald-400" /> Add Secure Credential
              </h4>
              <button 
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCredential} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">System / Host Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Main Stage Projector Switch"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="Network">Network</option>
                    <option value="Audio">Audio</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Special Effects">Special Effects</option>
                    <option value="Server">Server</option>
                    <option value="Hardware">Hardware</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">Username</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., sys_operator"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">Plaintext Password</label>
                <div className="relative">
                  <input
                    type={showNewPlainPassword ? "text" : "password"}
                    required
                    placeholder="Password (will be encrypted instantly)"
                    value={newPlainPassword}
                    onChange={(e) => setNewPlainPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded pl-2.5 pr-10 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPlainPassword(!showNewPlainPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
                  >
                    {showNewPlainPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1 uppercase tracking-wider">Operational Notes</label>
                <textarea
                  placeholder="e.g. Backstage console access rules or default rack location info..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold rounded uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold rounded uppercase cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Encrypting...' : 'Encrypt & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {passwordToDelete && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500 border-b border-slate-800 pb-3">
              <AlertCircle className="w-6 h-6 shrink-0 text-red-500" />
              <h4 className="font-sans font-bold text-slate-100 text-base">Confirm Credential Deletion</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete the secure credentials for <span className="font-semibold text-rose-400">{passwordToDelete.title}</span> (User: <span className="font-mono text-[10px] text-slate-400">{passwordToDelete.username}</span>)? 
              This will permanently erase these encrypted records from the infrastructure database.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setPasswordToDelete(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all font-mono"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onDeletePassword(passwordToDelete.id);
                  setPasswordToDelete(null);
                }}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all uppercase font-mono"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decrypting Animation Modal */}
      <AnimatePresence>
        {decryptingRecord && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-slate-950 border border-emerald-500/40 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.15)] overflow-hidden p-6 font-mono"
            >
              <div className="flex justify-between items-center border-b border-emerald-950 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                  <h3 className="text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    CRYPTOGRAPHIC KEY DECRYPTION ACTIVE
                  </h3>
                </div>
                <button 
                  onClick={() => setDecryptingRecord(null)}
                  className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 font-mono text-xs">
                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900/50 p-3 rounded border border-slate-900 text-[10px] text-slate-400">
                  <div>
                    <span className="text-slate-600">ID CODE:</span> {decryptingRecord.id}
                  </div>
                  <div>
                    <span className="text-slate-600">SYSTEM:</span> {decryptingRecord.title}
                  </div>
                  <div>
                    <span className="text-slate-600">OPERATOR:</span> {preferences.displayName || 'Seth Boa Amponsem'}
                  </div>
                  <div>
                    <span className="text-slate-600">ALGORITHM:</span> AES-128-BLOCK-PADDING
                  </div>
                </div>

                {/* Console Output */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-36 overflow-y-auto text-[10px] text-slate-300 leading-normal space-y-1 scrollbar-thin">
                  {decryptingLog.map((logLine, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-slate-600">[{idx + 1}]</span>
                      <span className={logLine.startsWith('SUCCESS') ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                        {logLine}
                      </span>
                    </div>
                  ))}
                  {!isDecryptComplete && (
                    <div className="text-emerald-500/80 animate-pulse font-bold">
                      ● CYCLING ENTROPY COEFFICIENTS...
                    </div>
                  )}
                </div>

                {/* Cipher Text Visualizer */}
                <div className="bg-slate-900/40 p-4 border border-emerald-500/10 rounded-lg text-center space-y-2">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    {isDecryptComplete ? 'DECRYPTED VAULT PAYLOAD' : 'CIPHERTEXT PAYLOAD RECONSTRUCTION'}
                  </div>
                  <div className={`text-xl font-bold tracking-widest break-all py-1.5 font-mono transition-all duration-300 ${
                    isDecryptComplete ? 'text-emerald-400 bg-emerald-950/20 rounded border border-emerald-900/20' : 'text-amber-500 animate-pulse'
                  }`}>
                    {decryptingText}
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setDecryptingRecord(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-xs text-slate-400 hover:text-white transition-all cursor-pointer font-bold"
                  >
                    Close
                  </button>
                  {isDecryptComplete && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(decryptingText);
                        alert('Decrypted password copied to clipboard.');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs transition-all cursor-pointer font-bold flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Plaintext
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Encrypting Animation Modal */}
      <AnimatePresence>
        {encryptingRecord && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-slate-950 border border-rose-500/40 rounded-xl shadow-[0_0_30px_rgba(244,63,94,0.15)] overflow-hidden p-6 font-mono"
            >
              <div className="flex justify-between items-center border-b border-rose-950 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping shrink-0" />
                  <h3 className="text-rose-400 font-bold text-xs uppercase tracking-wider">
                    CRYPTOGRAPHIC KEY ENCRYPTION (RE-SECURING) ACTIVE
                  </h3>
                </div>
                <button 
                  onClick={() => setEncryptingRecord(null)}
                  className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 font-mono text-xs">
                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900/50 p-3 rounded border border-slate-900 text-[10px] text-slate-400">
                  <div>
                    <span className="text-slate-600">ID CODE:</span> {encryptingRecord.id}
                  </div>
                  <div>
                    <span className="text-slate-600">SYSTEM:</span> {encryptingRecord.title}
                  </div>
                  <div>
                    <span className="text-slate-600">OPERATOR:</span> {preferences.displayName || 'Seth Boa Amponsem'}
                  </div>
                  <div>
                    <span className="text-slate-600">ALGORITHM:</span> AES-256-BLOCK-PADDING
                  </div>
                </div>

                {/* Console Output */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-36 overflow-y-auto text-[10px] text-slate-300 leading-normal space-y-1 scrollbar-thin">
                  {encryptingLog.map((logLine, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-slate-600">[{idx + 1}]</span>
                      <span className={logLine.startsWith('SUCCESS') ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {logLine}
                      </span>
                    </div>
                  ))}
                  {!isEncryptComplete && (
                    <div className="text-rose-500/80 animate-pulse font-bold">
                      ● RE-CALCULATING CHAOTIC ENTROPY BLOCK...
                    </div>
                  )}
                </div>

                {/* Cipher Text Visualizer */}
                <div className="bg-slate-900/40 p-4 border border-rose-500/10 rounded-lg text-center space-y-2">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    {isEncryptComplete ? 'SECURE PAYLOAD ENCRYPTED' : 'PLAIN-TEXT CIPHER SCRAMBLING'}
                  </div>
                  <div className={`text-xs font-bold tracking-widest break-all py-1.5 font-mono transition-all duration-300 ${
                    isEncryptComplete ? 'text-rose-400 bg-rose-950/20 rounded border border-rose-900/20' : 'text-amber-500 animate-pulse'
                  }`}>
                    {encryptingText}
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setEncryptingRecord(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-xs text-slate-400 hover:text-white transition-all cursor-pointer font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
