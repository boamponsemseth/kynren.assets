import React, { useState, useRef, useEffect } from 'react';
import { Asset, SignalLog } from '../types';
import { 
  MapPin, 
  Info, 
  Compass, 
  Crosshair, 
  PlusCircle, 
  Flame, 
  ShieldAlert,
  HelpCircle,
  Gem
} from 'lucide-react';

interface MapCanvasProps {
  assets: Asset[];
  logs: SignalLog[];
  onUpdateAssetCoordinates: (assetId: string, x: number, y: number) => void;
  onAddAssetAtCoordinates: (x: number, y: number) => void;
  focusedAssetId?: string | null;
  onClearFocusedAsset?: () => void;
}

export default function MapCanvas({
  assets,
  logs,
  onUpdateAssetCoordinates,
  onAddAssetAtCoordinates,
  focusedAssetId,
  onClearFocusedAsset
}: MapCanvasProps) {
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  useEffect(() => {
    if (focusedAssetId) {
      const match = assets.find(a => a.id === focusedAssetId);
      if (match) {
        setSelectedAsset(match);
      }
    }
  }, [focusedAssetId, assets]);
  const [draggingAssetId, setDraggingAssetId] = useState<string | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<{ x: number, y: number } | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showDensityHeatmap, setShowDensityHeatmap] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const [visibleCategories, setVisibleCategories] = useState<Record<string, boolean>>({
    Projector: true,
    Speaker: true,
    Pyrotechnics: true,
    DMX: true,
    Switch: true,
    Radio: true,
    Power: true
  });

  const uniqueCategories = Array.from(new Set(assets.map(a => a.category).filter(Boolean)));

  const visibleAssets = assets.filter(asset => {
    const cat = asset.category || 'General';
    return visibleCategories[cat] !== false && asset.coordinates !== undefined;
  });

  // Designated Stage Coordinates: 20% to 80%
  const isOutsideGeofence = (x: number, y: number) => {
    return x < 20 || x > 80 || y < 20 || y > 80;
  };

  // Find high-value violations of visible assets
  const violations = visibleAssets.filter(a => a.isHighValue && isOutsideGeofence(a.coordinates.x, a.coordinates.y));

  // Compute log count mapping for heatmap
  const getAssetLogCount = (asset: Asset) => {
    return logs.filter(log => 
      log.source.toLowerCase().includes(asset.name.toLowerCase()) ||
      log.message.toLowerCase().includes(asset.name.toLowerCase()) ||
      log.source.toLowerCase().includes(asset.id.toLowerCase()) ||
      log.message.toLowerCase().includes(asset.id.toLowerCase()) ||
      log.source.toLowerCase().includes(asset.category.toLowerCase())
    ).length;
  };

  const maxLogCount = Math.max(...visibleAssets.map(getAssetLogCount), 1);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingAssetId) return; // Ignore clicks while dragging
    
    // Check if clicking on an asset marker
    if ((e.target as HTMLElement).closest('.asset-marker')) return;

    if (mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
      const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
      
      onAddAssetAtCoordinates(x, y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
      const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
      if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        setHoveredLocation({ x, y });
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredLocation(null);
  };

  const handleDragStart = (e: React.DragEvent, assetId: string) => {
    setDraggingAssetId(assetId);
    e.dataTransfer.setData('text/plain', assetId);
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
      const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
      
      if (draggingAssetId && x >= 0 && x <= 100 && y >= 0 && y <= 100) {
        onUpdateAssetCoordinates(draggingAssetId, x, y);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggingAssetId(null);
  };

  const getMarkerColor = (category: string, status: string, isHighValue?: boolean) => {
    if (status === 'offline') return 'bg-rose-500 shadow-rose-500/50 text-white';
    if (status === 'maintenance') return 'bg-amber-500 shadow-amber-500/50 text-white';
    if (isHighValue) return 'bg-indigo-600 shadow-indigo-600/50 text-white border-2 border-indigo-400';
    
    switch (category.toLowerCase()) {
      case 'projector': return 'bg-cyan-500 shadow-cyan-500/50 text-white';
      case 'speaker': return 'bg-indigo-500 shadow-indigo-500/50 text-white';
      case 'pyrotechnics': return 'bg-rose-600 shadow-rose-600/50 text-white';
      case 'dmx': return 'bg-violet-500 shadow-violet-500/50 text-white';
      default: return 'bg-emerald-500 shadow-emerald-500/50 text-white';
    }
  };

  return (
    <div id="geolocation-view-panel" className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl p-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h3 className="font-sans font-bold text-slate-100 flex items-center gap-2 text-base">
            <Compass className="w-5 h-5 text-rose-500 animate-spin-slow" /> Kynren Showground Geolocation Map
          </h3>
          <p className="text-xs text-slate-400">Drag and drop nodes to physically re-allocate hardware placement coordinates across the 7.5-acre lake-stage.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Layer Toggle Filter Pill Row */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase px-2">Layers</span>
            {uniqueCategories.map(cat => {
              const isVisible = visibleCategories[cat] !== false;
              const colorClass = 
                cat.toLowerCase() === 'projector' ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10' :
                cat.toLowerCase() === 'speaker' ? 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10' :
                cat.toLowerCase() === 'pyrotechnics' ? 'border-rose-500/30 text-rose-400 bg-rose-500/10' :
                cat.toLowerCase() === 'dmx' ? 'border-violet-500/30 text-violet-400 bg-violet-500/10' :
                'border-emerald-500/30 text-emerald-400 bg-emerald-500/10';

              return (
                <button
                  key={cat}
                  onClick={() => {
                    setVisibleCategories(prev => ({
                      ...prev,
                      [cat]: !isVisible
                    }));
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    isVisible 
                      ? `${colorClass} shadow-sm font-semibold` 
                      : 'border-slate-850 text-slate-600 bg-slate-900/40 hover:text-slate-400'
                  }`}
                >
                  <span className={`w-1 h-1 rounded-full ${
                    isVisible
                      ? cat.toLowerCase() === 'projector' ? 'bg-cyan-400' :
                        cat.toLowerCase() === 'speaker' ? 'bg-indigo-400' :
                        cat.toLowerCase() === 'pyrotechnics' ? 'bg-rose-400' :
                        cat.toLowerCase() === 'dmx' ? 'bg-violet-400' :
                        'bg-emerald-400'
                      : 'bg-slate-700'
                  }`}></span>
                  {cat}s
                </button>
              );
            })}
          </div>

          {/* Traffic Heatmap Toggle Button */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all border cursor-pointer uppercase ${
              showHeatmap 
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-inner' 
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Flame className={`w-4 h-4 ${showHeatmap ? 'text-rose-500 animate-pulse' : ''}`} />
            {showHeatmap ? 'Hide Traffic' : 'Traffic Heatmap'}
          </button>

          {/* Show Asset Density Toggle Switch */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Show Asset Density</span>
            <button
              type="button"
              onClick={() => setShowDensityHeatmap(!showDensityHeatmap)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showDensityHeatmap ? 'bg-rose-500' : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showDensityHeatmap ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {hoveredLocation && (
            <div className="text-xs font-mono bg-slate-800 border border-slate-700 px-3 py-1 rounded-md text-slate-300 flex items-center gap-2">
              <Crosshair className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              Coords: <span className="text-rose-400 font-bold">{hoveredLocation.x}% X / {hoveredLocation.y}% Y</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        {/* Map Canvas Frame */}
        <div className="xl:col-span-3">
          <div 
            ref={mapRef}
            onClick={handleMapClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onDragOver={handleDragOver}
            className="relative w-full h-[450px] bg-slate-950 rounded-lg overflow-hidden border border-slate-800 select-none cursor-crosshair group shadow-inner"
          >
            {/* SVG Visual Elements representing the Durham Kynren Showground */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              {/* Lake Area */}
              <ellipse cx="50%" cy="55%" rx="35%" ry="20%" className="fill-cyan-950/20 stroke-cyan-500/10 stroke-2 stroke-dasharray-[5_5] animate-pulse" />
              
              {/* Grandstand seating (Tribune) */}
              <path d="M 10 420 Q 50 400 90 420" className="stroke-slate-700 fill-none" strokeWidth="8" />
              <text x="50%" y="94%" textAnchor="middle" className="fill-slate-500 text-[10px] font-sans font-bold uppercase tracking-widest">Grandstand Tribune</text>
              
              {/* Durham Castle backdrop representation */}
              <rect x="5%" y="8%" width="120" height="60" rx="4" className="fill-slate-850/40 stroke-slate-700" strokeWidth="1" />
              <polygon points="5,68 35,40 65,68" className="fill-slate-800/40 stroke-slate-700" />
              <text x="10%" y="15%" className="fill-slate-400 text-[9px] font-mono tracking-wider">Auckland Castle Backdrop</text>

              {/* Showground labels */}
              <text x="50%" y="56%" textAnchor="middle" className="fill-cyan-400/25 text-xs font-mono tracking-widest uppercase">Central Performance Lake</text>
              <text x="50%" y="28%" textAnchor="middle" className="fill-amber-500/20 text-xs font-mono tracking-widest uppercase">Flatts Farm stage loops</text>
              <text x="88%" y="40%" textAnchor="middle" className="fill-slate-600 text-[10px] font-mono uppercase tracking-widest">East Wing</text>
              <text x="12%" y="40%" textAnchor="middle" className="fill-slate-600 text-[10px] font-mono uppercase tracking-widest">West Wing</text>

              {/* Designated Stage Geofence Boundary Outline */}
              <rect x="20%" y="20%" width="60%" height="60%" className="fill-none stroke-rose-500/25 stroke-2 stroke-dasharray-[6_6] animate-pulse" />
              <text x="50%" y="24%" textAnchor="middle" className="fill-rose-500/40 text-[9px] font-mono uppercase tracking-widest font-bold">Designated Stage Boundary (Geofence Limit: 20%-80%)</text>

              {/* Grid guide-lines */}
              <line x1="25%" y1="0%" x2="25%" y2="100%" className="stroke-slate-900/40" />
              <line x1="50%" y1="0%" x2="50%" y2="100%" className="stroke-slate-900/40" />
              <line x1="75%" y1="0%" x2="75%" y2="100%" className="stroke-slate-900/40" />
              <line x1="0%" y1="33%" x2="100%" y2="33%" className="stroke-slate-900/40" />
              <line x1="0%" y1="66%" x2="100%" y2="66%" className="stroke-slate-900/40" />
            </svg>

            {/* Click to Add guide text */}
            <div className="absolute top-2 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 px-2 py-1 rounded text-[10px] font-mono text-slate-400 pointer-events-none flex items-center gap-1.5 border border-white/5">
              <PlusCircle className="w-3 h-3 text-emerald-400" /> Click Map to Add Asset Marker
            </div>

            {/* Heatmap density visualization layer */}
            {showHeatmap && visibleAssets.map((asset) => {
              const count = getAssetLogCount(asset);
              if (count === 0) return null;
              const ratio = count / maxLogCount;
              const size = 40 + ratio * 100; // 40px to 140px size
              const opacity = 0.2 + ratio * 0.6; // 0.2 to 0.8 transparency

              return (
                <div
                  key={`heat-${asset.id}`}
                  className="absolute rounded-full pointer-events-none mix-blend-screen blur-2xl transition-all duration-500"
                  style={{
                    left: `${asset.coordinates.x}%`,
                    top: `${asset.coordinates.y}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    transform: 'translate(-50%, -50%)',
                    background: `radial-gradient(circle, rgba(239, 68, 68, ${opacity}) 0%, rgba(245, 158, 11, ${opacity * 0.6}) 55%, rgba(239, 68, 68, 0) 100%)`,
                    zIndex: 2
                  }}
                />
              );
            })}

            {/* Asset Density Heatmap Layer */}
            {showDensityHeatmap && visibleAssets.map((asset) => {
              // Calculate proximity to other stage assets to define density intensity
              const nearbyCount = visibleAssets.filter(other => {
                const dx = other.coordinates.x - asset.coordinates.x;
                const dy = other.coordinates.y - asset.coordinates.y;
                return Math.sqrt(dx * dx + dy * dy) < 22;
              }).length;

              const densitySize = 50 + nearbyCount * 35; // Expand size based on nearby cluster density
              const opacity = 0.15 + (nearbyCount / Math.max(visibleAssets.length, 1)) * 0.65;
              
              // Multi-color heatmap gradient: Amber/Red for high clusters, Emerald for sparse distribution
              const densityColor = nearbyCount > 3 ? `rgba(244, 63, 94, ${opacity})` : // rose/red
                                   nearbyCount > 1 ? `rgba(245, 158, 11, ${opacity})` : // amber/orange
                                   `rgba(16, 185, 129, ${opacity * 0.6})`; // emerald green

              return (
                <div
                  key={`density-${asset.id}`}
                  className="absolute rounded-full pointer-events-none mix-blend-color-dodge blur-2xl transition-all duration-500"
                  style={{
                    left: `${asset.coordinates.x}%`,
                    top: `${asset.coordinates.y}%`,
                    width: `${densitySize}px`,
                    height: `${densitySize}px`,
                    transform: 'translate(-50%, -50%)',
                    background: `radial-gradient(circle, ${densityColor} 0%, rgba(15, 23, 42, 0) 75%)`,
                    zIndex: 2
                  }}
                />
              );
            })}

            {/* Render Asset Markers on Geolocation */}
            {visibleAssets.map((asset) => {
              const isHighVal = !!asset.isHighValue;
              const outOfStage = isOutsideGeofence(asset.coordinates.x, asset.coordinates.y);
              
              return (
                <div
                  key={asset.id}
                  className="asset-marker absolute cursor-grab active:cursor-grabbing transition-transform hover:scale-115 z-10"
                  style={{ left: `${asset.coordinates.x}%`, top: `${asset.coordinates.y}%`, transform: 'translate(-50%, -50%)' }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, asset.id)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAsset(asset);
                  }}
                >
                  <div className={`p-1.5 rounded-full shadow-lg border relative flex items-center justify-center transition-all ${
                    outOfStage && isHighVal 
                      ? 'bg-rose-700 animate-bounce border-rose-300 shadow-rose-500/80 text-white' 
                      : getMarkerColor(asset.category, asset.status, isHighVal)
                  }`}>
                    <MapPin className="w-4 h-4" />
                    
                    {/* Geofence violation flashing halo */}
                    {outOfStage && isHighVal && (
                      <span className="absolute -inset-1 rounded-full border-2 border-rose-400 animate-ping opacity-75"></span>
                    )}
                  </div>
                  
                  {/* Tiny badge showing asset initial */}
                  <div className="absolute -top-1.5 -right-1.5 bg-black/85 text-[8px] px-1 rounded-full text-slate-200 border border-white/5 font-mono flex items-center gap-0.5">
                    {isHighVal && <Gem className="w-2 h-2 text-indigo-400" />}
                    {asset.name.substring(0, 3)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Asset Properties Panel */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col justify-between h-[450px]">
          {selectedAsset ? (
            <div className="flex-1 flex flex-col justify-between overflow-y-auto">
              <div>
                <div className="flex justify-between items-start border-b border-slate-800 pb-3 mb-3">
                  <div>
                    <h4 className="font-semibold text-slate-200 text-sm leading-tight flex items-center gap-1">
                      {selectedAsset.isHighValue && <Gem className="w-3.5 h-3.5 text-indigo-400 fill-indigo-500/20" />}
                      {selectedAsset.name}
                    </h4>
                    <span className="text-[10px] text-rose-400 font-mono font-bold uppercase">{selectedAsset.id}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                    selectedAsset.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    selectedAsset.status === 'maintenance' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {selectedAsset.status}
                  </span>
                </div>

                <div className="space-y-3 font-sans text-xs">
                  {selectedAsset.isHighValue && (
                    <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-lg p-2 flex items-center gap-2">
                      <Gem className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs text-indigo-300 font-mono font-bold">Classified: HIGH-VALUE HARDWARE</span>
                    </div>
                  )}

                  {selectedAsset.coordinates && isOutsideGeofence(selectedAsset.coordinates.x, selectedAsset.coordinates.y) && selectedAsset.isHighValue && (
                    <div className="bg-rose-950/40 border border-rose-500/40 rounded-lg p-2.5 flex items-start gap-2 text-rose-300 font-mono text-[10px] uppercase leading-tight animate-pulse">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <strong className="block text-xs font-bold text-rose-200">GEOFENCE VIOLATION</strong>
                        Asset located outside limits (20% - 80%). High risk of physical water or stage damage.
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-slate-400 block mb-0.5">Category</span>
                    <span className="text-slate-200 font-medium">{selectedAsset.category}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">IP Address</span>
                    <span className="text-cyan-400 font-mono font-bold">{selectedAsset.ipAddress}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Serial Number</span>
                    <span className="text-slate-300 font-mono">{selectedAsset.serialNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Assigned Operator</span>
                    <span className="text-rose-300 font-semibold">{selectedAsset.assignedTo}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Showground Coordinates</span>
                    <span className="text-slate-300 font-mono bg-black/30 px-2 py-1 rounded">
                      X: {selectedAsset.coordinates?.x ?? 'N/A'}% | Y: {selectedAsset.coordinates?.y ?? 'N/A'}%
                    </span>
                  </div>
                  {showHeatmap && (
                    <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[10px] font-mono">
                      <span className="text-slate-400">Diag Log Hits:</span>
                      <span className="text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                        {getAssetLogCount(selectedAsset)} Signals
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-md mt-4">
                <p className="text-[10px] text-slate-400 leading-relaxed flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Use standard drag & drop gesture inside the map grid to move this hardware device live. Coordinates sync on Firestore immediately.</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between overflow-y-auto">
              {/* Geofence Active Alert Dashboard */}
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-2 mb-2">
                  <span className="text-[10px] text-slate-400 uppercase font-mono font-bold tracking-wider block">GEOFENCE PROTECTED ZONES</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Central Stage safe zone is mapped within grid [20% - 80%] coordinate limits.</p>
                </div>

                {violations.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[10px] text-rose-400 font-bold uppercase font-mono flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 animate-pulse" /> {violations.length} Active Breach{violations.length > 1 ? 'es' : ''}
                    </span>
                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                      {violations.map((v) => (
                        <div 
                          key={v.id} 
                          onClick={() => setSelectedAsset(v)}
                          className="bg-rose-950/30 border border-rose-500/30 p-2 rounded text-xs hover:border-rose-400 hover:bg-rose-950/40 cursor-pointer flex justify-between items-center transition-all"
                        >
                          <div className="truncate pr-2">
                            <p className="font-semibold text-rose-200 truncate">{v.name}</p>
                            <p className="text-[9px] text-rose-400 font-mono">Coords: {v.coordinates.x}%, {v.coordinates.y}%</p>
                          </div>
                          <span className="text-[8px] bg-rose-600 font-mono font-bold text-white px-1 rounded uppercase">Breach</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-850 p-3 rounded-lg text-center py-5">
                    <ShieldAlert className="w-6 h-6 text-emerald-500 mx-auto opacity-40 mb-1.5" />
                    <span className="text-[11px] text-emerald-400 font-semibold block font-sans">Geofence Status: Secure</span>
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">All high-value assets inside stage limits.</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center justify-center text-center p-4 mt-auto border-t border-slate-900 pt-4">
                <Compass className="w-10 h-10 text-slate-700 animate-pulse mb-2" />
                <p className="text-xs font-medium text-slate-400">No Asset Selected</p>
                <p className="text-[10px] text-slate-500 mt-0.5 max-w-[200px]">Click any placement pin on the map to load property telemetry.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
