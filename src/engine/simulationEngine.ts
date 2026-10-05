import type { NodeData, EdgeData, Packet, SimulationState, AuditLogEntry, CloudRegion } from '../types';

interface NodeRuntimeState {
  recentArrivals: number[]; // timestamps of arrivals in the last 1.2s
  recentLatencies: number[];
  recentErrors: number[];
  inFlightRequests: number;
}

export class SimulationEngine {
  private nodes: NodeData[] = [];
  private edges: EdgeData[] = [];
  private packets: Packet[] = [];
  private state: SimulationState;
  private lastTickTime: number = performance.now();
  private lastClientSpawnTimes: Map<string, number> = new Map();
  private auditLogs: AuditLogEntry[] = [];
  private latencySamples: number[] = [];
  private chaosMonkeyTimer: number = 0;
  private autoscalingTimer: number = 0;
  private nodeRuntimes: Map<string, NodeRuntimeState> = new Map();

  constructor(
    initialNodes: NodeData[],
    initialEdges: EdgeData[]
  ) {
    this.nodes = JSON.parse(JSON.stringify(initialNodes));
    this.edges = JSON.parse(JSON.stringify(initialEdges));
    this.initNodeRuntimes();

    this.state = {
      isRunning: true,
      speedMultiplier: 1,
      targetRps: 2400,
      trafficPattern: 'steady',
      totalPacketsProcessed: 0,
      successfulPackets: 0,
      failedPackets: 0,
      throttledPackets: 0,
      p50LatencyMs: 18,
      p95LatencyMs: 54,
      p99LatencyMs: 120,
      systemHealthPercent: 100,
      activeCircuitBreakers: 0,
      totalReplicas: this.countTotalReplicas(),
      chaosMonkeyActive: false,
    };

    this.addAuditLog('INFO', 'System', 'ArchPulse Distributed Architecture & Chaos Simulation Engine ready.');
  }

  private initNodeRuntimes() {
    this.nodes.forEach(node => {
      if (!this.nodeRuntimes.has(node.id)) {
        this.nodeRuntimes.set(node.id, {
          recentArrivals: [],
          recentLatencies: [],
          recentErrors: [],
          inFlightRequests: 0,
        });
      }
      if (!node.metrics.currentReplicas) {
        node.metrics.currentReplicas = node.autoscaling?.minReplicas || 1;
      }
    });
  }

  private countTotalReplicas(): number {
    return this.nodes.reduce((acc, n) => acc + (n.metrics.currentReplicas || 1), 0);
  }

  public setNodesAndEdges(nodes: NodeData[], edges: EdgeData[]) {
    this.nodes = JSON.parse(JSON.stringify(nodes));
    this.edges = JSON.parse(JSON.stringify(edges));
    this.initNodeRuntimes();
    this.packets = [];
  }

  public getNodes(): NodeData[] {
    return this.nodes;
  }

  public getEdges(): EdgeData[] {
    return this.edges;
  }

  public getPackets(): Packet[] {
    return this.packets;
  }

  public getState(): SimulationState {
    return this.state;
  }

  public getAuditLogs(): AuditLogEntry[] {
    return this.auditLogs;
  }

  public setRunning(running: boolean) {
    this.state.isRunning = running;
    this.addAuditLog('INFO', 'Simulation', running ? 'Simulation resumed.' : 'Simulation paused.');
  }

  public setSpeed(speed: number) {
    this.state.speedMultiplier = speed;
  }

  public setTargetRps(rps: number) {
    this.state.targetRps = rps;
  }

  public setTrafficPattern(pattern: SimulationState['trafficPattern']) {
    this.state.trafficPattern = pattern;
    this.addAuditLog('INFO', 'Traffic', `Traffic pattern changed to ${pattern.toUpperCase()}`);
  }

  public toggleChaosMonkey(active: boolean) {
    this.state.chaosMonkeyActive = active;
    if (active) {
      this.addAuditLog(
        'CHAOS',
        'Chaos Monkey',
        '🐒 Chaos Monkey unleashed! Disrupting random nodes and injecting latency...'
      );
      // Trigger immediate first chaos event for instant feedback
      this.executeRandomChaosStrike();
    } else {
      this.addAuditLog('INFO', 'Chaos Monkey', 'Chaos Monkey pacified. Restoring steady state.');
      this.resetAllChaos();
    }
  }

