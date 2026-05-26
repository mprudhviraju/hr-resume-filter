import { type LucideIcon } from 'lucide-react';

export interface StatCardItem {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: 'ocean' | 'green' | 'red' | 'amber' | 'purple';
  icon?: LucideIcon;
}

const valueColorMap: Record<string, string> = {
  ocean: 'var(--color-ocean-600)',
  green: 'var(--color-success-600)',
  red: 'var(--color-error-600)',
  amber: 'var(--color-warning-600)',
  purple: 'rgb(147, 51, 234)',
};

export function StatCards({ items }: { items: StatCardItem[] }) {
  return (
    <div
      role="region"
      aria-label="Metrics dashboard"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        gap: 'var(--metric-card-gap)',
        justifyItems: 'stretch',
        alignItems: 'stretch',
        marginBottom: 'var(--metric-grid-margin-bottom)',
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '2px',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={i}
            style={{
              padding: 'var(--metric-card-padding)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '0.5rem',
              minHeight: 'var(--metric-card-min-height)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Title */}
            <div
              style={{
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: 500,
                textAlign: 'center',
                marginBottom: 'var(--metric-title-margin-bottom)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem',
              }}
            >
              {item.label}
              {Icon && <Icon size={14} style={{ color: 'var(--text-muted)' }} />}
            </div>

            {/* Value */}
            <div
              style={{
                color: valueColorMap[item.color || 'ocean'],
                fontSize: '1.5rem',
                fontWeight: 700,
                lineHeight: 1,
                minHeight: 'var(--metric-value-min-height)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--metric-value-margin-bottom)',
              }}
            >
              {item.value}
            </div>

            {/* Subtitle */}
            {item.subtitle && (
              <div
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 400,
                  textAlign: 'center',
                }}
              >
                {item.subtitle}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
