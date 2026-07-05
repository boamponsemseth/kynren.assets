import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { Asset } from '../types';

interface D3BatterySignalChartProps {
  asset: Asset;
}

export interface TelemetryDataPoint {
  day: string;
  battery: number;
  latency: number;
}

export default function D3BatterySignalChart({ asset }: D3BatterySignalChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  // Generate deterministic 7-day history data
  const data = React.useMemo<TelemetryDataPoint[]>(() => {
    const pts: TelemetryDataPoint[] = [];
    const currentLevel = asset.batteryLevel ?? 85;
    // Generate deterministic values based on asset.id so they look stable
    const seed = asset.id.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      // Simulated charge level: varies between 20 and 100
      let bat = Math.round(currentLevel - i * 1.5 + Math.sin(i * 1.3 + seed) * 12);
      bat = Math.max(10, Math.min(100, bat));
      
      // Simulated latency: varies between 10ms and 150ms
      let lat = Math.round(35 + (seed % 45) + Math.cos(i * 1.7 + seed) * 20);
      lat = Math.max(5, lat);

      pts.push({ day: label, battery: bat, latency: lat });
    }
    return pts;
  }, [asset]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear previous elements
    d3.select(svgRef.current).selectAll('*').remove();

    const margin = { top: 25, right: 45, bottom: 35, left: 40 };
    const width = containerRef.current.clientWidth - margin.left - margin.right;
    const height = 180 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', containerRef.current.clientWidth)
      .attr('height', 180)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scalePoint()
      .domain(data.map(d => d.day))
      .range([0, width]);

    const yLeftScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    const maxLatency = d3.max(data, (d: TelemetryDataPoint) => d.latency) || 150;
    const yRightScale = d3.scaleLinear()
      .domain([0, Math.ceil(maxLatency / 50) * 50])
      .range([height, 0]);

    // Gridlines (Y left scale)
    svg.append('g')
      .attr('class', 'grid')
      .attr('opacity', 0.1)
      .attr('stroke', '#475569')
      .call(
        d3.axisLeft(yLeftScale)
          .tickSize(-width)
          .tickFormat(() => '')
      );

    // Axes
    const xAxis = d3.axisBottom(xScale).tickSize(4);
    const yLeftAxis = d3.axisLeft(yLeftScale).ticks(5).tickFormat(d => `${d}%`);
    const yRightAxis = d3.axisRight(yRightScale).ticks(5).tickFormat(d => `${d}ms`);

    // Append X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .attr('class', 'axis-x text-slate-400 font-mono text-[9px]')
      .call(xAxis)
      .selectAll('text')
      .style('fill', '#94a3b8');

    // Append Left Y axis
    svg.append('g')
      .attr('class', 'axis-left text-slate-400 font-mono text-[9px]')
      .call(yLeftAxis)
      .selectAll('text')
      .style('fill', '#94a3b8');

    // Append Right Y axis
    svg.append('g')
      .attr('transform', `translate(${width}, 0)`)
      .attr('class', 'axis-right text-slate-400 font-mono text-[9px]')
      .call(yRightAxis)
      .selectAll('text')
      .style('fill', '#94a3b8');

    // Line generator for Battery (Left Axis)
    const batteryLine = d3.line<TelemetryDataPoint>()
      .x(d => xScale(d.day) || 0)
      .y(d => yLeftScale(d.battery))
      .curve(d3.curveMonotoneX);

    // Line generator for Latency (Right Axis)
    const latencyLine = d3.line<TelemetryDataPoint>()
      .x(d => xScale(d.day) || 0)
      .y(d => yRightScale(d.latency))
      .curve(d3.curveMonotoneX);

    // Add gradients for line paths (glow effects)
    const defs = svg.append('defs');
    
    const batGlow = defs.append('linearGradient')
      .attr('id', 'bat-line-grad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%');
    batGlow.append('stop').attr('offset', '0%').attr('stop-color', '#10b981');
    batGlow.append('stop').attr('offset', '100%').attr('stop-color', '#34d399');

    const latGlow = defs.append('linearGradient')
      .attr('id', 'lat-line-grad')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%');
    latGlow.append('stop').attr('offset', '0%').attr('stop-color', '#6366f1');
    latGlow.append('stop').attr('offset', '100%').attr('stop-color', '#a5b4fc');

    // Draw Battery Line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'url(#bat-line-grad)')
      .attr('stroke-width', 2.5)
      .attr('d', batteryLine)
      .attr('filter', 'drop-shadow(0px 2px 4px rgba(16, 185, 129, 0.3))');

    // Draw Latency Line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'url(#lat-line-grad)')
      .attr('stroke-width', 2.5)
      .attr('d', latencyLine)
      .attr('filter', 'drop-shadow(0px 2px 4px rgba(99, 102, 241, 0.3))');

    // Draw Battery Dots
    svg.selectAll('.bat-dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'bat-dot')
      .attr('cx', (d: TelemetryDataPoint) => xScale(d.day) || 0)
      .attr('cy', (d: TelemetryDataPoint) => yLeftScale(d.battery))
      .attr('r', 3.5)
      .attr('fill', '#020617')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 1.5);

    // Draw Latency Dots
    svg.selectAll('.lat-dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'lat-dot')
      .attr('cx', (d: TelemetryDataPoint) => xScale(d.day) || 0)
      .attr('cy', (d: TelemetryDataPoint) => yRightScale(d.latency))
      .attr('r', 3.5)
      .attr('fill', '#020617')
      .attr('stroke', '#6366f1')
      .attr('stroke-width', 1.5);

    // Create tracking overlays for tooltips
    const pointerGroup = svg.append('g').style('display', 'none');
    pointerGroup.append('line')
      .attr('stroke', '#475569')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')
      .attr('y1', 0)
      .attr('y2', height);

    // Invisible rectangle for overlay pointer events
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent')
      .on('pointerover pointermove', (event) => {
        pointerGroup.style('display', null);
        const [mx] = d3.pointer(event);
        
        // Find nearest point
        const domain = data.map(d => d.day);
        const range = xScale.range();
        const step = (range[1] - range[0]) / (domain.length - 1);
        const idx = Math.min(domain.length - 1, Math.max(0, Math.round(mx / step)));
        const d = data[idx];
        const cx = xScale(d.day) || 0;

        pointerGroup.select('line')
          .attr('x1', cx)
          .attr('x2', cx);

        setTooltip({
          x: event.clientX,
          y: event.clientY,
          content: `${d.day} : Charge ${d.battery}% | Latency ${d.latency}ms`
        });
      })
      .on('pointerout', () => {
        pointerGroup.style('display', 'none');
        setTooltip(null);
      });

  }, [data]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex justify-between items-center mb-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          Battery Level (%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
          Signal Latency (ms)
        </span>
      </div>
      <svg ref={svgRef} className="overflow-visible" />
      {tooltip && (
        <div 
          className="fixed z-50 bg-slate-950/95 border border-slate-850 text-slate-100 px-2.5 py-1.5 rounded text-[10px] font-mono pointer-events-none shadow-xl backdrop-blur-sm whitespace-nowrap"
          style={{ left: `${tooltip.x + 12}px`, top: `${tooltip.y - 12}px` }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
