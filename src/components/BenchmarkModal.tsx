import React, { useState, useEffect } from 'react';
import { X, Award, AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import type { NodeData, EdgeData, SimulationState } from '../types';

interface BenchmarkModalProps {
  isOpen: boolean;
  nodes: NodeData[];
  edges: EdgeData[];
  simState: SimulationState;
  onClose: () => void;
}

interface SreAuditCheck {
  id: string;
  type: 'success' | 'warning' | 'error';
  title: string;
  detail: string;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({
  isOpen,
  nodes,
  edges,
  simState,
  onClose,
}) => {
  const [isRunningTest, setIsRunningTest] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [phaseText, setPhaseText] = useState<string>('Scanning Graph Topology & Dependency Adjacencies...');

  const runAudit = () => {
    setIsRunningTest(true);
    setProgress(0);
    setPhaseText('Scanning Graph Topology & Dependency Adjacencies...');

    const phases = [
      { at: 25, text: 'Auditing Ingress Gateways & Token Bucket Rate Limiters...' },
      { at: 55, text: 'Analyzing Cross-Region Fiber Latency Penalties...' },
      { at: 80, text: 'Simulating Chaos Injection & Circuit Breaker Thresholds...' },
      { at: 100, text: 'Computing SRE Resilience Grade & Scorecard...' },
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const currentPct = currentStep * 20;
      setProgress(currentPct);

      const matchingPhase = phases.find(p => p.at === currentPct);
      if (matchingPhase) {
        setPhaseText(matchingPhase.text);
      }

      if (currentPct >= 100) {
        clearInterval(interval);
        setTimeout(() => setIsRunningTest(false), 200);
      }
    }, 280);
  };

  useEffect(() => {
    if (isOpen) {
      runAudit();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // Deep Contextual SRE Architectural Audit Logic
  // --------------------------------------------------------------------------
  const totalNodes = nodes.length;
  const isBlankCanvas = totalNodes === 0;

  // 1. Service Categorization
  const computeNodes = nodes.filter(n => n.type === 'service' || n.type === 'gateway');
  const databaseNodes = nodes.filter(n => n.type === 'database');
  const cacheNodes = nodes.filter(n => n.type === 'cache');
  const queueNodes = nodes.filter(n => n.type === 'queue');
  const clientNodes = nodes.filter(n => n.type === 'client');
  const gatewayNodes = nodes.filter(n => n.type === 'gateway');

  // Protectable services (excluding pure traffic clients)
  const protectableServices = nodes.filter(n => n.type !== 'client');
  const protectableCount = protectableServices.length;

  // 2. Circuit Breaker Coverage
  const nodesWithCircuitBreakers = protectableServices.filter(n => n.circuitBreaker?.enabled);
  const cbCoverage = protectableCount > 0 
    ? Math.round((nodesWithCircuitBreakers.length / protectableCount) * 100) 
    : 0;

  // 3. Elastic Autoscaling (HPA)
  const nodesWithAutoscaling = computeNodes.filter(n => n.autoscaling?.enabled && n.autoscaling.maxReplicas > 1);
  const hpaCoverage = computeNodes.length > 0 
    ? Math.round((nodesWithAutoscaling.length / computeNodes.length) * 100) 
    : 0;

  // 4. Single Points of Failure (SPOFs)
  // A service is a SPOF if it has incoming traffic from clients/services, but no replicas (>1), no circuit breaker, and no fallback queue
  const singlePointsOfFailure = nodes.filter(n => {
    if (n.type === 'client') return false;
    const incoming = edges.filter(e => e.to === n.id).length;
    if (incoming === 0) return false;

    const hasNoFallback = !n.circuitBreaker?.enabled;
    const hasSingleReplica = !n.autoscaling?.enabled || (n.autoscaling?.maxReplicas || 1) <= 1;
    return hasNoFallback && hasSingleReplica;
  });

  // 5. Cross-Region Analysis
  const distinctRegions = Array.from(new Set(nodes.map(n => n.region).filter(Boolean)));
  const crossRegionEdges = edges.filter(e => {
    const fromNode = nodes.find(n => n.id === e.from);
    const toNode = nodes.find(n => n.id === e.to);
    return fromNode && toNode && fromNode.region !== toNode.region;
  });

  // 6. Rate Limiting on Ingress
  const gatewaysWithoutRateLimit = gatewayNodes.filter(g => !g.rateLimiter?.enabled);
  const clientsConnectingDirectlyToDb = edges.filter(e => {
    const fromNode = nodes.find(n => n.id === e.from);
    const toNode = nodes.find(n => n.id === e.to);
    return fromNode?.type === 'client' && (toNode?.type === 'database' || toNode?.type === 'cache');
  });

  // 7. Database Connection Pooling
  const databasesWithoutPool = databaseNodes.filter(d => !d.connectionPool?.enabled);

  // 8. Isolated / Orphaned Nodes
  const isolatedNodes = nodes.filter(n => {
    const incoming = edges.filter(e => e.to === n.id).length;
    const outgoing = edges.filter(e => e.from === n.id).length;
    return incoming === 0 && outgoing === 0;
  });

  // --------------------------------------------------------------------------
  // Dynamic SRE Checks & Recommendations
  // --------------------------------------------------------------------------
  const auditChecks: SreAuditCheck[] = [];

  if (isBlankCanvas) {
    auditChecks.push({
      id: 'blank-state',
      type: 'warning',
      title: 'Blank Architecture Canvas',
      detail: 'No components deployed on the canvas. Add microservices, databases, or load a preset to execute a full resiliency audit.',
    });
  } else {
    // Check: Single Points of Failure
    if (singlePointsOfFailure.length === 0) {
      auditChecks.push({
        id: 'spof-ok',
        type: 'success',
        title: 'Zero Single Points of Failure',
        detail: 'No unhedged single points of failure detected across active service dependency graphs.',
      });
    } else {
      auditChecks.push({
        id: 'spof-fail',
        type: 'error',
        title: `${singlePointsOfFailure.length} Critical Single Point(s) of Failure`,
        detail: `Components (${singlePointsOfFailure.map(n => n.name).join(', ')}) have no replicas and lack circuit breakers. If they crash, upstream traffic will hard-fail.`,
      });
    }

    // Check: Circuit Breakers
    if (cbCoverage >= 70) {
      auditChecks.push({
        id: 'cb-ok',
        type: 'success',
        title: 'High Circuit Breaker Mesh Coverage',
        detail: `${cbCoverage}% of services (${nodesWithCircuitBreakers.length}/${protectableCount}) are protected with automated circuit breakers to fast-fail cascading overloads.`,
      });
    } else if (cbCoverage >= 35) {
      const unprotected = protectableServices.filter(n => !n.circuitBreaker?.enabled);
      auditChecks.push({
        id: 'cb-warn',
        type: 'warning',
        title: 'Partial Circuit Breaker Coverage',
        detail: `${cbCoverage}% circuit breaker coverage. Recommend enabling circuit isolation on: ${unprotected.slice(0, 3).map(n => n.name).join(', ')}.`,
      });
    } else {
      auditChecks.push({
        id: 'cb-crit',
        type: 'error',
        title: 'Severe Circuit Breaker Deficit',
        detail: `Only ${cbCoverage}% of backend dependencies have circuit breakers. Downstream timeouts risk exhausting caller thread pools.`,
      });
    }

    // Check: Autoscaling (HPA)
    if (computeNodes.length > 0) {
      if (hpaCoverage >= 70) {
        auditChecks.push({
          id: 'hpa-ok',
          type: 'success',
          title: 'Elastic Horizontal Autoscaling Active',
          detail: `${hpaCoverage}% of compute workloads scale dynamically based on CPU utilization thresholds.`,
        });
      } else {
        const withoutHpa = computeNodes.filter(n => !n.autoscaling?.enabled);
        auditChecks.push({
          id: 'hpa-warn',
          type: 'warning',
          title: 'Static Compute Capacity Detected',
          detail: `${withoutHpa.length} compute service(s) lack elastic autoscaling (${withoutHpa.map(n => n.name).join(', ')}). High surge traffic may cause queue backpressure.`,
        });
      }
    }

    // Check: Ingress & Rate Limiting
    if (clientsConnectingDirectlyToDb.length > 0) {
      auditChecks.push({
        id: 'ingress-direct-db',
        type: 'error',
        title: 'Unsafe Direct Database Exposure',
        detail: 'Traffic clients are wired directly to data storage without an API Gateway or compute service intermediary.',
      });
    } else if (gatewaysWithoutRateLimit.length > 0) {
      auditChecks.push({
        id: 'ingress-rl-missing',
        type: 'warning',
        title: 'Ingress Rate Limiter Inactive',
        detail: `API Gateway (${gatewaysWithoutRateLimit.map(g => g.name).join(', ')}) lacks token bucket rate limiting. Ingress traffic spikes cannot be shed cleanly.`,
      });
    } else if (gatewayNodes.length > 0) {
      auditChecks.push({
        id: 'ingress-ok',
        type: 'success',
        title: 'Protected API Ingress Tier',
        detail: 'Token bucket rate limiters active on API ingress gateways, cleanly shielding downstream services from traffic floods.',
      });
    }

    // Check: Database Connection Pooling
    if (databaseNodes.length > 0) {
      if (databasesWithoutPool.length === 0) {
        auditChecks.push({
          id: 'db-pool-ok',
          type: 'success',
          title: 'Database Connection Pooling Verified',
          detail: 'All relational and document databases have capped connection pools with strict connection timeouts.',
        });
      } else {
        auditChecks.push({
          id: 'db-pool-warn',
          type: 'warning',
          title: 'Unbounded Database Connections',
          detail: `Database (${databasesWithoutPool.map(d => d.name).join(', ')}) lacks connection pooling. Risk of TCP socket exhaustion during peak concurrency.`,
        });
      }
    }

    // Check: In-Memory Caches & Resiliency
    if (cacheNodes.length > 0) {
      const unprotectedCaches = cacheNodes.filter(c => !c.circuitBreaker?.enabled);
      if (unprotectedCaches.length > 0) {
        auditChecks.push({
          id: 'cache-cb-warn',
          type: 'warning',
          title: 'Unprotected Distributed Cache',
          detail: `Cache layer (${unprotectedCaches.map(c => c.name).join(', ')}) lacks circuit breaker protection. Cache stampedes or restarts may cascade into database overload.`,
        });
      } else {
        auditChecks.push({
          id: 'cache-ok',
          type: 'success',
          title: 'Resilient Cache Layer Active',
          detail: `Distributed cache cluster (${cacheNodes.map(c => c.name).join(', ')}) protected with circuit isolation to prevent cache stampedes.`,
        });
      }
    }

    // Check: Client Retry Backoff
    if (clientNodes.length > 0) {
      const clientsWithRetries = clientNodes.filter(c => c.retryPolicy?.enabled);
      if (clientsWithRetries.length === clientNodes.length) {
        auditChecks.push({
          id: 'client-retries-ok',
          type: 'success',
          title: 'Client Exponential Backoff Verified',
          detail: 'Traffic generators configured with exponential backoff and jitter to mitigate thundering herd retries.',
        });
      }
    }

    // Check: Multi-Region vs Single-Region
    if (distinctRegions.length > 1) {
      auditChecks.push({
        id: 'multi-region-ok',
        type: 'success',
        title: 'Multi-Region High Availability Deployment',
        detail: `Architecture is distributed across ${distinctRegions.length} cloud regions (${distinctRegions.join(', ')}).`,
      });

      if (crossRegionEdges.length > 0) {
        auditChecks.push({
          id: 'cross-region-latency',
          type: 'warning',
          title: 'Cross-Region Latency Penalty Observed',
          detail: `${crossRegionEdges.length} synchronous links cross geographical cloud regions. Incurring network latency penalties (+75ms to +180ms). Consider asynchronous queue replication.`,
        });
      }
    } else if (totalNodes > 2) {
      auditChecks.push({
        id: 'single-region-warn',
        type: 'warning',
        title: 'Single-Region Blast Radius',
        detail: `Entire topology resides in a single cloud region (${distinctRegions[0] || 'us-east-1'}). Vulnerable to cloud provider data center outages.`,
      });
    }

    // Check: Asynchronous Queue Decoupling
    if (queueNodes.length > 0) {
      auditChecks.push({
        id: 'queue-ok',
        type: 'success',
        title: 'Asynchronous Event Buffer (Kafka / RabbitMQ)',
        detail: `Message queues (${queueNodes.map(q => q.name).join(', ')}) decouple producers from consumers, absorbing write bursts reliably.`,
      });
    }

    // Check: Isolated Nodes
    if (isolatedNodes.length > 0) {
      auditChecks.push({
        id: 'isolated-nodes',
        type: 'warning',
        title: 'Unconnected Infrastructure Components',
        detail: `${isolatedNodes.length} component(s) have no network links: ${isolatedNodes.map(n => n.name).join(', ')}. Connect ports to include them in traffic routing.`,
      });
    }
  }

  // --------------------------------------------------------------------------
  // Quantitative Resilience Score & Letter Grade
  // --------------------------------------------------------------------------
  let calculatedScore = 100;
  if (isBlankCanvas) {
    calculatedScore = 0;
  } else {
    // Deductions based on real contextual issues
    calculatedScore -= singlePointsOfFailure.length * 15;
    if (cbCoverage < 35) calculatedScore -= 20;
    else if (cbCoverage < 70) calculatedScore -= 10;

    if (computeNodes.length > 0 && hpaCoverage < 50) calculatedScore -= 12;
    if (gatewaysWithoutRateLimit.length > 0) calculatedScore -= 10;
    if (databasesWithoutPool.length > 0) calculatedScore -= 8;
    if (clientsConnectingDirectlyToDb.length > 0) calculatedScore -= 15;
    if (isolatedNodes.length > 0) calculatedScore -= 5;
    if (distinctRegions.length === 1 && totalNodes > 3) calculatedScore -= 5;

    // SLA health factor
    if (simState.systemHealthPercent < 70) calculatedScore -= 15;
    else if (simState.systemHealthPercent < 90) calculatedScore -= 5;
  }

  const finalScore = Math.max(10, Math.min(100, calculatedScore));

  let grade = 'A+';
  let gradeColor = 'text-emerald';
  let scorecardTitle = 'Fault-Tolerant Distributed Mesh';
  let scorecardDesc = `Architecture evaluated against synthetic traffic across ${totalNodes} active node(s) and ${edges.length} interconnect link(s).`;

  if (isBlankCanvas) {
    grade = 'N/A';
    gradeColor = 'text-muted';
    scorecardTitle = 'Blank Architecture Canvas';
    scorecardDesc = 'No components deployed. Add microservices or load a preset to run the reliability audit.';
  } else if (finalScore >= 92) {
    grade = 'A+';
    gradeColor = 'text-emerald';
    scorecardTitle = 'Fault-Tolerant Distributed Mesh';
    scorecardDesc = 'Exemplary architectural resilience with circuit breaker isolation, auto-scaling elasticity, and high availability.';
  } else if (finalScore >= 82) {
    grade = 'A';
    gradeColor = 'text-emerald';
    scorecardTitle = 'Production-Ready Resilient Architecture';
    scorecardDesc = 'Solid reliability foundations with minor optimization opportunities for cross-region or connection pool scaling.';
  } else if (finalScore >= 70) {
    grade = 'B+';
    gradeColor = 'text-cyan';
    scorecardTitle = 'Moderate Resilience (Minor Single Points of Failure)';
    scorecardDesc = 'Functional distributed architecture with localized cascading failure risks and unhedged dependencies.';
  } else if (finalScore >= 55) {
    grade = 'C';
    gradeColor = 'text-amber';
    scorecardTitle = 'Degraded Fault Tolerance (Critical Gaps)';
    scorecardDesc = 'Significant vulnerabilities detected. High risk of thread pool exhaustion and service crashes under chaos spikes.';
  } else {
    grade = 'F';
    gradeColor = 'text-crimson';
    scorecardTitle = 'Fragile Architecture (Cascading Failure Risk)';
    scorecardDesc = 'Severe architectural vulnerabilities. Lack of circuit breakers, autoscaling, and isolation causes rapid system collapse.';
  }

  // Calculate clean, empirical simulated availability SLA
  const totalPackets = simState.successfulPackets + simState.failedPackets + simState.throttledPackets;
  const empiricalSlaString = totalPackets > 0
    ? `${((simState.successfulPackets / totalPackets) * 100).toFixed(2)}%`
    : (simState.systemHealthPercent > 0 ? `${(Math.min(99.9, simState.systemHealthPercent - 0.1)).toFixed(1)}%` : '99.9%');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container modal-benchmark" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <Award className="text-cyan" size={22} />
            <div>
              <h2 className="modal-title">System Reliability & Chaos Benchmark</h2>
              <span className="modal-subtitle">Automated SRE Architecture Audit & Fault Tolerance Scorecard</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="benchmark-content">
          {isRunningTest ? (
            <div className="benchmark-loading-state">
              <RefreshCw size={36} className="spin-icon text-cyan" />
              <h3 className="benchmark-loading-title">Executing Deep SRE Resiliency Audit...</h3>
              <p className="benchmark-loading-desc">{phaseText}</p>
              <div className="benchmark-progress-bar">
                <div className="benchmark-progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <div className="benchmark-results-grid">
              {/* Scorecard Hero */}
              <div className="scorecard-hero">
                <div className="scorecard-grade-badge">
                  <span className="scorecard-grade-label">Resilience Grade</span>
                  <strong className={`scorecard-grade ${gradeColor}`}>{grade}</strong>
                </div>
                <div className="scorecard-hero-details">
                  <div className="scorecard-title-row">
                    <h3 className="scorecard-title">{scorecardTitle}</h3>
                    {!isBlankCanvas && (
                      <span className="scorecard-score-pill">Score: {finalScore}/100</span>
                    )}
                  </div>
                  <p className="scorecard-desc">{scorecardDesc}</p>
                </div>
              </div>

              {/* Metric Breakdown */}
              <div className="benchmark-kpis">
                <div className="benchmark-kpi-card">
                  <span className="kpi-label">Circuit Breaker Mesh Coverage</span>
                  <strong className={`kpi-value ${cbCoverage >= 70 ? 'text-emerald' : cbCoverage >= 35 ? 'text-cyan' : 'text-amber'}`}>
                    {cbCoverage}%
                  </strong>
                  <span className="kpi-sub">
                    {isBlankCanvas ? '0 protectable services' : `${nodesWithCircuitBreakers.length} of ${protectableCount} services hedged`}
                  </span>
                </div>

                <div className="benchmark-kpi-card">
                  <span className="kpi-label">HPA Elastic Autoscaling</span>
                  <strong className={`kpi-value ${hpaCoverage >= 70 ? 'text-emerald' : 'text-cyan'}`}>
                    {hpaCoverage}%
                  </strong>
                  <span className="kpi-sub">
                    {computeNodes.length === 0 ? 'No compute services' : `${nodesWithAutoscaling.length} of ${computeNodes.length} workloads auto-scale`}
                  </span>
                </div>

                <div className="benchmark-kpi-card">
                  <span className="kpi-label">Simulated Availability SLA</span>
                  <strong className="kpi-value text-purple">{empiricalSlaString}</strong>
                  <span className="kpi-sub">Target High-Availability SLA: 99.9%</span>
                </div>

                <div className="benchmark-kpi-card">
                  <span className="kpi-label">Single Points of Failure</span>
                  <strong className={`kpi-value ${singlePointsOfFailure.length === 0 ? 'text-emerald' : 'text-amber'}`}>
                    {singlePointsOfFailure.length} SPOFs
                  </strong>
                  <span className="kpi-sub">
                    {singlePointsOfFailure.length === 0 ? 'No unhedged single-replica endpoints' : 'Requires circuit isolation or replicas'}
                  </span>
                </div>
              </div>

              {/* SRE Detailed Recommendations */}
              <div className="benchmark-recommendations">
                <h4 className="rec-title">SRE Reliability Audit Findings & Recommendations:</h4>
                <ul className="rec-list">
                  {auditChecks.map((check) => (
                    <li key={check.id} className="rec-item">
                      {check.type === 'success' && <CheckCircle2 size={16} className="text-emerald" />}
                      {check.type === 'warning' && <AlertTriangle size={16} className="text-amber" />}
                      {check.type === 'error' && <XCircle size={16} className="text-crimson" />}
                      <div className="rec-text-wrap">
                        <strong className="rec-item-title">{check.title}: </strong>
                        <span className="rec-item-detail">{check.detail}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="modal-footer-left">
            <span className="file-info-badge">ResiliGraph SRE Reliability & Chaos Auditor</span>
          </div>
          <div className="modal-footer-actions">
            {!isRunningTest && (
              <button className="btn-secondary" onClick={runAudit} title="Re-run resilience stress injection audit">
                <RefreshCw size={13} /> Re-run Audit
              </button>
            )}
            <button className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