  private executeRandomChaosStrike() {
    const candidates = this.nodes.filter(n => n.type !== 'client');
    if (candidates.length === 0) return;

    const victim = candidates[Math.floor(Math.random() * candidates.length)];
    const roll = Math.random();

    if (roll < 0.4) {
      // 1. Process Crash / OOM Strike
      victim.chaos.isKilled = true;
      victim.status = 'failed';
      this.addAuditLog('CHAOS', victim.name, `💥 Chaos Monkey terminated process (Simulated OOM Crash / Segfault)!`);
      
      // Auto-restart pod after 5 seconds to simulate K8s container restart
      setTimeout(() => {
        if (victim.chaos.isKilled && this.state.chaosMonkeyActive) {
          victim.chaos.isKilled = false;
          victim.status = 'healthy';
          this.addAuditLog('INFO', victim.name, `♻️ Container restarted successfully by orchestrator.`);
        }
      }, 5000);
    } else if (roll < 0.7) {
      // 2. High Latency Injection (Cross-region or DB lock delay)
      const jitter = Math.floor(Math.random() * 500) + 350;
      victim.chaos.latencyJitterMs = jitter;
      victim.status = 'degraded';
      this.addAuditLog('CHAOS', victim.name, `⏳ Chaos Monkey injected +${jitter}ms network latency penalty!`);

      // Clear latency after 5 seconds
      setTimeout(() => {
        if (victim.chaos.latencyJitterMs > 0 && this.state.chaosMonkeyActive) {
          victim.chaos.latencyJitterMs = 0;
          victim.status = victim.chaos.isKilled ? 'failed' : 'healthy';
          this.addAuditLog('INFO', victim.name, `⚡ Latency spike cleared. Traffic flowing normally.`);
        }
      }, 5000);
    } else {
      // 3. Error Rate Spike (HTTP 500s to test Circuit Breakers)
      victim.chaos.errorInjectionRate = 0.6;
      victim.status = 'degraded';
      this.addAuditLog('CHAOS', victim.name, `🔥 Chaos Monkey injected 60% HTTP 500 exceptions!`);

      // Reset error rate after 5 seconds
      setTimeout(() => {
        if (victim.chaos.errorInjectionRate > 0 && this.state.chaosMonkeyActive) {
          victim.chaos.errorInjectionRate = 0;
          victim.status = victim.chaos.isKilled ? 'failed' : 'healthy';
          this.addAuditLog('INFO', victim.name, `🛡️ Error rate normalized.`);
        }
      }, 5000);
    }
  }

