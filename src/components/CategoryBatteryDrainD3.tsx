import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Asset } from '../types';
import { Flame, Info, BatteryCharging } from 'lucide-react';

interface CategoryBatteryDrainD3Props {
  assets: Asset[];
  searchQuery?: string;
}

interface CategoryData {
  category: string;
  totalDrainRate: number;
  assets: Array<{
    id: string;
    name: string;
    batteryLevel: number;
    drainRate: number;
  }>;
}

export default function CategoryBatteryDrainD3({ assets, searchQuery }: CategoryBatteryDrainD3Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<CategoryData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Compute category-level drain statistics
  const data: CategoryData[] = React.useMemo(() => {
    const categories = ['Projector', 'Switch', 'Radio', 'DMX', 'Speaker', 'Pyrotechnics'];
    const baseDrainRates: Record<string, number> = {
      'Projector': 5.2,
      'Switch': 1.5,
      'Radio': 3.0,
      'DMX': 4.1,
      'Speaker': 2.4,
      'Pyrotechnics': 6.5
    };

    return categories.map(cat => {
      const catAssets = assets.filter(a => a.category === cat && a.batteryLevel !== undefined);
      
      const contributors = catAssets.map(asset => {
        const baseR = baseDrainRates[cat] ?? 2.5;
        let idHashVal = 0;
        if (asset.id) {
          for (let i = 0; i < asset.id.length; i++) {
            idHashVal += asset.id.charCodeAt(i);
          }
        }
        const assetVariance = 0.8 + (idHashVal % 5) * 0.1; // 0.8 to 1.2
        const drainRate = parseFloat((baseR * assetVariance).toFixed(2));
        return {
          id: asset.id,
          name: asset.name,
          batteryLevel: asset.batteryLevel ?? 100,
          drainRate
        };
      }).sort((a, b) => b.drainRate - a.drainRate);

      const totalDrainRate = parseFloat(contributors.reduce((sum, item) => sum + item.drainRate, 0).toFixed(2));

      return {
        category: cat,
        totalDrainRate,
        assets: contributors
      };
    });
  }, [assets]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear previous elements
    d3.select(svgRef.current).selectAll('*').remove();

    // Get real container width
    const containerWidth = containerRef.current.getBoundingClientRect().width || 400;
    const height = 180;
    const margin = { top: 15, right: 15, bottom: 25, left: 35 };
    const width = containerWidth;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('overflow', 'visible');

    // Create scales
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.category))
      .range([margin.left, width - margin.right])
      .padding(0.3);

    const maxDrain = d3.max(data, d => d.totalDrainRate) || 10;
    const yScale = d3.scaleLinear()
      .domain([0, maxDrain * 1.1]) // Add some head room
      .range([height - margin.bottom, margin.top]);

    // Create Gradients for bars
    const defs = svg.append('defs');
    
    // Rose-violet gradient
    const gradient = defs.append('linearGradient')
      .attr('id', 'bar-gradient')
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#312e81') // deep indigo
      .attr('stop-opacity', 0.6);
      
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#f43f5e') // vibrant rose
      .attr('stop-opacity', 0.95);

    // Draw grid lines
    svg.append('g')
      .attr('class', 'grid-lines')
      .attr('stroke', '#1e293b')
      .attr('stroke-opacity', 0.5)
      .selectAll('line')
      .data(yScale.ticks(4))
      .enter()
      .append('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d));

    // Draw Axes
    const xAxis = d3.axisBottom(xScale).tickSize(0);
    const yAxis = d3.axisLeft(yScale).ticks(4).tickFormat(d => `${d}%`);

    svg.append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(xAxis)
      .attr('color', '#64748b')
      .selectAll('text')
      .style('font-family', 'monospace')
      .style('font-size', '8px')
      .style('font-weight', 'bold')
      .attr('dy', '8px');

    svg.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis)
      .attr('color', '#64748b')
      .selectAll('text')
      .style('font-family', 'monospace')
      .style('font-size', '7px');

    // Remove axis lines for cleaner minimalist look
    svg.selectAll('.domain').remove();

    // Draw Bars
    const barGroups = svg.selectAll('.bar-group')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'bar-group');

    const matchesSearch = (categoryName: string) => {
      if (!searchQuery) return true;
      return categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    };

    barGroups.append('rect')
      .attr('x', d => xScale(d.category) || 0)
      .attr('y', height - margin.bottom)
      .attr('width', xScale.bandwidth())
      .attr('height', 0)
      .attr('fill', 'url(#bar-gradient)')
      .attr('rx', 4)
      .attr('cursor', 'pointer')
      .attr('fill-opacity', d => matchesSearch(d.category) ? 1.0 : 0.15)
      .on('mouseover', function(event, d) {
        if (!matchesSearch(d.category)) return;
        d3.select(this)
          .transition()
          .duration(150)
          .attr('fill-opacity', 0.8)
          .attr('stroke', '#fda4af')
          .attr('stroke-width', 1.5);
        
        setHoveredCategory(d);
      })
      .on('mousemove', function(event) {
        const [mx, my] = d3.pointer(event, containerRef.current);
        setTooltipPos({ x: mx + 15, y: my - 20 });
      })
      .on('mouseout', function() {
        const d = d3.select(this).datum() as CategoryData;
        d3.select(this)
          .transition()
          .duration(150)
          .attr('fill-opacity', matchesSearch(d.category) ? 1 : 0.15)
          .attr('stroke', 'none');
          
        setHoveredCategory(null);
      })
      .transition()
      .duration(800)
      .delay((d, i) => i * 80)
      .attr('y', d => yScale(d.totalDrainRate))
      .attr('height', d => Math.max(2, height - margin.bottom - yScale(d.totalDrainRate)));

    // Labels on top of bars
    barGroups.append('text')
      .attr('x', d => (xScale(d.category) || 0) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.totalDrainRate) - 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#f43f5e')
      .style('font-family', 'monospace')
      .style('font-size', '8px')
      .style('font-weight', 'bold')
      .style('opacity', 0)
      .text(d => d.totalDrainRate > 0 ? `${d.totalDrainRate}%` : '')
      .transition()
      .duration(800)
      .delay((d, i) => i * 80 + 300)
      .style('opacity', d => matchesSearch(d.category) ? 1 : 0.15);

  }, [data, searchQuery]);

  return (
    <div ref={containerRef} className="relative w-full bg-slate-950/20 p-3.5 border border-slate-900 rounded-lg space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-sans font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
          <BatteryCharging className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          Real-Time Battery Drain Rates
        </span>
        <span className="text-[8px] font-mono text-slate-500 uppercase">D3 Visualization</span>
      </div>

      <div className="relative">
        <svg ref={svgRef} className="w-full"></svg>

        {/* Hover Tooltip Overlay */}
        {hoveredCategory && (
          <div 
            className="absolute z-50 bg-slate-900 border border-slate-700/80 rounded-lg p-3 shadow-xl pointer-events-none max-w-[240px] text-[10px]"
            style={{ 
              left: `${tooltipPos.x}px`, 
              top: `${tooltipPos.y}px`,
              transform: 'translateY(-50%)'
            }}
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 mb-2">
              <span className="font-sans font-bold text-slate-100 text-[11px]">{hoveredCategory.category}</span>
              <span className="font-mono text-rose-400 font-bold bg-rose-950/20 px-1 py-0.2 rounded border border-rose-950/30">
                {hoveredCategory.totalDrainRate}% / hr
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="text-[8px] uppercase font-mono text-slate-500 font-bold">Wireless Contributors ({hoveredCategory.assets.length})</div>
              {hoveredCategory.assets.length === 0 ? (
                <div className="text-slate-500 italic">No wireless nodes active in category</div>
              ) : (
                <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                  {hoveredCategory.assets.map(asset => (
                    <div key={asset.id} className="flex justify-between items-center text-[9px] bg-slate-950/50 p-1 rounded border border-slate-850">
                      <span className="text-slate-300 truncate max-w-[120px]">{asset.name}</span>
                      <div className="flex gap-1 text-slate-400 font-mono">
                        <span className="text-emerald-400 font-bold">{asset.batteryLevel}%</span>
                        <span>({asset.drainRate}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500">
        <Info className="w-3 h-3 text-slate-600" />
        <span>Hover over columns to query individual contributing wireless assets and their live discharge telemetry.</span>
      </div>
    </div>
  );
}
