import { type LucideIcon } from 'lucide-react';

export interface StatCardItem {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: 'green' | 'red' | 'blue' | 'amber' | 'gray';
  icon?: LucideIcon;
}

const colorMap = {
  green: 'text-emerald-600',
  red: 'text-red-500',
  blue: 'text-indigo-600',
  amber: 'text-amber-500',
  gray: 'text-gray-600',
};

export function StatCards({ items }: { items: StatCardItem[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="grid divide-x divide-gray-200" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="px-5 py-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="text-xs text-gray-500 font-medium">{item.label}</span>
                {Icon && <Icon size={13} className="text-gray-300" />}
              </div>
              <div className={`text-xl font-bold ${colorMap[item.color || 'blue']}`}>
                {item.value}
              </div>
              {item.subtitle && (
                <div className="text-[10px] text-gray-400 mt-0.5">{item.subtitle}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