  public updateNodeConfig(nodeId: string, updater: (node: NodeData) => void) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      updater(node);
    }
  }

  public addNode(node: NodeData) {
    this.nodes.push(node);
    this.initNodeRuntimes();
    this.addAuditLog('INFO', 'Topology', `Added new node: ${node.name} (${node.type.toUpperCase()})`);
  }

  public duplicateNode(nodeId: string): NodeData | null {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return null;

    const cloned: NodeData = JSON.parse(JSON.stringify(node));
    cloned.id = `node-${Date.now()}`;
    cloned.name = `${node.name} (Copy)`;
    cloned.x = node.x + 40;
    cloned.y = node.y + 40;
    this.nodes.push(cloned);
    this.initNodeRuntimes();
    this.addAuditLog('INFO', 'Topology', `Duplicated component: ${cloned.name}`);
    return cloned;
  }

  public removeNode(nodeId: string) {
    const nodeIndex = this.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex !== -1) {
      const removed = this.nodes[nodeIndex];
      this.nodes.splice(nodeIndex, 1);
      this.edges = this.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
      this.packets = this.packets.filter(p => p.fromNodeId !== nodeId && p.toNodeId !== nodeId);
      this.nodeRuntimes.delete(nodeId);
      this.addAuditLog('WARN', 'Topology', `Deleted node: ${removed.name}`);
    }
  }

  public addEdge(edge: EdgeData) {
    const exists = this.edges.some(e => e.from === edge.from && e.to === edge.to);
    if (!exists) {
      this.edges.push(edge);
      const fromName = this.nodes.find(n => n.id === edge.from)?.name || edge.from;
      const toName = this.nodes.find(n => n.id === edge.to)?.name || edge.to;
      this.addAuditLog('INFO', 'Topology', `Connected: ${fromName} ➔ ${toName} (${edge.protocol})`);
    }
  }

  public removeEdge(edgeId: string) {
    this.edges = this.edges.filter(e => e.id !== edgeId);
    this.packets = this.packets.filter(p => p.edgeId !== edgeId);
    this.addAuditLog('WARN', 'Topology', `Severed interconnect link.`);
  }

  public killNode(nodeId: string) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.chaos.isKilled = !node.chaos.isKilled;
      node.status = node.chaos.isKilled ? 'failed' : 'healthy';
      this.addAuditLog(
        node.chaos.isKilled ? 'ERROR' : 'INFO',
        node.name,
        node.chaos.isKilled ? 'FATAL: Service killed via Chaos Fault Injection.' : 'Service recovered to operational state.'
      );
    }
  }

  public injectNodeLatency(nodeId: string, latencyMs: number) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.chaos.latencyJitterMs = latencyMs;
      node.status = latencyMs > 300 ? 'degraded' : (node.chaos.isKilled ? 'failed' : 'healthy');
      this.addAuditLog('WARN', node.name, `Artificial latency set to: +${latencyMs}ms`);
    }
  }

  public resetAllChaos() {
    this.nodes.forEach(node => {
      node.chaos.isKilled = false;
      node.chaos.latencyJitterMs = 0;
      node.chaos.errorInjectionRate = 0;
      node.chaos.isPartitioned = false;
      node.status = 'healthy';
      if (node.circuitBreaker.enabled) {
        node.circuitBreaker.state = 'CLOSED';
        node.circuitBreaker.consecutiveFailures = 0;
      }
    });
    this.state.chaosMonkeyActive = false;
    this.addAuditLog('INFO', 'Chaos Lab', 'All chaos faults, partitions, and latencies cleared.');
  }

  public triggerGlobalSpike() {
    this.state.trafficPattern = 'spike';
    this.state.targetRps = Math.min(15000, this.state.targetRps * 3);
    this.addAuditLog('WARN', 'Traffic Spike', `🔥 Surge Load Triggered! Global Target RPS: ${this.state.targetRps}`);
    setTimeout(() => {
      if (this.state.trafficPattern === 'spike') {
        this.state.trafficPattern = 'steady';
        this.state.targetRps = 2400;
        this.addAuditLog('INFO', 'Traffic Spike', 'Traffic surge subsided back to baseline.');
      }
    }, 12000);
  }

  private getRegionLatency(r1: CloudRegion = 'us-east-1', r2: CloudRegion = 'us-east-1'): number {
    if (r1 === r2) return 0;
    if ((r1 === 'us-east-1' && r2 === 'eu-central-1') || (r1 === 'eu-central-1' && r2 === 'us-east-1')) return 75;
    if ((r1 === 'us-east-1' && r2 === 'ap-southeast-1') || (r1 === 'ap-southeast-1' && r2 === 'us-east-1')) return 180;
    if ((r1 === 'us-east-1' && r2 === 'us-west-2') || (r1 === 'us-west-2' && r2 === 'us-east-1')) return 35;
    return 60;
  }

  private addAuditLog(type: AuditLogEntry['type'], source: string, message: string) {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    this.auditLogs.unshift({
      id: Math.random().toString(36).substring(2, 9),
      timestamp: timeStr,
      type,
      source,
      message,
    });
    if (this.auditLogs.length > 80) {
      this.auditLogs.pop();
    }
  }

  public tick(currentTime: number): void {
    const deltaMs = (currentTime - this.lastTickTime) * this.state.speedMultiplier;
    this.lastTickTime = currentTime;

    if (!this.state.isRunning || deltaMs <= 0) return;

    // 1. Chaos Monkey automation
    if (this.state.chaosMonkeyActive) {
      this.chaosMonkeyTimer += deltaMs;
      if (this.chaosMonkeyTimer > 3500) {
        this.chaosMonkeyTimer = 0;
        this.executeRandomChaosStrike();
      }
    }

    // 2. Autoscaling (HPA) evaluation loop
    this.autoscalingTimer += deltaMs;
    if (this.autoscalingTimer > 2000) {
      this.autoscalingTimer = 0;
      this.evaluateAutoscaling(currentTime);
    }

    // 3. Refill Rate Limiter tokens & manage circuit breakers
    this.nodes.forEach(node => {
      if (node.rateLimiter.enabled) {
        const tokensToAdd = (node.rateLimiter.refillRatePerSec * (deltaMs / 1000));
        node.rateLimiter.tokens = Math.min(
          node.rateLimiter.capacity,
          node.rateLimiter.tokens + tokensToAdd
        );
      }

      // Check Circuit Breakers recovery
      if (node.circuitBreaker.enabled && node.circuitBreaker.state === 'OPEN') {
        if (currentTime - node.circuitBreaker.lastStateChange > node.circuitBreaker.resetTimeoutMs) {
          node.circuitBreaker.state = 'HALF_OPEN';
          node.circuitBreaker.lastStateChange = currentTime;
          this.addAuditLog('WARN', node.name, 'Circuit Breaker entering HALF_OPEN trial probe state.');
        }
      }
    });

    // 4. Client Nodes spawn packets based on their INDIVIDUAL generated RPS
    const globalMultiplier = this.getGlobalTrafficFactor(currentTime);
    const clientNodes = this.nodes.filter(n => n.type === 'client');

    clientNodes.forEach(client => {
      const baseRps = client.processing?.clientGeneratedRps || 1000;
      const effectiveClientRps = baseRps * globalMultiplier;

      const lastSpawn = this.lastClientSpawnTimes.get(client.id) || 0;
      const spawnInterval = Math.max(20, 1000 / (effectiveClientRps / 8));

      if (currentTime - lastSpawn > spawnInterval) {
        this.lastClientSpawnTimes.set(client.id, currentTime);
        this.spawnClientPackets(client);
      }
    });

    // 5. Update Packets motion along edges
    const remainingPackets: Packet[] = [];
    const speedBase = (deltaMs / 1000) * 0.95;

    for (let i = 0; i < this.packets.length; i++) {
      const p = this.packets[i];
      p.progress += speedBase * p.speed;

      if (p.progress >= 1.0) {
        this.handlePacketArrival(p, currentTime);
      } else {
        remainingPackets.push(p);
      }
    }
    this.packets = remainingPackets;

    // 6. Update Individual Node Metrics from sliding window
    this.updateIndividualNodeMetrics(currentTime);
  }

  private evaluateAutoscaling(currentTime: number) {
    this.nodes.forEach(node => {
      if (!node.autoscaling || !node.autoscaling.enabled || node.chaos.isKilled) return;

      const currentReplicas = node.metrics.currentReplicas || 1;
      const cpu = node.metrics.cpuPercent;
      const cooldown = node.autoscaling.scaleUpCooldownMs || 5000;
      const lastScale = node.autoscaling.lastScaleTime || 0;

      // Scale Up
      if (cpu > node.autoscaling.cpuThresholdPercent && currentReplicas < node.autoscaling.maxReplicas) {
        if (currentTime - lastScale > cooldown) {
          node.metrics.currentReplicas = currentReplicas + 1;
          node.autoscaling.lastScaleTime = currentTime;
          this.addAuditLog(
            'AUTOSCALE',
            node.name,
            `⚡ HPA: Scaled UP to ${node.metrics.currentReplicas} replicas (CPU load: ${cpu}%)`
          );
        }
      }
      // Scale Down
      else if (cpu < 25 && currentReplicas > node.autoscaling.minReplicas) {
        if (currentTime - lastScale > cooldown * 2) {
          node.metrics.currentReplicas = currentReplicas - 1;
          node.autoscaling.lastScaleTime = currentTime;
          this.addAuditLog(
            'AUTOSCALE',
            node.name,
            `⬇️ HPA: Scaled DOWN to ${node.metrics.currentReplicas} replicas (Traffic normalized)`
          );
        }
      }
    });
    this.state.totalReplicas = this.countTotalReplicas();
  }

  private getGlobalTrafficFactor(currentTime: number): number {
    let factor = this.state.targetRps / 2400;
    if (this.state.trafficPattern === 'wave') {
      factor *= (1 + 0.6 * Math.sin(currentTime / 2000));
    } else if (this.state.trafficPattern === 'chaos') {
      factor *= (0.5 + Math.random() * 1.5);
    }
    return factor;
  }

  private spawnClientPackets(client: NodeData) {
    const outgoing = this.edges.filter(e => e.from === client.id && e.status !== 'broken');
    if (outgoing.length === 0) return;

    const now = performance.now();
    this.recordNodeArrival(client.id, now);

    outgoing.forEach(edge => {
      const targetNode = this.nodes.find(n => n.id === edge.to);
      if (!targetNode) return;

      const crossRegionDelay = this.getRegionLatency(client.region, targetNode.region);
      const edgeLatency = edge.baseLatencyMs + crossRegionDelay + (targetNode.chaos.latencyJitterMs || 0);
      const speed = Math.max(0.4, Math.min(3.0, 140 / (edgeLatency || 20)));

      const packet: Packet = {
        id: Math.random().toString(36).substring(2, 9),
        edgeId: edge.id,
        fromNodeId: client.id,
        toNodeId: targetNode.id,
        progress: 0,
        speed,
        status: 'success',
        method: 'GET',
        payloadSizeKb: Math.round(12 + Math.random() * 48),
        createdAt: performance.now(),
        latencyMs: edgeLatency,
      };

      if (this.packets.length < 140) {
        this.packets.push(packet);
      }
    });
  }

  private handlePacketArrival(packet: Packet, currentTime: number) {
    const targetNode = this.nodes.find(n => n.id === packet.toNodeId);
    this.state.totalPacketsProcessed++;

    if (!targetNode) return;

    this.recordNodeArrival(targetNode.id, currentTime);

    const runtime = this.nodeRuntimes.get(targetNode.id);
    const processingTime = targetNode.processing?.baseProcessingTimeMs || 10;
    const totalLatency = packet.latencyMs + processingTime;

    // 1. Check if node is dead (Killed)
    if (targetNode.chaos.isKilled) {
      packet.status = 'error';
      this.state.failedPackets++;
      this.recordNodeError(targetNode.id, currentTime);
      this.recordFailure(targetNode);
      this.recordGlobalLatency(totalLatency + 500);
      return;
    }

    // 2. Check Circuit Breaker
    if (targetNode.circuitBreaker.enabled && targetNode.circuitBreaker.state === 'OPEN') {
      packet.status = 'throttled';
      this.state.throttledPackets++;
      this.recordGlobalLatency(totalLatency + 5);
      return;
    }

    // 3. Check Rate Limiter
    if (targetNode.rateLimiter.enabled) {
      if (targetNode.rateLimiter.tokens < 1) {
        packet.status = 'throttled';
        this.state.throttledPackets++;
        return;
      } else {
        targetNode.rateLimiter.tokens -= 1;
      }
    }

    // 4. Check Queue & Concurrency Overflow
    const replicas = targetNode.metrics.currentReplicas || 1;
    const concurrencyLimit = (targetNode.processing?.concurrencyLimit || 1000) * replicas;
    if (runtime && runtime.inFlightRequests > concurrencyLimit) {
      targetNode.metrics.queueDepth++;
      if (targetNode.metrics.queueDepth > concurrencyLimit * 0.8) {
        packet.status = 'throttled';
        this.state.throttledPackets++;
        return;
      }
    } else {
      targetNode.metrics.queueDepth = Math.max(0, targetNode.metrics.queueDepth - 1);
    }

    // 5. Check Injected Error Rate
    if (targetNode.chaos.errorInjectionRate > 0 && Math.random() < targetNode.chaos.errorInjectionRate) {
      packet.status = 'error';
      this.state.failedPackets++;
      this.recordNodeError(targetNode.id, currentTime);
      this.recordFailure(targetNode);
      return;
    }

    // Success at this individual node!
    this.state.successfulPackets++;
    this.recordSuccess(targetNode);
    this.recordNodeLatency(targetNode.id, totalLatency);
    this.recordGlobalLatency(totalLatency);

    // 6. Propagate downstream along outgoing edges based on routing probability
    const downstreamEdges = this.edges.filter(e => e.from === targetNode.id && e.status !== 'broken');
    if (downstreamEdges.length > 0) {
      downstreamEdges.forEach(edge => {
        const prob = edge.routingProbability !== undefined ? edge.routingProbability : 1.0;
        if (Math.random() <= prob && this.packets.length < 140) {
          const nextTarget = this.nodes.find(n => n.id === edge.to);
          if (nextTarget) {
            const crossRegionDelay = this.getRegionLatency(targetNode.region, nextTarget.region);
            const nextLatency = edge.baseLatencyMs + crossRegionDelay + (nextTarget.chaos.latencyJitterMs || 0);
            const speed = Math.max(0.4, Math.min(3.0, 140 / (nextLatency || 20)));
            this.packets.push({
              id: Math.random().toString(36).substring(2, 9),
              edgeId: edge.id,
              fromNodeId: targetNode.id,
              toNodeId: nextTarget.id,
              progress: 0,
              speed,
              status: 'success',
              method: 'POST',
              payloadSizeKb: Math.round(8 + Math.random() * 32),
              createdAt: performance.now(),
              latencyMs: nextLatency,
            });
          }
        }
      });
    }
  }

  private recordNodeArrival(nodeId: string, timestamp: number) {
    let runtime = this.nodeRuntimes.get(nodeId);
    if (!runtime) {
      runtime = { recentArrivals: [], recentLatencies: [], recentErrors: [], inFlightRequests: 0 };
      this.nodeRuntimes.set(nodeId, runtime);
    }
    runtime.recentArrivals.push(timestamp);
  }

  private recordNodeLatency(nodeId: string, latency: number) {
    const runtime = this.nodeRuntimes.get(nodeId);
    if (runtime) {
      runtime.recentLatencies.push(latency);
      if (runtime.recentLatencies.length > 50) runtime.recentLatencies.shift();
    }
  }

  private recordNodeError(nodeId: string, timestamp: number) {
    const runtime = this.nodeRuntimes.get(nodeId);
    if (runtime) {
      runtime.recentErrors.push(timestamp);
    }
  }

  private recordGlobalLatency(latency: number) {
    this.latencySamples.push(latency);
    if (this.latencySamples.length > 100) {
      this.latencySamples.shift();
    }
  }

  private recordFailure(node: NodeData) {
    if (node.circuitBreaker.enabled) {
      node.circuitBreaker.consecutiveFailures++;
      if (
        node.circuitBreaker.state !== 'OPEN' &&
        node.circuitBreaker.consecutiveFailures >= node.circuitBreaker.failureThreshold
      ) {
        node.circuitBreaker.state = 'OPEN';
        node.circuitBreaker.lastStateChange = performance.now();
        node.status = 'throttled';
        this.addAuditLog(
          'CIRCUIT_BREAKER',
          node.name,
          `🚨 Circuit Breaker TRIPPED to OPEN! Threshold ${node.circuitBreaker.failureThreshold} reached. Fast-failing downstream.`
        );
      }
    }
  }

  private recordSuccess(node: NodeData) {
    if (node.circuitBreaker.enabled) {
      if (node.circuitBreaker.state === 'HALF_OPEN') {
        node.circuitBreaker.consecutiveFailures = 0;
        node.circuitBreaker.state = 'CLOSED';
        node.circuitBreaker.lastStateChange = performance.now();
        node.status = 'healthy';
        this.addAuditLog(
          'CIRCUIT_BREAKER',
          node.name,
          '✅ Probe successful! Circuit Breaker reset to CLOSED state.'
        );
      } else {
        node.circuitBreaker.consecutiveFailures = Math.max(0, node.circuitBreaker.consecutiveFailures - 1);
      }
    }
  }

  private updateIndividualNodeMetrics(currentTime: number) {
    const windowMs = 1200;
    const thresholdTime = currentTime - windowMs;

    this.nodes.forEach(node => {
      const runtime = this.nodeRuntimes.get(node.id);
      if (!runtime) return;

      runtime.recentArrivals = runtime.recentArrivals.filter(t => t >= thresholdTime);
      runtime.recentErrors = runtime.recentErrors.filter(t => t >= thresholdTime);

      if (node.chaos.isKilled) {
        node.metrics.currentRps = 0;
        node.metrics.cpuPercent = 0;
        node.metrics.queueDepth = 0;
        node.status = 'failed';
        return;
      }

      // Calculate TRUE individual node RPS
      const actualRps = Math.round((runtime.recentArrivals.length / (windowMs / 1000)) * 12);
      node.metrics.currentRps = actualRps;

      // Calculate Error Rate
      const errCount = runtime.recentErrors.length;
      node.metrics.errorRate = runtime.recentArrivals.length > 0
        ? errCount / runtime.recentArrivals.length
        : 0;

      // Calculate Avg Latency
      if (runtime.recentLatencies.length > 0) {
        const sum = runtime.recentLatencies.reduce((a, b) => a + b, 0);
        node.metrics.avgLatencyMs = Math.round(sum / runtime.recentLatencies.length);
      }

      // Calculate realistic CPU % based on node's individual load scaled by replicas
      const processingTime = node.processing?.baseProcessingTimeMs || 10;
      const workerThreads = (node.processing?.workerThreads || 4) * (node.metrics.currentReplicas || 1);
      const loadCapacity = (workerThreads * 1000) / processingTime;
      const cpuCalculated = Math.min(98, Math.max(6, Math.round((actualRps / (loadCapacity || 100)) * 75)));
      node.metrics.cpuPercent = cpuCalculated;

      // Update Health Status
      if (node.circuitBreaker.enabled && node.circuitBreaker.state === 'OPEN') {
        node.status = 'throttled';
      } else if (node.chaos.latencyJitterMs > 250 || node.metrics.cpuPercent > 80 || node.metrics.queueDepth > 10) {
        node.status = 'degraded';
      } else {
        node.status = 'healthy';
      }
    });

    // Update Global Percentiles
    if (this.latencySamples.length > 5) {
      const sorted = [...this.latencySamples].sort((a, b) => a - b);
      this.state.p50LatencyMs = Math.round(sorted[Math.floor(sorted.length * 0.5)]);
      this.state.p95LatencyMs = Math.round(sorted[Math.floor(sorted.length * 0.95)]);
      this.state.p99LatencyMs = Math.round(sorted[Math.floor(sorted.length * 0.99)]);
    }

    // Global Health calculation (Composite of Infrastructure Availability + Request Delivery SLA)
    const totalNodes = this.nodes.length;
    if (totalNodes === 0) {
      // Blank Canvas with no nodes is neutral/idle
      this.state.systemHealthPercent = 100;
    } else {
      const killedNodes = this.nodes.filter(n => n.chaos.isKilled || n.status === 'failed').length;
      const degradedNodes = this.nodes.filter(n => n.status === 'degraded' || n.status === 'throttled').length;
      const nodeHealthRatio = Math.max(0, (totalNodes - (killedNodes * 1.0) - (degradedNodes * 0.35)) / totalNodes);

      const totalPackets = this.state.successfulPackets + this.state.failedPackets + this.state.throttledPackets;
      if (totalPackets > 0) {
        const packetSuccessRatio = this.state.successfulPackets / totalPackets;
        // 65% weight on traffic success SLA, 35% weight on infrastructure node health
        const composite = (packetSuccessRatio * 0.65) + (nodeHealthRatio * 0.35);
        this.state.systemHealthPercent = Math.max(0, Math.min(100, Math.round(composite * 100)));
      } else {
        // No packets yet: health reflects node availability directly
        this.state.systemHealthPercent = Math.round(nodeHealthRatio * 100);
      }
    }

    this.state.activeCircuitBreakers = this.nodes.filter(
      n => n.circuitBreaker.enabled && n.circuitBreaker.state === 'OPEN'
    ).length;
  }
}
