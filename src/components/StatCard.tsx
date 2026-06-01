import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: 'default' | 'green' | 'orange' | 'red' | 'blue';
  icon?: ReactNode;
}

export function StatCard({ label, value, sub, accent = 'default', icon }: StatCardProps) {
  return (
    <div className={`stat-card accent-${accent}`}>
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        {icon && <span className="stat-card__icon">{icon}</span>}
      </div>
      <div className="stat-card__value">{value}</div>
      {sub != null && <div className="stat-card__sub">{sub}</div>}
    </div>
  );
}
