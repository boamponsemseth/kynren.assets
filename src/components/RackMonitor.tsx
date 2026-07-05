import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SwitchDevice } from '../types';
import { Layers, Activity, Cpu, Server, Plus, Trash2, Sliders, AlertCircle } from 'lucide-react';

interface RackMonitorProps {
  devices: SwitchDevice[];
  onAddDeviceToRack: (device: Partial<SwitchDevice>) => void;
  onRemoveDeviceFromRack: (id: string) => void;
}

export default function RackMonitor({
  devices,
  onAddDeviceToRack,
  onRemoveDeviceFromRack
}: RackMonitorProps) {
  const [selectedRack, setSelectedRack] = useState<'Rack-01' | 'Rack-02'>('Rack-01');
  const [selectedDevice, setSelectedDevice] = useState<SwitchDevice | null>(null);
  const [activeTab, setActiveTab] = useState<'rack' | 'stacks'>('rack');
  const [deviceToDelete, setDeviceToDelete] = useState<SwitchDevice | null>(null);

  // New device form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIp, setNewIp] = useState('');
  const [newPosition, setNewPosition] = useState(10);
  const [newStatus, setNewStatus] = useState<'online' | 'offline'>('online');

  const rackUnits = Array.from({ length: 42 }, (_, i) => 42 - i); // 42U down to 1U

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newIp) return;

    const portsList = Array.from({ length: 12 }, (_, i) => ({
      portNo: i + 1,
      status: Math.random() > 0.4 ? 'connected' : 'empty' as 'connected' | 'empty',
      speed: '1G'
    }));

    onAddDeviceToRack({
      id: `sw-${Date.now()}`,
      name: newName,
      ip: newIp,
      status: newStatus,
      latency: 5,
      rackId: selectedRack,
      rackPosition: Number(newPosition),
      ports: portsList
    });

    // Reset Form
    setNewName('');
    setNewIp('');
    setShowAddForm(false);
  };

  const devicesInSelectedRack = devices.filter(d => d.rackId === selectedRack);

  // Return the device at a given U position (supporting devices of 2U heights)
  const getDeviceAtU = (u: number) => {
    return devicesInSelectedRack.find(d => d.rackPosition === u || d.rackPosition - 1 === u);
  };

  return (
    <div id="rack-switch-monitor-panel" className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl p-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4 mb-5">
        <div>
          <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
            <Server className="w-5 h-5 text-rose-500" /> Rack Cabinet & Switch Stacks Monitor
          </h3>
          <p className="text-xs text-slate-400">Physical representation of the 42U technical racks and device stack links.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('rack')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'rack' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            42U Cabinet Layout
          </button>
          <button
            onClick={() => setActiveTab('stacks')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'stacks' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Switch Stack Links
          </button>
        </div>
      </div>

      {activeTab === 'rack' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Rack Cabinet Left Selector & Add Form */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <span className="text-xs text-slate-400 block mb-2 uppercase font-bold tracking-wider">Select Cabinet Rack</span>
              <div className="grid grid-cols-2 gap-2">
                {(['Rack-01', 'Rack-02'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => { setSelectedRack(r); setSelectedDevice(null); }}
                    className={`
                      px-3 py-2 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer
                      ${selectedRack === r 
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/40 shadow-inner' 
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }
                    `}
                  >
                    {r} (Showground Core)
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Add Form */}
            {showAddForm ? (
              <form onSubmit={handleAddDevice} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Slot New Hardware Node</span>
                  <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-500 hover:text-white text-[10px]">Cancel</button>
                </h4>
                
                <div>
                  <label className="block text-[10px] text-slate-400 font-mono mb-1">Device Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stage Switch L3"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1">Node IP</label>
                    <input
                      type="text"
                      required
                      placeholder="10.12.10.x"
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                      value={newIp}
                      onChange={(e) => setNewIp(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-mono mb-1">Position (U-Slot)</label>
                    <select
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                      value={newPosition}
                      onChange={(e) => setNewPosition(Number(e.target.value))}
                    >
                      {Array.from({ length: 42 }, (_, i) => i + 1).map((u) => (
                        <option key={u} value={u}>{u}U</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded transition-all cursor-pointer uppercase"
                >
                  Confirm Mount Into Rack
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full py-3 bg-slate-950 border border-dashed border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-rose-500" /> Slot New Rack Hardware
              </button>
            )}

            {/* Selected Device Details */}
            {selectedDevice ? (
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-sans space-y-4">
                <div className="flex justify-between items-start border-b border-slate-800 pb-2">
                  <div>
                    <h4 className="font-bold text-slate-200 text-xs">{selectedDevice.name}</h4>
                    <span className="text-[10px] text-cyan-400 font-mono font-bold uppercase">{selectedDevice.ip}</span>
                  </div>
                  {/* Always Red Dismount / Delete */}
                  <button
                    onClick={() => setDeviceToDelete(selectedDevice)}
                    className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 border border-red-500/20 rounded transition-all cursor-pointer"
                    title="Dismount Device from Rack"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Cabinet Location</span>
                    <span className="text-slate-200 font-semibold">{selectedDevice.rackId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Position</span>
                    <span className="text-slate-200 font-semibold font-mono">{selectedDevice.rackPosition}U</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Status</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase inline-block ${
                      selectedDevice.status === 'online' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {selectedDevice.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Latency Response</span>
                    <span className="text-cyan-400 font-mono font-bold">{selectedDevice.latency} ms</span>
                  </div>
                </div>

                {/* Port Activity Matrix */}
                <div className="border-t border-slate-800 pt-3">
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold block mb-2">Switch Port Matrix</span>
                  <div className="grid grid-cols-6 gap-1.5">
                    {selectedDevice.ports.map((port) => (
                      <div
                        key={port.portNo}
                        className={`
                          p-1.5 rounded border flex flex-col items-center justify-between font-mono text-[9px] cursor-help relative group
                          ${port.status === 'connected' 
                            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                          }
                        `}
                      >
                        <span>P{port.portNo}</span>
                        {/* Status light */}
                        <span className={`w-1.5 h-1.5 rounded-full ${port.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
                        
                        {/* Port Hover Tooltip */}
                        <div className="absolute bottom-full mb-1 bg-slate-900 border border-slate-800 text-white p-2 rounded shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-30 w-32 font-sans text-[10px] text-left">
                          <p className="font-semibold text-rose-300">Port {port.portNo} Info</p>
                          <p className="text-slate-400 font-mono">{port.speed} link speed</p>
                          {port.connectedTo && <p className="text-slate-200 mt-1 truncate">→ {port.connectedTo}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-center py-10 font-sans">
                <Sliders className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-400">No Cabinet Device Selected</p>
                <p className="text-[10px] text-slate-600 mt-1">Click on any device mounted inside the cabinet representation on the right to load port matrix variables.</p>
              </div>
            )}
          </div>

          {/* 42U Visual Cabinet Representation */}
          <div className="lg:col-span-8 bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col h-[600px] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <span className="text-xs text-slate-200 font-bold uppercase tracking-wider">{selectedRack} Structural Chassis</span>
              <span className="text-[10px] text-slate-500 font-mono">1U to 42U standard heights</span>
            </div>

            <div className="flex-1 space-y-[2px]">
              {rackUnits.map((u) => {
                const device = getDeviceAtU(u);
                const isMountedHere = device && device.rackPosition === u;

                return (
                  <div key={u} className="flex items-stretch h-[24px]">
                    {/* Unit labels */}
                    <div className="w-8 flex items-center justify-center bg-slate-900 border-r border-slate-800 text-[9px] font-mono text-slate-500 select-none">
                      {u}U
                    </div>

                    {/* Rack slot element */}
                    {device ? (
                      isMountedHere ? (
                        <button
                          onClick={() => setSelectedDevice(device)}
                          style={{ height: device.ports.length > 8 ? '50px' : '24px' }}
                          className={`
                            flex-1 px-3 flex items-center justify-between rounded border transition-all z-10 cursor-pointer
                            ${device.status === 'online' 
                              ? 'bg-slate-900/90 border-emerald-500/40 text-emerald-300 hover:border-emerald-400' 
                              : 'bg-slate-900/90 border-rose-500/40 text-rose-300 hover:border-rose-400'
                            }
                            ${selectedDevice?.id === device.id ? 'ring-2 ring-rose-500 border-transparent shadow-lg scale-[1.01]' : ''}
                          `}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span className="font-mono text-xs font-bold">{device.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-[10px] font-mono">
                            <span className="text-slate-400">{device.ip}</span>
                            <span className="hidden md:inline text-rose-300 font-bold">{device.ports.length} Ports</span>
                          </div>
                        </button>
                      ) : null
                    ) : (
                      <div className="flex-1 border-b border-slate-900/60 hover:bg-slate-900/20 transition-all text-transparent hover:text-slate-600 flex items-center justify-center font-mono text-[9px]">
                        Empty 1U Chassis Slot
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Switch and Device Stacks Tab */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {devices.map((device, devIdx) => (
              <div key={device.id} className="bg-slate-950 p-5 rounded-lg border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-mono text-sm font-bold text-slate-200 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-rose-500" /> Stack Unit {devIdx + 1}: {device.name}
                    </h4>
                    <span className="text-xs text-cyan-400 font-mono font-bold bg-slate-900 px-2 py-0.5 border border-slate-800 rounded">
                      {device.ip}
                    </span>
                  </div>

                  {/* Physical Stack Representation */}
                  <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-md space-y-4">
                    {/* Visual Port Stack lights */}
                    <div className="flex justify-between border-b border-slate-800 pb-2 mb-2 font-mono text-[10px] text-slate-500">
                      <span>Stack Uplink Status</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Loop Protected
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <div className="w-12 h-16 bg-slate-950 rounded border border-slate-700 flex flex-col items-center justify-center text-xs font-mono font-bold text-slate-400">
                        GbE1/1
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <div className="h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded animate-pulse" />
                        <span className="text-[9px] font-mono text-slate-400 mt-1 block">Active 10Gbps Stack Interconnect Cable</span>
                      </div>
                      <div className="w-12 h-16 bg-slate-950 rounded border border-slate-700 flex flex-col items-center justify-center text-xs font-mono font-bold text-slate-400">
                        GbE1/2
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-between items-center font-mono text-[10px] text-slate-400">
                  <span>Stack Type: Ring Topology</span>
                  <span className="text-rose-400 font-bold uppercase">Priority: {devIdx === 0 ? 'Master' : 'Member'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg flex items-center gap-4">
            <div className="p-3 bg-rose-500/10 rounded-full border border-rose-500/20 text-rose-400 shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-slate-200 text-xs font-bold uppercase tracking-wider mb-0.5">Automated Loop Protection Alerting</h4>
              <p className="text-xs text-slate-400">
                LACP and Spanning Tree Protocol (STP) are active. Port channels are automatically balanced. Total stacked bandwidth is currently 30 Gbps full-duplex between Switch A and Switch B.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {deviceToDelete && (
          <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-500 border-b border-slate-800 pb-3">
                <AlertCircle className="w-6 h-6 shrink-0 text-red-500" />
                <h4 className="font-sans font-bold text-slate-100 text-base">Confirm Dismounting Device</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to dismount <span className="font-semibold text-rose-400">{deviceToDelete.name}</span> (<span className="font-mono text-[10px] text-slate-400">{deviceToDelete.ip}</span>) from the rack? 
                This action is irreversible and will disconnect its telemetry stream.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeviceToDelete(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onRemoveDeviceFromRack(deviceToDelete.id);
                    if (selectedDevice?.id === deviceToDelete.id) {
                      setSelectedDevice(null);
                    }
                    setDeviceToDelete(null);
                  }}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all uppercase font-mono"
                >
                  Confirm Dismount
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
