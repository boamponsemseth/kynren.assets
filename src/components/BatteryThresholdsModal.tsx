import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Battery, 
  X, 
  Sliders, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firebaseHelpers';

interface BatteryThresholdsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThresholds: Record<string, number>;
  autoShutdownEnabled?: boolean;
  onSaveSuccess?: (updated: Record<string, number>, autoShutdown: boolean) => void;
}

export default function BatteryThresholdsModal({
  isOpen,
  onClose,
  currentThresholds,
  autoShutdownEnabled = false,
  onSaveSuccess
}: BatteryThresholdsModalProps) {
  const [thresholds, setThresholds] = useState<Record<string, number>>({
    Projector: 15,
    Switch: 15,
    Radio: 15,
    DMX: 15,
    Speaker: 15,
    Pyrotechnics: 15,
  });
  const [autoShutdown, setAutoShutdown] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when currentThresholds changes
  useEffect(() => {
    if (Object.keys(currentThresholds).length > 0) {
      setThresholds(prev => ({ ...prev, ...currentThresholds }));
    }
    setAutoShutdown(autoShutdownEnabled);
  }, [currentThresholds, autoShutdownEnabled, isOpen]);

  const handleSliderChange = (category: string, value: number) => {
    setThresholds(prev => ({
      ...prev,
      [category]: value
    }));
    setSuccess(false);
    setError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Persist each threshold back to Firestore in parallel or sequence
      const categories = Object.keys(thresholds);
      for (const category of categories) {
        const value = thresholds[category];
        const docRef = doc(db, 'battery_thresholds', category);
        await setDoc(docRef, { 
          threshold: value,
          updatedAt: new Date().toISOString()
        });
      }
      
      const configRef = doc(db, 'battery_thresholds', '_config');
      await setDoc(configRef, {
        autoShutdown: autoShutdown,
        updatedAt: new Date().toISOString()
      });
      
      setSuccess(true);
      if (onSaveSuccess) {
        onSaveSuccess(thresholds, autoShutdown);
      }
      
      // Auto-close after 1.5 seconds on success
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Failed to persist battery thresholds:', err);
      setError('Failed to update thresholds. Please check security rules or database connection.');
      try {
        handleFirestoreError(err, OperationType.WRITE, 'battery_thresholds');
      } catch (wrappedErr) {
        // Log or handle the wrapper error if needed
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Projector': return 'text-sky-400';
      case 'Switch': return 'text-indigo-400';
      case 'Radio': return 'text-amber-400';
      case 'DMX': return 'text-purple-400';
      case 'Speaker': return 'text-emerald-400';
      case 'Pyrotechnics': return 'text-rose-400';
      default: return 'text-slate-400';
    }
  };

  const getThresholdWarningColor = (value: number) => {
    if (value <= 15) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (value <= 30) return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[150] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500">
                  <Battery className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm uppercase tracking-wide">
                    Configure Battery Alert Thresholds
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Adjust priority alert triggers across primary mobile hardware categories.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content / Sliders */}
            <div className="p-6 space-y-5 flex-1 max-h-[60vh] overflow-y-auto">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex gap-3 text-xs text-slate-400 leading-normal">
                <HelpCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <span>
                  When an active node's battery level falls below its configured threshold, the automated alert guards will trigger priority <strong>Power & Light</strong> maintenance tickets in real time.
                </span>
              </div>

              {/* Presets Selection */}
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-2 text-left">
                <span className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold">
                  ⚡ Apply Global Manufacturer Presets
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setThresholds({
                        Projector: 10,
                        Switch: 10,
                        Radio: 15,
                        DMX: 10,
                        Speaker: 15,
                        Pyrotechnics: 20
                      });
                      setSuccess(false);
                      setError(null);
                    }}
                    className="py-1 px-2 border border-slate-800 hover:border-emerald-500 bg-slate-900 hover:bg-emerald-950/20 text-[10px] text-slate-300 hover:text-emerald-400 font-mono font-bold rounded uppercase transition-all cursor-pointer text-center"
                  >
                    🔋 Eco Guard
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setThresholds({
                        Projector: 20,
                        Switch: 15,
                        Radio: 20,
                        DMX: 15,
                        Speaker: 20,
                        Pyrotechnics: 25
                      });
                      setSuccess(false);
                      setError(null);
                    }}
                    className="py-1 px-2 border border-slate-800 hover:border-cyan-500 bg-slate-900 hover:bg-cyan-950/20 text-[10px] text-slate-300 hover:text-cyan-400 font-mono font-bold rounded uppercase transition-all cursor-pointer text-center"
                  >
                    ⚖️ Balanced
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setThresholds({
                        Projector: 30,
                        Switch: 25,
                        Radio: 30,
                        DMX: 25,
                        Speaker: 30,
                        Pyrotechnics: 40
                      });
                      setSuccess(false);
                      setError(null);
                    }}
                    className="py-1 px-2 border border-slate-800 hover:border-rose-500 bg-slate-900 hover:bg-rose-950/20 text-[10px] text-slate-300 hover:text-rose-400 font-mono font-bold rounded uppercase transition-all cursor-pointer text-center"
                  >
                    🛡️ Safety First
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                {Object.entries(thresholds).map(([category, value]) => (
                  <div key={category} className="space-y-1.5 p-3 bg-slate-950/40 rounded-lg border border-slate-800/60 hover:border-slate-800 transition-all">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-3.5 h-3.5 text-slate-500" />
                        <span className={`text-xs font-mono font-bold uppercase tracking-wider ${getCategoryColor(category)}`}>
                          {category} Node
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${getThresholdWarningColor(value as number)}`}>
                        {value}% Trigger
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-slate-600 font-mono w-5">5%</span>
                      <input
                        type="range"
                        min="5"
                        max="80"
                        step="5"
                        value={value}
                        onChange={(e) => handleSliderChange(category, Number(e.target.value))}
                        className="flex-1 accent-rose-500 h-1.5 bg-slate-850 rounded-lg appearance-none cursor-pointer focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-600 font-mono w-6 text-right">80%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Auto-Shutdown Toggle */}
              <div className="pt-4 border-t border-slate-800/80">
                <div className="bg-slate-950/80 border border-slate-800/60 rounded-lg p-4 flex items-center justify-between gap-4 hover:border-slate-800 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      <span className="text-xs font-mono font-bold uppercase text-slate-200">
                        Critical Auto-Shutdown
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Automatically powers off (sets status to <span className="text-slate-200 font-mono font-bold">"offline"</span>) any active mobile assets whose predicted remaining battery runtime drops below 15 minutes. This protects critical field batteries from deep discharge damage.
                    </p>
                  </div>
                  
                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => {
                      setAutoShutdown(!autoShutdown);
                      setSuccess(false);
                      setError(null);
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoShutdown ? 'bg-rose-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        autoShutdown ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Error and Success Notifications */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-xs text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2 text-xs text-emerald-400 animate-pulse">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Battery thresholds saved & synchronized with Firestore!</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold rounded-lg uppercase tracking-wide cursor-pointer transition-all border border-slate-700/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || success}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-mono text-xs font-bold rounded-lg uppercase tracking-wide cursor-pointer transition-all flex items-center gap-2 shadow-md"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Commit Changes
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
