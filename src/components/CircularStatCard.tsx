import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CircularStatCardProps {
  title: string;
  value: number;
  unit?: string;
  color?: string;
  size?: number;
}

export function CircularStatCard({ 
  title, 
  value, 
  unit = '%', 
  color = '#10b981',
  size = 120 
}: CircularStatCardProps) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600 text-white overflow-hidden relative">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white/80">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center pb-6">
        <div className="relative" style={{ width: size, height: size }}>
          {/* Background Circle */}
          <svg
            className="transform -rotate-90"
            width={size}
            height={size}
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress Circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: 'stroke-dashoffset 0.5s ease-in-out',
              }}
            />
          </svg>
          {/* Center Text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">
              {value}{unit}
            </span>
          </div>
        </div>
      </CardContent>
      
      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-bl-full" />
    </Card>
  );
}
