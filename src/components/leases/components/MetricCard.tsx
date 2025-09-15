import React from 'react';

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'indigo';
}

const colorStyles = {
  blue: 'bg-blue-50 border-blue-200 text-blue-600',
  green: 'bg-green-50 border-green-200 text-green-600',
  yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
  purple: 'bg-purple-50 border-purple-200 text-purple-600',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-600',
};

export function MetricCard({ icon, title, value, color }: MetricCardProps) {
  const textColorClass = `text-${color}-800`;
  const valueColorClass = `text-${color}-900`;

  return (
    <div className={`border rounded-lg p-4 ${colorStyles[color]}`}>
      <div className="flex items-center">
        <div className="mr-2">{icon}</div>
        <div>
          <p className={`text-sm font-medium ${textColorClass}`}>{title}</p>
          <p className={`text-xl font-semibold ${valueColorClass}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}