import React from 'react';
import { Activity, ShieldAlert, Clock, CheckCircle2, XCircle, Slash, Layers } from 'lucide-react';
import type { SimulationState } from '../types';

interface TelemetryHudProps {
  simState: SimulationState;
  nodesCount?: number;
}

export const TelemetryHud: React.FC<TelemetryHudProps> = ({ simState, nodesCount = 1 }) => {
  const isIdleCanvas = nodesCount === 0;

  const getHealthClass = (health: number) => {
    if (isIdleCanvas) return 'health-idle';
    if (health >= 85) return 'health-excellent';
    if (health >= 60) return 'health-warning';
    return 'health-critical';
  };

  const total = simState.successfulPackets + simState.failedPackets + simState.throttledPackets;
  const successPercent = total > 0 ? ((simState.successfulPackets / total) * 100) : 100;
  const throttledPercent = total > 0 ? ((simState.throttledPackets / total) * 100) : 0;
  const failedPercent = total > 0 ? ((simState.failedPackets / total) * 100) : 0;

  return (
    <section className="telemetry-hud" aria-label="System Telemetry Overview">
      {/* 1. Health Score */}
      <div className={`hud-metric-card hud-card-health ${getHealthClass(simState.systemHealthPercent)}`}>
        <div className="hud-metric-icon">
          <Activity size={18} />
        </div>
        <div className="hud-metric-content">
          <span className="hud-metric-label">System Health</span>
          <div className="hud-metric-value-row">
            <span className="hud-metric-value hud-tnum">{isIdleCanvas ? '--' : `${simState.systemHealthPercent}%`}</span>
            <span className="hud-status-badge">
              {isIdleCanvas ? 'IDLE' : simState.systemHealthPercent >= 85 ? 'HEALTHY' : simState.systemHealthPercent >= 60 ? 'DEGRADED' : 'CRITICAL'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Throughput */}
      <div className="hud-metric-card hud-card-throughput">
        <div className="hud-metric-icon icon-blue">
          <Activity size={18} />
        </div>
        <div className="hud-metric-content">
          <span className="hud-metric-label">Ingress Throughput</span>
          <div className="hud-metric-value-row">
            <span className="hud-metric-value text-cyan hud-tnum">{simState.targetRps.toLocaleString()}</span>
            <span className="hud-metric-unit">req/s</span>
          </div>
        </div>
      </div>

      {/* 3. Latency Percentiles (Fixed Width) */}
      <div className="hud-metric-card hud-card-latency">
        <div className="hud-metric-icon icon-purple">
          <Clock size={18} />
        </div>
        <div className="hud-metric-content">
          <span className="hud-metric-label">Latency Distribution</span>
          <div className="hud-latency-row">
            <span className="latency-item"><small>p50:</small> <span className="hud-tnum">{simState.p50LatencyMs}</span>ms</span>
            <span className="latency-item"><small>p95:</small> <span className="hud-tnum">{simState.p95LatencyMs}</span>ms</span>
            <span className="latency-item latency-p99"><small>p99:</small> <span className="hud-tnum">{simState.p99LatencyMs}</span>ms</span>
          </div>
        </div>
      </div>

      {/* 4. Active Circuit Breakers */}
      <div className={`hud-metric-card hud-card-breakers ${simState.activeCircuitBreakers > 0 ? 'card-alert' : ''}`}>
        <div className="hud-metric-icon icon-amber">
          <ShieldAlert size={18} />
        </div>
        <div className="hud-metric-content">
          <span className="hud-metric-label">Circuit Breakers</span>
          <div className="hud-metric-value-row">
            <span className={`hud-metric-value hud-tnum ${simState.activeCircuitBreakers > 0 ? 'text-amber' : ''}`}>
              {simState.activeCircuitBreakers}
            </span>
            <span className="hud-metric-unit">Tripped</span>
          </div>
        </div>
      </div>

      {/* 5. Total Scaled Replicas */}
      <div className="hud-metric-card hud-card-replicas">
        <div className="hud-metric-icon icon-emerald">
          <Layers size={18} />
        </div>
        <div className="hud-metric-content">
          <span className="hud-metric-label">Active Replicas</span>
          <div className="hud-metric-value-row">
            <span className="hud-metric-value text-emerald hud-tnum">{simState.totalReplicas}</span>
            <span className="hud-metric-unit">Pods</span>
          </div>
        </div>
      </div>

      {/* 6. Redesigned Premium Packet Breakdown Card (Fixed Width) */}
      <div className="hud-packet-breakdown-card hud-card-packets">
        <div className="packet-columns-grid">
          <div className="packet-col packet-ok">
            <div className="packet-col-header">
              <CheckCircle2 size={12} className="text-emerald" />
              <span>OK</span>
            </div>
            <strong className="packet-col-count hud-tnum">{simState.successfulPackets.toLocaleString()}</strong>
          </div>

          <div className="packet-col-divider" />

          <div className="packet-col packet-drop">
            <div className="packet-col-header">
              <Slash size={12} className="text-amber" />
              <span>DROP</span>
            </div>
            <strong className="packet-col-count text-amber hud-tnum">{simState.throttledPackets.toLocaleString()}</strong>
          </div>

          <div className="packet-col-divider" />

          <div className="packet-col packet-fail">
            <div className="packet-col-header">
              <XCircle size={12} className="text-crimson" />
              <span>FAIL</span>
            </div>
            <strong className="packet-col-count text-crimson hud-tnum">{simState.failedPackets.toLocaleString()}</strong>
          </div>
        </div>

        {/* Mini Stacked Progress Indicator */}
        <div className="packet-stacked-bar">
          <div className="stacked-segment seg-ok" style={{ width: `${successPercent}%` }} title={`OK: ${successPercent.toFixed(1)}%`} />
          <div className="stacked-segment seg-drop" style={{ width: `${throttledPercent}%` }} title={`Throttled: ${throttledPercent.toFixed(1)}%`} />
          <div className="stacked-segment seg-fail" style={{ width: `${failedPercent}%` }} title={`Failed: ${failedPercent.toFixed(1)}%`} />
        </div>
      </div>
    </section>
  );
};
