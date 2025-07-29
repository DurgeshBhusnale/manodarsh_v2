import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RiskTrendsChartProps {
  labels: string[];
  riskLevels: {
    low: number[];
    medium: number[];
    high: number[];
    critical: number[];
  };
}

const RiskTrendsChart: React.FC<RiskTrendsChartProps> = ({ labels, riskLevels }) => {
  // Prepare data for recharts
  const data = labels.map((label, idx) => ({
    name: label,
    Low: riskLevels.low[idx],
    Medium: riskLevels.medium[idx],
    High: riskLevels.high[idx],
    Critical: riskLevels.critical[idx],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="Low" stroke="#22c55e" strokeWidth={2} />
        <Line type="monotone" dataKey="Medium" stroke="#eab308" strokeWidth={2} />
        <Line type="monotone" dataKey="High" stroke="#f97316" strokeWidth={2} />
        <Line type="monotone" dataKey="Critical" stroke="#ef4444" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default RiskTrendsChart;
