# 📖 ResiliGraph — Comprehensive User Guide

**ResiliGraph** is an interactive, real-time distributed architecture simulation engine and living specification workbench. It transforms static architecture designs into dynamic, executable topologies where you can observe real-world traffic flows, queuing bottlenecks, autoscaling behaviors, and chaos fault injections.

---

## 📑 Table of Contents

1. [Introduction & Core Concepts](#1-introduction--core-concepts)
2. [Navigating the Workspace](#2-navigating-the-workspace)
3. [Building Topologies](#3-building-topologies)
   - [Deploying Components](#deploying-components)
   - [Interconnecting Services](#interconnecting-services)
   - [Supported Node Categories](#supported-node-categories)
4. [Master Simulation Controls & Traffic Shaping](#4-master-simulation-controls--traffic-shaping)
5. [Understanding the Real-Time Telemetry HUD](#5-understanding-the-real-time-telemetry-hud)
6. [Inspecting & Configuring Components](#6-inspecting--configuring-components)
   - [Double-Click Inspection](#double-click-inspection)
   - [Rate Limiting (Token Bucket)](#rate-limiting-token-bucket)
   - [Circuit Breaker Configuration](#circuit-breaker-configuration)
   - [Horizontal Pod Autoscaling (HPA)](#horizontal-pod-autoscaling-hpa)
   - [Runbooks & Team Ownership](#runbooks--team-ownership)
7. [Chaos Engineering Drills](#7-chaos-engineering-drills)
   - [Chaos Monkey](#chaos-monkey)
   - [10x Surge Spikes](#10x-surge-spikes)
   - [Manual Fault Injections (Kill, Latency, Errors)](#manual-fault-injections-kill-latency-errors)
8. [Automated SRE Reliability Benchmark & Scorecard](#8-automated-sre-reliability-benchmark--scorecard)
9. [Managing Custom Topologies](#9-managing-custom-topologies)
   - [Saving Current Snapshots](#saving-current-snapshots)
   - [Switching & Loading Topologies](#switching--loading-topologies)
   - [Editing & Deleting with Safety Confirmations](#editing--deleting-with-safety-confirmations)
10. [Exporting Infrastructure as Code (IaC)](#10-exporting-infrastructure-as-code-iac)

---

## 1. Introduction & Core Concepts

In modern distributed systems, theoretical system diagrams often fail to reveal real-world runtime behavior:
- How does downstream database latency impact upstream API gateway queues?
- When does a traffic spike trigger container autoscaling?
- What happens if a mission-critical microservice crashes or throws 60% HTTP 500 errors?
- Are your circuit breakers correctly configured to isolate cascading failures?

ResiliGraph answers these questions by running a **60 FPS discrete-event simulation engine** directly in your browser. Every request is modeled as a discrete packet traversing cubic Bézier interconnects, taking into account processing concurrency, queuing delays, geographical fiber penalties, and fault injection filters.

---

## 2. Navigating the Workspace

The workspace is organized into four main layers:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  TOP NAVBAR: Presets, Topologies Manager, Simulation State, Speed, Chaos     │
├──────────────────────────────────────────────────────────────────────────────┤
│  TELEMETRY HUD: Health, Throughput, Percentiles, Breakers, Replicas, Packets │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                         60 FPS INTERACTIVE CANVAS                            │
│                  (Nodes, Interconnects, Packet Physics)                     │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  FLOATING TOOLBAR: Zoom, Reset View, Delete Component  │  GITHUB BADGE (🔗) │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Canvas Navigation Gestures

- **Pan:** Click and hold the left mouse button on any empty area of the canvas, then drag to glide across the workspace.
- **Zoom In / Out:** Scroll your mouse wheel up or down, or use the `+` and `-` buttons in the bottom-left floating toolbar. The zoom level ranges from **40% to 250%**.
- **Reset Center:** Click the `⤢ Reset View` button in the floating toolbar or right-click the canvas and select `Reset Canvas Center`.
- **Delete Selected:** Select any node or interconnect cable and press the `Delete` or `Backspace` key (or click the floating `🗑️ Delete` button).

---

## 3. Building Topologies

### Deploying Components

You can spawn components into the canvas using multiple workflows:

1. **Context Menu (Recommended):** Right-click anywhere on empty canvas space to open the component catalog. Select from:
   - ⚡ **Microservice (Compute)**
   - 🗄️ **PostgreSQL / Database**
   - ⚡ **Redis Cache**
   - 📨 **Kafka / RabbitMQ Queue**
   - 🌐 **Traffic Client Source**
2. **Navbar Add Button:** Click the `➕ Add Node` button in the top navigation bar to open the detailed component deployment wizard.
3. **Duplication:** Right-click an existing node and select `📋 Duplicate Component` to clone all its configuration parameters, tech stack, and thresholds.

### Interconnecting Services

Services communicate over defined network links:
1. Hover your cursor over the **Right Port (cyan circle)** of the source node.
2. Click and drag an elastic interconnect wire toward the target node.
3. Drop the wire anywhere inside the target node's bounding box.
4. ResiliGraph automatically assigns the optimal protocol based on component types (e.g., `TCP/SQL` for databases, `Redis` for caches, `Kafka` for queues, and `HTTP/2` or `gRPC` for microservices).

---

## 4. Master Simulation Controls & Traffic Shaping

Located in the top header, the simulation control deck gives you fine-grained authority over the runtime environment:

- **Play / Pause:** Start or freeze the simulation loop at any time. When paused, packet motion and queuing transitions freeze in place, allowing you to examine in-flight states.
- **Speed Multipliers (`0.5x`, `1x`, `2x`, `5x`):** Accelerate or slow down physical simulation time. Use `5x` to observe multi-minute autoscaling cooldowns rapidly.
- **Master RPS Slider (`200` to `12,000` RPS):** Scales the total synthetic traffic load generated by client nodes across the topology.
- **Traffic Patterns:**
  - **Steady:** Stable, constant ingress rate for establishing baseline metrics.
  - **Wave:** Sinusoidal diurnal wave simulating day/night peak-and-valley traffic patterns.
  - **Chaos Jitter:** Non-deterministic stochastic traffic fluctuations with burst intervals.

---

## 5. Understanding the Real-Time Telemetry HUD

The floating Telemetry HUD displays mission-critical cluster health metrics updated at 60 FPS:

```
┌─────────────────┬──────────────────┬──────────────────────┬──────────────────┬─────────────────┬───────────────────────┐
│  SYSTEM HEALTH  │ INGRESS THROUGH- │ LATENCY DISTRIBUTION │ CIRCUIT BREAKERS │ ACTIVE REPLICAS │  PACKET BREAKDOWN     │
│       98%       │     PUT          │   p50: 18ms          │     0 Tripped    │     8 Pods      │  OK:   24,510         │
│    [HEALTHY]    │    3,200 req/s   │   p95: 42ms          │                  │                 │  DROP:    120         │
│                 │                  │   p99: 110ms         │                  │                 │  FAIL:      5         │
└─────────────────┴──────────────────┴──────────────────────┴──────────────────┴─────────────────┴───────────────────────┘
```

1. **System Health:** Composite reliability score combining **request success ratio (65% weight)** and **active infrastructure availability (35% weight)**. Displays `IDLE` when no components exist on the canvas.
2. **Ingress Throughput:** Total requests per second arriving at the entry boundary.
3. **Latency Distribution:** Real-time percentile distribution (`p50`, `p95`, `p99`) sampled from live end-to-end packet travel times, including queuing delays and cross-region fiber penalties.
4. **Circuit Breakers:** Live counter of tripped (`OPEN`) circuit breakers. Displays a gentle amber glow when active without layout shifting.
5. **Active Replicas:** Sum of all container instances currently running across your topology, dynamically increased by HPA controllers.
6. **OK / DROP / FAIL:** Breakdown of completed requests, throttled packets (dropped by token bucket rate limiters), and failed packets (HTTP 500s or killed services).

---

## 6. Inspecting & Configuring Components

### Double-Click Inspection

- **Single Click / Drag:** Selects the node for repositioning or deletion without cluttering the screen. A concentric rounded halo confirms selection.
- **Double Click:** Opens the comprehensive **Node Specification & Runbook Drawer** on the right side of the screen.

### Rate Limiting (Token Bucket)

Protect services from denial-of-service surges:
- **Bucket Capacity:** Maximum burst token pool.
- **Refill Rate:** Sustained requests allowed per second.
- When tokens are exhausted, excess packets are discarded with zero latency impact on backend compute.

### Circuit Breaker Configuration

Prevent cascading failures across the dependency graph:
- **Failure Threshold:** Number of consecutive errors required to trip the breaker.
- **State Machine:**
  - `CLOSED`: Normal traffic flow.
  - `OPEN`: Immediate fast-failing of upstream calls, saving downstream services from exhaustion.
  - `HALF_OPEN`: Trial probing to verify downstream recovery before full resumption.
- **Reset Timeout:** Duration (in milliseconds) the breaker remains open before probing recovery.

### Horizontal Pod Autoscaling (HPA)

- **CPU Threshold:** Target CPU load (e.g., 70%) that triggers scale-up actions.
- **Min / Max Replicas:** Lower and upper container bounds (e.g., 2 to 10 pods).
- **Scale Cooldown:** Cooldown window to prevent flapping or rapid oscillations.

---

## 7. Chaos Engineering Drills

ResiliGraph incorporates automated chaos fault injection engines:

1. **Chaos Monkey:** Randomly injects transient faults across the cluster:
   - Unexpected container crashes (OOM kills) with automatic orchestrator recovery after 5 seconds.
   - Network latency penalties (+350ms to +850ms).
   - Error rate spikes (60% HTTP 500 responses to test circuit breaker tripping).
2. **10x Surge Spike:** Simulates instantaneous viral traffic surges to validate autoscaling elasticity.
3. **Manual Fault Injection:**
   - Right-click any node and select `🔥 Kill / Revive Service` to simulate a total hard crash.
   - In the inspector drawer, dial custom latency jitter or error rates directly.

---

## 8. Automated SRE Reliability Benchmark & Scorecard

Click **`Benchmark`** in the top navigation bar to execute an automated resiliency audit:

- **Stress Injection:** Simulates 10,000 synthetic requests with active failure injection.
- **Scorecard Hero:** Calculates an overall Resilience Grade (**A+**, **B+**, **C**, or **F**).
- **KPI Metrics:**
  - **Circuit Breaker Mesh Coverage:** Percentage of mission-critical services hedged against cascading failure.
  - **HPA Elastic Coverage:** Percentage of compute services configured with autoscaling.
  - **Simulated Availability SLA:** Empirical SLA percentage under failure injection.
  - **Single Points of Failure (SPOF):** Identifies unhedged sink nodes whose failure halts ingress.
- **Actionable SRE Recommendations:** Specific, clear guidance on improving fault tolerance (e.g., adding circuit breakers to specific cache or database layers).

---

## 9. Managing Custom Topologies

ResiliGraph provides built-in persistence and custom architecture management:

- Click **`📁 Topologies`** in the top navigation bar.
- **Save Current Canvas As New:** Enter a custom name (e.g., *"Payment Gateway v2"*), description, and tag (*Production*, *Staging*, *Chaos Drill*). Your entire graph (nodes, positions, configs, edges) is saved to local storage.
- **My Topologies:** Browse, rename, or load saved personal architectures at any time.
- **Deletion Confirmation:** Deleting a custom topology prompts an inline confirmation prompt (*"¿Estás seguro de que deseas eliminar...?"*) to avoid accidental loss.
- **Navbar Selector:** Custom topologies appear organized under `⭐ My Custom Topologies` alongside standard system presets.

---

## 10. Exporting Infrastructure as Code (IaC)

Click **`Export`** in the top navigation bar to generate deployment artifacts from your visual design:

1. **Docker Compose (`docker-compose.yml`):** Multi-container orchestration definitions with matching ports, environment variables, resource limits, and health checks.
2. **AWS Terraform (`main.tf`):** Infrastructure as Code definitions for AWS ECS Fargate services, Application Load Balancers (ALBs), RDS PostgreSQL instances, ElastiCache Redis clusters, and Security Groups.
3. **Living Specification (`LIVING_SPEC.md`):** Complete markdown architectural runbook documenting service tiers, owner teams, runbooks, and failure recovery policies.
