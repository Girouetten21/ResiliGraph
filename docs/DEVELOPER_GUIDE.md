# 🛠️ ResiliGraph — Developer & Contributor Guide

This guide is designed for software engineers, systems programmers, and open-source contributors who wish to modify, extend, or understand the internal architecture of **ResiliGraph**.

---

## 📑 Table of Contents

1. [Architecture & Design Philosophy](#1-architecture--design-philosophy)
2. [Project Structure & Module Organization](#2-project-structure--module-organization)
3. [The Simulation Engine (`simulationEngine.ts`)](#3-the-simulation-engine-simulationenginets)
   - [Tick Loop & Event Scheduling](#tick-loop--event-scheduling)
   - [Queuing Theory Model & Load Calculations](#queuing-theory-model--load-calculations)
   - [Rate Limiting (Token Bucket Algorithm)](#rate-limiting-token-bucket-algorithm)
   - [Circuit Breaker Finite State Machine](#circuit-breaker-finite-state-machine)
   - [Horizontal Pod Autoscaling (HPA) Controller](#horizontal-pod-autoscaling-hpa-controller)
   - [Cross-Region Network Latency Matrix](#cross-region-network-latency-matrix)
4. [HTML5 Canvas 2D Rendering Pipeline (`ArchitectureCanvas.tsx`)](#4-html5-canvas-2d-rendering-pipeline-architecturecanvastsx)
   - [Screen vs. World Coordinate Transformation](#screen-vs-world-coordinate-transformation)
   - [Concentric Rounded Selection Highlighting](#concentric-rounded-selection-highlighting)
   - [Cubic Bézier Packet Routing](#cubic-bézier-packet-routing)
   - [Event Dispatcher: Selection vs. Inspection](#event-dispatcher-selection-vs-inspection)
5. [State Management & Local Storage Persistence (`storage.ts`)](#5-state-management--local-storage-persistence-storagets)
6. [Extending ResiliGraph](#6-extending-resiligraph)
   - [Tutorial: Adding a New Component Type](#tutorial-adding-a-new-component-type)
   - [Tutorial: Adding a New Infrastructure as Code (IaC) Exporter](#tutorial-adding-a-new-infrastructure-as-code-iac-exporter)
7. [Development Workflow & Code Quality Standards](#7-development-workflow--code-quality-standards)

---

## 1. Architecture & Design Philosophy

ResiliGraph is built on four core architectural pillars:

1. **Zero External Runtime Dependencies for Physics:** The discrete event simulation and Canvas 2D particle rendering are implemented in native TypeScript without heavyweight 3D engines or physics runtimes, ensuring instant 60 FPS performance in any standard browser.
2. **Strict Component Isolation:** Each architectural node operates as an isolated entity with its own concurrency limit, worker thread pool, processing duration, and runtime queues.
3. **Deterministic & Stochastic Blending:** Master traffic rates can be shaped deterministically (steady, diurnal wave) while stochastic processes (network jitter, error rate distributions, chaos injection) simulate real-world non-determinism.
4. **Clean Decoupling of Simulation vs. Presentation:** The `SimulationEngine` operates independently of React rendering cycles. The UI consumes state snapshots at animation frame intervals, avoiding unnecessary React reconciliation overhead.

---

## 2. Project Structure & Module Organization

```
src/
├── components/                  # React UI components
│   ├── AddNodeModal.tsx         # Component deployment dialog
│   ├── ArchitectureCanvas.tsx   # 60 FPS HTML5 Canvas 2D engine
│   ├── AuditLogDrawer.tsx       # Live terminal SRE event log
│   ├── BenchmarkModal.tsx       # Resiliency scorecard & automated audit
│   ├── CustomTopologyModal.tsx  # Custom architectures creation & management
│   ├── ExportModal.tsx          # Docker Compose & Terraform IaC exporter
│   ├── NodeInspectorDrawer.tsx  # Full node specification & runbook editor
│   ├── TelemetryHud.tsx         # Floating real-time cluster telemetry cards
│   └── TopNav.tsx               # Master navigation, presets, & traffic controls
├── engine/                      # Core simulation engine
│   └── simulationEngine.ts      # Queuing theory, HPA, Circuit Breakers, Packet physics
├── presets/                     # Pre-packaged architectural templates
│   └── index.ts                 # E-Commerce, Fintech, AI RAG, & Blank Canvas
├── types/                       # Shared TypeScript interfaces & types
│   └── index.ts                 # NodeData, EdgeData, Packet, SimulationState, etc.
├── utils/                       # Storage & code generators
│   ├── exporters.ts             # Docker Compose, Terraform, & Markdown generators
│   └── storage.ts               # LocalStorage schema & custom presets CRUD
├── App.tsx                      # Root application controller & state coordinator
├── index.css                    # Unified cyber-fintech design system
└── main.tsx                     # React entry point
```

---

## 3. The Simulation Engine (`simulationEngine.ts`)

### Tick Loop & Event Scheduling

The simulation engine is stepped on every animation frame:

$$\Delta t = t_{\text{now}} - t_{\text{last}}$$

```typescript
public tick(currentTime: number): void {
  const deltaMs = Math.min(currentTime - this.lastTime, 100);
  this.lastTime = currentTime;

  // 1. Evaluate Chaos Monkey drills
  this.evaluateChaosMonkey(currentTime);

  // 2. Evaluate Horizontal Pod Autoscaling (HPA)
  this.evaluateAutoscaling(currentTime);

  // 3. Replenish Rate Limiter tokens & evaluate Circuit Breakers
  this.stepCircuitBreakersAndLimiters(deltaMs);

  // 4. Generate client ingress packets
  this.spawnClientTraffic(currentTime, deltaMs);

  // 5. Advance packet positions along Bézier paths
  this.updatePacketMotion(deltaMs, currentTime);

  // 6. Update sliding-window telemetry metrics
  this.updateIndividualNodeMetrics(currentTime);
}
```

### Queuing Theory Model & Load Calculations

Each node's processing capacity is derived using queuing theory fundamentals:

$$\text{Capacity} = \frac{\text{Worker Threads} \times \text{Replicas} \times 1000}{\text{Base Processing Time (ms)}}$$

$$\text{CPU Load \%} = \min\left(98, \max\left(6, \left(\frac{\text{Actual RPS}}{\text{Capacity}}\right) \times 75\right)\right)$$

If $\text{Arrival Rate} > \text{Capacity}$, incoming requests accumulate in `queueDepth`. High queue depth increases latency and can eventually degrade service health.

### Rate Limiting (Token Bucket Algorithm)

Implemented per node in `stepCircuitBreakersAndLimiters`:

$$\text{Tokens}_{\text{new}} = \min\left(\text{Capacity}, \text{Tokens}_{\text{current}} + \text{RefillRate} \times \frac{\Delta t}{1000}\right)$$

When an incoming packet arrives:
- If $\text{Tokens} \ge 1$: $\text{Tokens} \leftarrow \text{Tokens} - 1$ (Request forwarded).
- If $\text{Tokens} < 1$: Packet is marked as `throttled` and discarded immediately.

### Circuit Breaker Finite State Machine

```
              ┌──────────────────────────────────────────────┐
              │                                              │
              ▼                                              │ Probe Failure
         ┌─────────┐   Consecutive Errors >= Threshold   ┌─────────┐
         │ CLOSED  │ ─────────────────────────────────>  │  OPEN   │
         └─────────┘                                     └─────────┘
              ▲                                               │
              │                                               │ Reset Timeout Elapsed
              │ Probe Success                                 ▼
              │                                         ┌───────────┐
              └──────────────────────────────────────── │ HALF_OPEN │
                                                        └───────────┘
```

1. **`CLOSED`:** Normal operation. Consecutive failures increment on downstream 500s or timeouts.
2. **`OPEN`:** Fast-fails all inbound requests without executing downstream code. Node status transitions to `throttled`.
3. **`HALF_OPEN`:** After `resetTimeoutMs` elapses, a limited number of probe requests are permitted. If successful, transitions back to `CLOSED`; if any fail, returns to `OPEN`.

### Horizontal Pod Autoscaling (HPA) Controller

Every active node checks autoscaling rules against its moving average CPU usage:

```typescript
// Scale Up Rule
if (cpu > node.autoscaling.cpuThresholdPercent && currentReplicas < maxReplicas) {
  if (currentTime - lastScaleTime > cooldownMs) {
    node.metrics.currentReplicas += 1;
    node.autoscaling.lastScaleTime = currentTime;
  }
}

// Scale Down Rule
else if (cpu < 25 && currentReplicas > minReplicas) {
  if (currentTime - lastScaleTime > cooldownMs * 2) {
    node.metrics.currentReplicas -= 1;
    node.autoscaling.lastScaleTime = currentTime;
  }
}
```

### Cross-Region Network Latency Matrix

Cross-cloud communication incurs physical fiber propagation delays based on distance:

```typescript
private getRegionLatency(sourceRegion: CloudRegion, targetRegion: CloudRegion): number {
  if (sourceRegion === targetRegion) return 0;
  const pair = `${sourceRegion}_${targetRegion}`;
  const latencyMatrix: Record<string, number> = {
    'us-east-1_eu-central-1': 75,
    'eu-central-1_us-east-1': 75,
    'us-east-1_ap-southeast-1': 180,
    'ap-southeast-1_us-east-1': 180,
    'us-east-1_us-west-2': 38,
    'us-west-2_us-east-1': 38,
  };
  return latencyMatrix[pair] || 60;
}
```

---

## 4. HTML5 Canvas 2D Rendering Pipeline (`ArchitectureCanvas.tsx`)

### Screen vs. World Coordinate Transformation

All nodes exist in world space $(x, y)$. To support infinite panning and zooming, mouse events are transformed into world space using:

$$\text{worldX} = \frac{\text{screenX} - \text{pan.x}}{\text{zoom}}$$

$$\text{worldY} = \frac{\text{screenY} - \text{pan.y}}{\text{zoom}}$$

### Concentric Rounded Selection Highlighting

To prevent disjointed visual artifacts, the selection halo matches the node card's exact 10px corner radius:

```typescript
if (isSelected) {
  ctx.save();
  ctx.shadowColor = 'rgba(0, 240, 255, 0.85)';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  // Concentric offset: 3px padding with 13px radius
  ctx.roundRect(node.x - 3, node.y - 3, nodeW + 6, nodeH + 6, 13);
  ctx.stroke();
  ctx.restore();
}
```

### Cubic Bézier Packet Routing

Packets travel along cubic Bézier curves defined between output and input ports:

$$B(t) = (1-t)^3 P_0 + 3(1-t)^2 t P_1 + 3(1-t) t^2 P_2 + t^3 P_3, \quad t \in [0, 1]$$

Where:
- $P_0$: Output port of source node $(x + \text{width}, y + \text{height}/2)$
- $P_1$: Forward control point $(P_0.x + \Delta x \cdot 0.55, P_0.y)$
- $P_2$: Inbound control point $(P_3.x - \Delta x \cdot 0.55, P_3.y)$
- $P_3$: Input port of destination node $(x, y + \text{height}/2)$

### Event Dispatcher: Selection vs. Inspection

To maintain smooth user experience when dragging nodes:
- **`onMouseDown`:** Initiates drag offset and selects node (`setSelectedNodeId`) without opening the drawer.
- **`onDoubleClick`:** Triggers `onOpenNodeInspector`, which slides out the specification drawer.
- **Right-Click Context Menu:** Prevents default browser menu with `e.preventDefault()`, dispatching contextual menus for nodes, edges, or blank canvas.

---

## 5. State Management & Local Storage Persistence (`storage.ts`)

ResiliGraph manages topology persistence under the `resiligraph_v1_` storage prefix:

| Key | Format | Description |
| :--- | :--- | :--- |
| `resiligraph_v1_topology_{id}` | JSON (`SavedTopology`) | Nodes, edges, and target RPS state for built-in or custom topologies |
| `resiligraph_v1_custom_presets_list` | JSON (`ArchitecturePreset[]`) | Array of user-created topologies with metadata, badges, and descriptions |
| `resiligraph_v1_last_active_preset` | String (`presetId`) | Last active preset ID for restoring sessions upon reload |

---

## 6. Extending ResiliGraph

### Tutorial: Adding a New Component Type

To introduce a new architectural component (e.g., `'serverless-function'`):

1. **Update Types (`src/types/index.ts`):**
   ```typescript
   export type NodeType =
     | 'client'
     | 'cdn'
     | 'gateway'
     | 'service'
     | 'database'
     | 'cache'
     | 'queue'
     | 'storage'
     | 'external'
     | 'serverless'; // Add new type
   ```

2. **Add Default Specifications (`src/presets/index.ts` or `AddNodeModal.tsx`):**
   ```typescript
   case 'serverless':
     return {
       techStack: ['AWS Lambda', 'Node.js 20'],
       dockerImage: 'public.ecr.aws/lambda/nodejs:20',
       baseProcessingTimeMs: 15,
       concurrencyLimit: 1000,
     };
   ```

3. **Configure Canvas Icon & Category (`ArchitectureCanvas.tsx`):**
   Assign a relevant icon or badge in the node rendering block.

### Tutorial: Adding a New Infrastructure as Code (IaC) Exporter

To export configurations for Kubernetes manifests or Helm charts:

1. Open `src/utils/exporters.ts`.
2. Implement your export function:
   ```typescript
   export function generateKubernetesManifests(nodes: NodeData[], edges: EdgeData[]): string {
     let yaml = '# Generated by ResiliGraph Kubernetes Exporter\n---\n';
     nodes.forEach(node => {
       yaml += `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: ${node.name.toLowerCase().replace(/\s+/g, '-')}\n...\n---\n`;
     });
     return yaml;
   }
   ```
3. Register the new exporter in `ExportModal.tsx` under a new tab.

---

## 7. Development Workflow & Code Quality Standards

### Prerequisites

- Node.js 18+ or 20+
- npm 9+ or pnpm 8+

### Setup & Commands

```bash
# Clone the repository
git clone https://github.com/Girouetten21/ResiliGraph.git
cd ResiliGraph

# Install dependencies
npm install

# Start Vite development server with HMR
npm run dev

# Run TypeScript compiler & production bundle check
npm run build
```

### Code Style Guidelines

- **Zero Tolerance for Layout Shifts:** HUD telemetry cards and canvas nodes must maintain fixed widths and avoid transformation scaling jitter.
- **Strict TypeScript:** Do not use `any` types. Ensure all interfaces are fully typed.
- **Color Tokens:** Use CSS variables defined in `:root` inside `index.css` (e.g., `var(--accent-cyan)`, `var(--bg-surface)`).
