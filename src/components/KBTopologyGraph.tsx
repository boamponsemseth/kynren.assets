import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { KBArticle } from '../types';
import { Network, Link2, GitFork, Info, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface KBTopologyGraphProps {
  articles: KBArticle[];
  onSelectArticle: (id: string) => void;
  activeArticleId?: string;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  category: string;
  tags: string[];
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'explicit' | 'implicit'; // explicit dependency vs implicit tag overlap
  weight: number;
}

export const getCategoryColor = (category: string): string => {
  switch (category.toLowerCase()) {
    case 'network': return '#3b82f6'; // blue
    case 'power': return '#f59e0b'; // amber
    case 'lighting': return '#a855f7'; // purple
    case 'stage/audio': return '#10b981'; // emerald
    case 'pyrotechnics': return '#f43f5e'; // rose
    case 'procedures': return '#64748b'; // slate
    case 'security': return '#ef4444'; // red
    default: return '#06b6d4'; // cyan
  }
};

export default function KBTopologyGraph({ articles, onSelectArticle, activeArticleId }: KBTopologyGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [showTagConnections, setShowTagConnections] = useState<boolean>(true);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  // Update dimensions based on container width
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        // Maintain aspect ratio or bound height
        setDimensions({
          width: Math.max(width, 400),
          height: 380
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || articles.length === 0) return;

    const { width, height } = dimensions;

    // 1. Prepare Nodes
    const nodes: GraphNode[] = articles.map(art => ({
      id: art.id,
      title: art.title,
      category: art.category,
      tags: art.tags || []
    }));

    // 2. Prepare Links (Explicit Dependencies & Tag Overlaps)
    const links: GraphLink[] = [];

    // Map explicit dependencies
    articles.forEach(art => {
      if (art.dependencies && Array.isArray(art.dependencies)) {
        art.dependencies.forEach(depId => {
          // Verify dependency target actually exists
          if (articles.some(a => a.id === depId)) {
            links.push({
              source: depId, // dependency must be read first
              target: art.id,
              type: 'explicit',
              weight: 3
            });
          }
        });
      }
    });

    // Map implicit shared tag overlaps (if enabled)
    if (showTagConnections) {
      for (let i = 0; i < articles.length; i++) {
        for (let j = i + 1; j < articles.length; j++) {
          const a = articles[i];
          const b = articles[j];
          const sharedTags = (a.tags || []).filter(t => (b.tags || []).includes(t));
          
          if (sharedTags.length > 0) {
            // Check if there isn't already an explicit link in either direction
            const hasExplicit = links.some(l => 
              (l.source === a.id && l.target === b.id) || 
              (l.source === b.id && l.target === a.id)
            );
            if (!hasExplicit) {
              links.push({
                source: a.id,
                target: b.id,
                type: 'implicit',
                weight: sharedTags.length * 0.5
              });
            }
          }
        }
      }
    }

    // Clear previous SVG content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create marker definition for directed explicit arrows
    svg.append('defs')
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 22) // Positioning arrow near node edge
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#f43f5e'); // Rose color

    // Base Group with Zoom support
    const g = svg.append('g');

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Initialize Force Simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(d => d.type === 'explicit' ? 120 : 160)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(28));

    // Render Links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', d => d.type === 'explicit' ? '#f43f5e' : '#334155')
      .attr('stroke-opacity', d => d.type === 'explicit' ? 0.9 : 0.4)
      .attr('stroke-width', d => d.type === 'explicit' ? 2.5 : 1)
      .attr('stroke-dasharray', d => d.type === 'implicit' ? '3,3' : 'none')
      .attr('marker-end', d => d.type === 'explicit' ? 'url(#arrow)' : null);

    // Glowing filter for explicit dependency links
    svg.append('defs')
      .append('filter')
      .attr('id', 'glow')
      .append('feGaussianBlur')
      .attr('stdDeviation', '2.5')
      .attr('result', 'coloredBlur');

    // Create Drag Behavior
    const drag = (sim: d3.Simulation<GraphNode, GraphLink>) => {
      function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
        if (!event.active) sim.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
        if (!event.active) sim.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    };

    // Render Nodes Group
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        onSelectArticle(d.id);
      })
      .on('mouseover', (event, d) => {
        setHoveredNode(d);
        // Highlight connections
        node.style('opacity', n => n.id === d.id || links.some(l => 
          (typeof l.source === 'object' ? l.source.id : l.source) === d.id && (typeof l.target === 'object' ? l.target.id : l.target) === n.id ||
          (typeof l.target === 'object' ? l.target.id : l.target) === d.id && (typeof l.source === 'object' ? l.source.id : l.source) === n.id
        ) ? 1 : 0.25);
        link.style('stroke-opacity', l => 
          (typeof l.source === 'object' ? l.source.id : l.source) === d.id || 
          (typeof l.target === 'object' ? l.target.id : l.target) === d.id ? 1.0 : 0.1
        );
      })
      .on('mouseout', () => {
        setHoveredNode(null);
        node.style('opacity', 1);
        link.style('stroke-opacity', l => l.type === 'explicit' ? 0.9 : 0.4);
      })
      .call(drag(simulation) as any);

    // Draw base outer node rings
    node.append('circle')
      .attr('r', d => d.id === activeArticleId ? 16 : 12)
      .attr('fill', '#020617')
      .attr('stroke', d => getCategoryColor(d.category))
      .attr('stroke-width', d => d.id === activeArticleId ? 4 : 2)
      .attr('class', 'transition-all duration-300');

    // Draw inner pulsing core for the active article node
    node.filter(d => d.id === activeArticleId)
      .append('circle')
      .attr('r', 6)
      .attr('fill', '#f43f5e')
      .attr('class', 'animate-pulse');

    // Draw category initials as small text inside nodes
    node.append('text')
      .attr('dy', '.3em')
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .attr('fill', '#cbd5e1')
      .text(d => d.category.slice(0, 2).toUpperCase());

    // Add glowing name tag below each node
    node.append('text')
      .attr('dx', 0)
      .attr('dy', d => d.id === activeArticleId ? 26 : 22)
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'sans-serif')
      .attr('fill', d => d.id === activeArticleId ? '#f43f5e' : '#cbd5e1')
      .text(d => d.title.length > 15 ? d.title.slice(0, 15) + '...' : d.title);

    // Tick update event for simulation
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      node.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

    // Handle zoom action buttons
    const zoomIn = () => svg.transition().duration(400).call(zoom.scaleBy, 1.3);
    const zoomOut = () => svg.transition().duration(400).call(zoom.scaleBy, 0.7);
    const resetZoom = () => svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);

    // Hook listeners or export zoom control handlers
    (window as any).kbGraphZoomIn = zoomIn;
    (window as any).kbGraphZoomOut = zoomOut;
    (window as any).kbGraphResetZoom = resetZoom;

    return () => {
      simulation.stop();
    };
  }, [articles, showTagConnections, dimensions]);

  return (
    <div ref={containerRef} className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-4 relative">
      
      {/* Topology Header */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-900 mb-2">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-rose-500 animate-pulse" />
          <div className="text-left">
            <h5 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Wiki Topology Map</h5>
            <p className="text-[10px] text-slate-400">Force-directed relational network of protocols and shared procedures</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tag Connections toggle */}
          <button
            type="button"
            onClick={() => setShowTagConnections(!showTagConnections)}
            className={`px-2 py-1 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer ${
              showTagConnections 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title="Toggle tag overlap dashed connections"
          >
            {showTagConnections ? 'Tags Connected' : 'Tags Hidden'}
          </button>

          {/* Quick Controls */}
          <div className="flex gap-1 bg-slate-900 p-0.5 border border-slate-800 rounded-lg">
            <button
              onClick={() => (window as any).kbGraphZoomIn?.()}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => (window as any).kbGraphZoomOut?.()}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => (window as any).kbGraphResetZoom?.()}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main SVG Render Container */}
      <div className="relative bg-slate-950/80 border border-slate-900 rounded-lg overflow-hidden h-[380px] select-none flex items-center justify-center">
        
        {/* Subtle Cyber Grid backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,#020617_90%)] pointer-events-none" />

        {articles.length === 0 ? (
          <div className="text-center p-6 space-y-2 z-10">
            <Network className="w-8 h-8 text-slate-700 mx-auto animate-pulse" />
            <p className="text-[10px] text-slate-500 font-mono">No articles found to render network topology.</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full h-full block"
          />
        )}

        {/* Dynamic Tooltip HUD */}
        {hoveredNode && (
          <div className="absolute bottom-3 left-3 bg-slate-900/95 border border-slate-800 p-3 rounded-lg max-w-[260px] text-left shadow-xl backdrop-blur-md z-10 animate-fade-in pointer-events-none font-sans">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCategoryColor(hoveredNode.category) }} />
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">{hoveredNode.category}</span>
            </div>
            <h6 className="text-xs font-bold text-slate-100 leading-snug truncate mb-1.5">{hoveredNode.title}</h6>
            {hoveredNode.tags && hoveredNode.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {hoveredNode.tags.map(t => (
                  <span key={t} className="text-[8px] font-mono text-cyan-400 bg-cyan-950/30 px-1 py-0.2 rounded border border-cyan-800/20">#{t}</span>
                ))}
              </div>
            ) : (
              <span className="text-[8px] font-mono text-slate-500 italic">No tags associated</span>
            )}
            <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[8px] text-slate-500 font-mono">
              <span>Node: {hoveredNode.id}</span>
              <span className="text-rose-400 flex items-center gap-0.5"><Info className="w-2.5 h-2.5" /> Click to open</span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 right-3 flex flex-wrap gap-x-2 gap-y-1 bg-slate-900/90 border border-slate-800/60 px-2 py-1.5 rounded-md text-[8px] font-mono font-bold text-slate-400 z-10 pointer-events-none">
          <div className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-rose-500 inline-block" />
            <span>DEPENDENCY</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-0.5 border-t border-dashed border-slate-500 inline-block" />
            <span>SHARED TAG</span>
          </div>
        </div>
      </div>
    </div>
  );
}
