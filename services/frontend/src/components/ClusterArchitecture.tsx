import type { TopologyPod } from '../hooks/useTopology';
import type { PodRef } from '../types/topology';

interface ClusterArchitectureProps {
  pods: TopologyPod[];
  onPodClick: (ref: PodRef) => void;
}

interface StackProps {
  ns: string;
  color: string;
  label: string;
  pod?: TopologyPod;
  highlighted?: boolean;
  onPodClick?: (ref: PodRef) => void;
}

function NamespaceStack({ ns, color, label, pod, highlighted, onPodClick }: StackProps) {
  const podName = pod?.name ?? `${ns}-pod`;
  const status = pod?.status ?? 'Pending';
  const ready = pod?.ready ?? '—/—';

  const handleClick = () => {
    if (pod && onPodClick) {
      onPodClick({ namespace: pod.namespace, name: pod.name });
    }
  };

  return (
    <div className={`arch-stack arch-stack--${color} ${highlighted ? 'arch-stack--highlight' : ''}`}>
      <div className="arch-stack__ns">
        <span className="arch-stack__ns-label">namespace</span>
        <span className="arch-stack__ns-name mono">{label}</span>
      </div>

      <div
        className={`arch-stack__block arch-stack__block--pod ${pod ? 'arch-stack__block--clickable' : ''}`}
        onClick={handleClick}
        role={pod ? 'button' : undefined}
        tabIndex={pod ? 0 : undefined}
        onKeyDown={pod ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick();
        } : undefined}
      >
        <div className="arch-stack__block-top" />
        <div className="arch-stack__block-face">
          <span className="arch-stack__block-type">pod</span>
          <span className="arch-stack__block-name mono">{podName.slice(0, 16)}</span>
          <span className={`arch-stack__status ${status === 'Running' ? 'running' : ''}`}>
            {ready} {status}
          </span>
          <div className="arch-stack__metrics">
            <div className="arch-stack__metric-item">
              <span className="arch-stack__metric-label">Restarts</span>
              <span className={`arch-stack__metric-value mono ${(pod?.restarts ?? 0) > 0 ? 'warn' : ''}`}>
                {pod ? pod.restarts : '—'}
              </span>
            </div>
            <div className="arch-stack__metric-item">
              <span className="arch-stack__metric-label">Age</span>
              <span className="arch-stack__metric-value mono">{pod?.age ?? '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="arch-stack__connector" />

      <div className="arch-stack__block arch-stack__block--svc">
        <div className="arch-stack__block-top" />
        <div className="arch-stack__block-face">
          <span className="arch-stack__block-type">svc</span>
          <span className="arch-stack__block-name mono">{ns}-svc</span>
          <span className="arch-stack__status running">ClusterIP</span>
        </div>
      </div>
    </div>
  );
}

const SECTIONS = [
  { ns: 'about', color: 'purple', label: 'about' },
  { ns: 'projects', color: 'blue', label: 'projects' },
  { ns: 'blog', color: 'green', label: 'blog' },
  { ns: 'contact', color: 'orange', label: 'contact' },
];

export default function ClusterArchitecture({ pods, onPodClick }: ClusterArchitectureProps) {
  const podByNs = Object.fromEntries(
    SECTIONS.map(({ ns }) => [ns, pods.find((p) => p.namespace === ns)])
  );
  const frontendPod = pods.find((p) => p.namespace === 'frontend');
  const proxyPod = pods.find((p) => p.namespace === 'proxy');

  return (
    <div className="arch-diagram">
      <svg className="arch-diagram__lines" viewBox="0 0 900 520" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(99,102,241,0.6)" />
            <stop offset="100%" stopColor="rgba(99,102,241,0.1)" />
          </linearGradient>
        </defs>
        {/* Ingress → section namespaces */}
        {[120, 300, 480, 660].map((x) => (
          <path
            key={x}
            d={`M450 70 L450 110 L${x} 110 L${x} 140`}
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        ))}
        {/* Ingress → bottom row */}
        <path d="M450 70 L450 380 L280 380 L280 400" fill="none" stroke="url(#lineGrad)" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d="M450 380 L620 380 L620 400" fill="none" stroke="url(#lineGrad)" strokeWidth="1.5" strokeDasharray="4 4" />
      </svg>

      <div className="arch-diagram__ingress">
        <div className="arch-ingress glass-panel">
          <span className="arch-ingress__label">ingress</span>
          <span className="arch-ingress__name mono">traefik</span>
          <span className="arch-ingress__status running">Running</span>
        </div>
      </div>

      <div className="arch-diagram__sections">
        {SECTIONS.map(({ ns, color, label }) => (
          <NamespaceStack
            key={ns}
            ns={ns}
            color={color}
            label={label}
            pod={podByNs[ns]}
            onPodClick={onPodClick}
          />
        ))}
      </div>

      <div className="arch-diagram__bottom">
        <NamespaceStack
          ns="proxy"
          color="red"
          label="proxy"
          pod={proxyPod}
          onPodClick={onPodClick}
        />

        <div className="arch-you-are-here">
          <svg className="arch-you-are-here__arrow" viewBox="0 0 120 80" fill="none">
            <path
              d="M10 70 Q60 10 110 30"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="2"
              strokeDasharray="6 4"
              fill="none"
            />
            <polygon points="105,25 115,32 105,38" fill="rgba(255,255,255,0.5)" />
          </svg>
          <span className="arch-you-are-here__label">This is where you are!</span>
        </div>

        <NamespaceStack
          ns="frontend"
          color="teal"
          label="frontend"
          pod={frontendPod}
          highlighted
          onPodClick={onPodClick}
        />
      </div>
    </div>
  );
}
