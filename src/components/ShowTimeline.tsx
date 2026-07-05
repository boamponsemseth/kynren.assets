import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShowTimelineEvent } from '../types';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  Trash2, 
  Filter, 
  Sparkles,
  Info,
  AlertCircle
} from 'lucide-react';

interface ShowTimelineProps {
  events: ShowTimelineEvent[];
  onAddEvent: (event: Partial<ShowTimelineEvent>) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

export default function ShowTimeline({
  events,
  onAddEvent,
  onDeleteEvent
}: ShowTimelineProps) {
  const [filterType, setFilterType] = useState<'all' | 'show' | 'rehearsal' | 'maintenance'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<ShowTimelineEvent | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'show' | 'rehearsal' | 'maintenance'>('show');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'upcoming' | 'ongoing' | 'completed'>('upcoming');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startTime || !endTime || !location) return;

    await onAddEvent({
      title,
      type,
      description,
      startTime,
      endTime,
      location,
      status
    });

    // Reset Form
    setTitle('');
    setDescription('');
    setStartTime('');
    setEndTime('');
    setLocation('');
    setStatus('upcoming');
    setShowAddForm(false);
  };

  const filteredEvents = events
    .filter(event => filterType === 'all' || event.type === filterType)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'show':
        return (
          <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Sparkles className="w-4 h-4" />
          </div>
        );
      case 'rehearsal':
        return (
          <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Calendar className="w-4 h-4" />
          </div>
        );
      case 'maintenance':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-500/10 border border-slate-500/30 flex items-center justify-center text-slate-400">
            <Info className="w-4 h-4" />
          </div>
        );
    }
  };

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case 'show':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      case 'rehearsal':
        return 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30';
      case 'maintenance':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      default:
        return 'bg-slate-500/15 text-slate-400 border border-slate-500/30';
    }
  };

  return (
    <div className="bento-card space-y-4">
      {/* Header Controls */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div>
          <div className="card-title mb-0">
            <span className="flex items-center gap-2 text-slate-100 font-sans font-bold text-sm uppercase tracking-normal">
              <Calendar className="w-4.5 h-4.5 text-rose-500" /> Operational Show Timeline
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">Show performances, rehearsal blocks, and urgent maintenance window scheduling.</p>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 uppercase"
        >
          <Plus className="w-3.5 h-3.5" /> Schedule Event
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-print">
        <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        {(['all', 'show', 'rehearsal', 'maintenance'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold border transition-all uppercase shrink-0 ${
              filterType === type
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-slate-950/40 text-slate-400 border-slate-850 hover:text-slate-200 hover:border-slate-750'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Dynamic Event Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-950 p-4 border border-slate-800 rounded-lg space-y-3.5 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="font-bold font-mono text-[10px] text-rose-400 uppercase">Schedule New Event</span>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-500 hover:text-white">Cancel</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 font-mono mb-1">Event Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Main Light Showground Test"
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">Type</label>
                <select
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                >
                  <option value="show">Performance / Show</option>
                  <option value="rehearsal">Rehearsal Block</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-1">Status</label>
                <select
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 font-mono mb-1">Location</label>
              <input
                type="text"
                required
                placeholder="e.g. Stage West Projection Tower"
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-[10px] text-slate-400 font-mono mb-1">Start Time</label>
              <input
                type="datetime-local"
                required
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none font-mono"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 font-mono mb-1">End Time</label>
              <input
                type="datetime-local"
                required
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none font-mono"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 font-mono mb-1">Detailed Scope/Description</label>
            <textarea
              placeholder="Provide key parameters, frequencies or operators involved..."
              className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-200 focus:outline-none h-16"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold rounded text-[10px] uppercase cursor-pointer"
            >
              Add to Timeline
            </button>
          </div>
        </form>
      )}

      {/* Vertical Timeline Layout */}
      <div className="max-h-[380px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-sans border border-slate-800/50 bg-slate-950/20 rounded-xl">
            No upcoming scheduled timeline items found for the selected filter.
          </div>
        ) : (
          <div className="relative border-l border-slate-800 ml-4 pl-6 space-y-6 py-2">
            {filteredEvents.map((event) => {
              const startDate = new Date(event.startTime);
              const endDate = new Date(event.endTime);
              const timeString = `${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} | ${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
              
              return (
                <div key={event.id} className="relative group">
                  {/* Timeline bullet icon */}
                  <span className="absolute -left-[38px] top-0.5 z-10">
                    {getEventIcon(event.type)}
                  </span>

                  {/* Event content card */}
                  <div className="bg-slate-950/50 border border-slate-850 rounded-xl p-3.5 hover:border-slate-700 hover:bg-slate-900/10 transition-all">
                    <div className="flex justify-between items-start gap-4 mb-1.5">
                      <div>
                        <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-full uppercase tracking-wider ${getEventBadgeColor(event.type)}`}>
                          {event.type}
                        </span>
                        <h4 className="text-slate-100 font-bold text-sm mt-1.5 group-hover:text-rose-400 transition-colors">{event.title}</h4>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-mono font-bold ${
                          event.status === 'ongoing' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse' :
                          event.status === 'upcoming' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' :
                          'bg-slate-500/15 text-slate-500 border border-slate-800'
                        }`}>
                          {event.status}
                        </span>
                        
                        {/* Always Red Delete Button */}
                        <button
                          onClick={() => setEventToDelete(event)}
                          className="p-1 bg-red-500/10 hover:bg-red-500/20 rounded text-red-500 hover:text-red-400 border border-red-500/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Remove from Timeline"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{event.description}</p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 pt-2.5 border-t border-slate-900/60 font-mono text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{timeString}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300">{event.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {eventToDelete && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-500 border-b border-slate-800 pb-3">
                <AlertCircle className="w-6 h-6 shrink-0 text-red-500" />
                <h4 className="font-sans font-bold text-slate-100 text-base">Confirm Event Deletion</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete the show timeline event <span className="font-semibold text-rose-400">{eventToDelete.title}</span>? 
                This action is irreversible and will remove it from the scheduling calendar.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setEventToDelete(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await onDeleteEvent(eventToDelete.id);
                    setEventToDelete(null);
                  }}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all uppercase font-mono"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
