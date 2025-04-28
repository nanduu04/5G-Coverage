import React, { useRef, useEffect } from 'react';
import * as Plot from "@observablehq/plot";
import { extent, format } from "d3";

interface CoveragePoint {
  type: string;
  properties: {
    operator: string;
    city_name: string;
    status: string;
  };
  geometry: {
    type: string;
    coordinates: [string, string];
  };
}

interface CoverageVisualizationsProps {
  data: {
    type: string;
    features: CoveragePoint[];
  };
}

interface StatItem {
  name: string;
  value: number;
}

const CoverageVisualizations: React.FC<CoverageVisualizationsProps> = ({ data }) => {
  const top5OperatorsRef = useRef<HTMLDivElement>(null);
  const statusDistributionRef = useRef<HTMLDivElement>(null);
  const geographicDistributionRef = useRef<HTMLDivElement>(null);

  // Transform data for visualizations
  const operatorStats = React.useMemo(() => {
    const stats = new Map<string, number>();
    data.features.forEach(point => {
      const count = stats.get(point.properties.operator) || 0;
      stats.set(point.properties.operator, count + 1);
    });
    return Array.from(stats.entries()).map(([name, value]) => ({ name, value }));
  }, [data.features]);

  const statusStats = React.useMemo(() => {
    const stats = new Map<string, number>();
    data.features.forEach(point => {
      const count = stats.get(point.properties.status) || 0;
      stats.set(point.properties.status, count + 1);
    });
    return Array.from(stats.entries()).map(([name, value]) => ({ name, value }));
  }, [data.features]);

  // Top 5 Operators Chart
  const top5OperatorsChart = React.useMemo(() => {
    const top5 = operatorStats
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    return Plot.plot({
      marginTop: 8,
      marginLeft: 100,
      height: 200,
      width: 400,
      style: "overflow: hidden;",
      y: { label: null, tickSize: 0 },
      x: { label: "Number of Points", grid: true, tickSize: 0, tickPadding: 2 },
      marks: [
        Plot.barX(top5, {
          y: "name",
          x: "value",
          fill: "#9498a0",
          sort: { y: "x", reverse: true },
          tip: true,
          title: (d: StatItem) => `Operator: ${d.name}\nPoints: ${d.value}`
        })
      ]
    });
  }, [operatorStats]);

  // Status Distribution Chart
  const statusDistributionChart = React.useMemo(() => {
    return Plot.plot({
      marginTop: 8,
      marginLeft: 100,
      height: 200,
      width: 400,
      style: "overflow: hidden;",
      y: { label: null, tickSize: 0 },
      x: { label: "Number of Points", grid: true, tickSize: 0, tickPadding: 2 },
      marks: [
        Plot.barX(statusStats, {
          y: "name",
          x: "value",
          fill: "name",
          sort: { y: "x", reverse: true },
          tip: true,
          title: (d: StatItem) => `Status: ${d.name}\nPoints: ${d.value}`
        })
      ]
    });
  }, [statusStats]);

  // Geographic Distribution Heatmap
  const geographicDistributionChart = React.useMemo(() => {
    const points = data.features.map(point => ({
      longitude: parseFloat(point.geometry.coordinates[0]),
      latitude: parseFloat(point.geometry.coordinates[1])
    }));

    return Plot.plot({
      marginTop: 8,
      height: 400,
      width: 800,
      style: "overflow: hidden;",
      projection: {
        type: "albers-usa"
      },
      color: {
        type: "linear",
        scheme: "blues",
        legend: true
      },
      marks: [
        Plot.dot(points, {
          x: "longitude",
          y: "latitude",
          r: 2,
          fill: "density",
          tip: true
        })
      ]
    });
  }, [data.features]);

  // Update charts when data changes
  useEffect(() => {
    if (top5OperatorsRef.current) {
      top5OperatorsRef.current.innerHTML = '';
      top5OperatorsRef.current.appendChild(top5OperatorsChart);
    }
  }, [top5OperatorsChart]);

  useEffect(() => {
    if (statusDistributionRef.current) {
      statusDistributionRef.current.innerHTML = '';
      statusDistributionRef.current.appendChild(statusDistributionChart);
    }
  }, [statusDistributionChart]);

  useEffect(() => {
    if (geographicDistributionRef.current) {
      geographicDistributionRef.current.innerHTML = '';
      geographicDistributionRef.current.appendChild(geographicDistributionChart);
    }
  }, [geographicDistributionChart]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Coverage Data Visualizations</h2>
      
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div>
          <h3>Top 5 Operators</h3>
          <div ref={top5OperatorsRef} />
        </div>
        
        <div>
          <h3>Status Distribution</h3>
          <div ref={statusDistributionRef} />
        </div>
      </div>

      <div>
        <h3>Geographic Distribution</h3>
        <div ref={geographicDistributionRef} />
      </div>
    </div>
  );
};

export default CoverageVisualizations; 