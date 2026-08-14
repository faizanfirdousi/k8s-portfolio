import { MapPin, Briefcase, BookOpen } from 'lucide-react';
import ClusterArchitecture from './ClusterArchitecture';
import type { TopologyPod } from '../hooks/useTopology';

interface MainContentProps {
  pods: TopologyPod[];
  clusterHealthy: boolean;
}

export default function MainContent({ pods, clusterHealthy }: MainContentProps) {
  return (
    <main className="dash-main">
      <section className="dash-main__hero">
        <p className="dash-main__whoami mono">$ whoami</p>
        <h1 className="dash-main__title">Engineer. Problem Solver. Lifelong Learner.</h1>
        <p className="dash-main__subtitle">
          This portfolio is running on a real Kubernetes cluster — each section is a
          dedicated pod, routed via Traefik.
        </p>

        <div className="dash-main__badges">
          <span className="info-badge">
            <MapPin size={13} />
            Location: India
          </span>
          <span className="info-badge">
            <Briefcase size={13} />
            Role: Cloud • DevOps • Platform
          </span>
          <span className="info-badge">
            <BookOpen size={13} />
            Learning: Always
          </span>
        </div>

        <div className={`dash-main__status ${clusterHealthy ? 'healthy' : ''}`}>
          <span className="dash-main__status-dot" />
          {clusterHealthy ? 'All systems operational' : 'Connecting to cluster…'}
        </div>
      </section>

      <section className="dash-main__diagram glass-panel">
        <ClusterArchitecture pods={pods} />
      </section>

      <blockquote className="dash-main__quote glass-panel">
        "The best way to predict the future is to build it. — Kubernetes makes it possible."
      </blockquote>
    </main>
  );
}
