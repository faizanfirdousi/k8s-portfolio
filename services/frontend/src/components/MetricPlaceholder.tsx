interface MetricPlaceholderProps {
  label: string;
  hint?: string;
  variant?: 'inline' | 'block';
}

export default function MetricPlaceholder({
  label,
  hint = 'Coming soon',
  variant = 'inline',
}: MetricPlaceholderProps) {
  return (
    <div className={`metric-placeholder metric-placeholder--${variant}`}>
      <span className="metric-placeholder__label">{label}</span>
      <span className="metric-placeholder__value">—</span>
      <span className="metric-placeholder__hint">{hint}</span>
    </div>
  );
}
