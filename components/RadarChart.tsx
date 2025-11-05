
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface RadarChartProps {
  data: {
    category: string;
    weight: number;
  }[];
}

const RadarChartComponent: React.FC<RadarChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <defs>
          <radialGradient id="colorUv">
            <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.5}/>
          </radialGradient>
        </defs>
        <PolarGrid stroke="#475569" />
        <PolarAngleAxis 
          dataKey="category" 
          tick={{ fill: '#94a3b8', fontSize: 12 }} 
          tickFormatter={(value) => value.split(' & ')[0]} // Shorten labels
        />
        <PolarRadiusAxis 
          angle={30} 
          domain={[0, 100]} 
          tick={{ fill: '#94a3b8', fontSize: 10 }}
        />
        <Radar 
          name="Weight" 
          dataKey="weight" 
          stroke="#3b82f6" 
          fill="url(#colorUv)" 
          fillOpacity={0.6}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            borderColor: '#475569',
            borderRadius: '0.5rem',
          }}
          labelStyle={{ color: '#cbd5e1' }}
          formatter={(value) => [`${value}%`, 'Weight']}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default RadarChartComponent;
