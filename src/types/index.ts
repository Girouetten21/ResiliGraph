export type NodeType = 
  | 'client'
  | 'cdn'
  | 'gateway'
  | 'service'
  | 'queue'
  | 'database'
  | 'cache'
  | 'storage'
  | 'external';

export type NodeCategory = 'client' | 'network' | 'compute' | 'storage' | 'queue' | 'external';

export type ServiceStatus = 'healthy' | 'degraded' | 'failed' | 'throttled';

export type CloudRegion = 'us-east-1' | 'us-west-2' | 'eu-central-1' | 'ap-southeast-1';

export interface ApiEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  latencyMs: number;
  statusCode: number;
  description: string;
  sampleRequest?: string;
  sampleResponse?: string;
}

export interface NodeMetrics {
  currentRps: number;
  avgLatencyMs: number;
  errorRate: number; // 0.0 to 1.0
  cpuPercent: number;
  memoryMb: number;
  maxMemoryMb: number;
  activeConnections: number;
  queueDepth: number;
  cacheHitRate?: number; // 0.0 to 1.0 for caches
  p95LatencyMs?: number;
  currentReplicas: number;
}

export interface AutoscalingConfig {
  enabled: boolean;
  minReplicas: number;
  maxReplicas: number;
  cpuThresholdPercent: number; // e.g. 70%
  scaleUpCooldownMs: number;
  lastScaleTime: number;
}

export interface ConnectionPoolConfig {
  enabled: boolean;
  maxPoolSize: number;
  activeConnections: number;
  connectionTimeoutMs: number;
}

export interface RetryPolicyConfig {
  enabled: boolean;
  maxRetries: number;
  baseBackoffMs: number;
  backoffMultiplier: number;
}

export interface CachePolicyConfig {
  enabled: boolean;
  ttlSeconds: number;
  evictionStrategy: 'LRU' | 'LFU' | 'FIFO';
  cacheHitRatio: number; // 0.0 to 1.0
}

export interface NodeProcessingConfig {
  baseProcessingTimeMs: number; // Duration to process a request internally
  concurrencyLimit: number;      // Max concurrent in-flight requests before queueing
  workerThreads: number;         // Parallel processing threads per replica
  clientGeneratedRps?: number;   // For Client/Source nodes: individual RPS output
  cacheHitRate?: number;         // For Caches/CDNs: 0.0 - 1.0
}

export interface ChaosConfig {
  isKilled: boolean;
  latencyJitterMs: number;
  errorInjectionRate: number; // 0.0 to 1.0
  isPartitioned: boolean;
}

export interface CircuitBreakerConfig {
  enabled: boolean;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureThreshold: number;
  consecutiveFailures: number;
  resetTimeoutMs: number;
  lastStateChange: number;
  probeRequestsAllowed: number;
}

export interface RateLimiterConfig {
  enabled: boolean;
  capacity: number;
  tokens: number;
  refillRatePerSec: number;
}

export interface NodeData {
  id: string;
  name: string;
  type: NodeType;
  category: NodeCategory;
  region: CloudRegion;
  x: number;
  y: number;
  width: number;
  height: number;
  status: ServiceStatus;
  techStack: string[];
  ownerTeam: string;
  tier: 'Tier 1 (Mission Critical)' | 'Tier 2 (High Priority)' | 'Tier 3 (Standard)';
  description: string;
  runbook: string;
  endpoints: ApiEndpoint[];
  metrics: NodeMetrics;
  processing: NodeProcessingConfig;
  autoscaling: AutoscalingConfig;
  connectionPool: ConnectionPoolConfig;
  retryPolicy: RetryPolicyConfig;
  cachePolicy?: CachePolicyConfig;
  chaos: ChaosConfig;
  circuitBreaker: CircuitBreakerConfig;
  rateLimiter: RateLimiterConfig;
  envVars?: Record<string, string>;
  dockerImage?: string;
}

export interface EdgeData {
  id: string;
  from: string;
  to: string;
  protocol: 'HTTP/2' | 'gRPC' | 'Kafka' | 'TCP/SQL' | 'Redis' | 'WebSocket' | 'AMQP';
  baseLatencyMs: number;
  bandwidthLimitRps: number;
  routingProbability?: number; // 0.0 to 1.0 probability of taking this branch
  status: 'active' | 'congested' | 'broken';
  label?: string;
}

export interface Packet {
  id: string;
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  progress: number; // 0 to 1
  speed: number;
  status: 'success' | 'error' | 'throttled' | 'retry';
  method: string;
  payloadSizeKb: number;
  createdAt: number;
  latencyMs: number;
  retryCount?: number;
}

export type TrafficPattern = 'steady' | 'spike' | 'wave' | 'chaos';

export interface SimulationState {
  isRunning: boolean;
  speedMultiplier: number; // 0.5, 1, 2, 5
  targetRps: number;
  trafficPattern: TrafficPattern;
  totalPacketsProcessed: number;
  successfulPackets: number;
  failedPackets: number;
  throttledPackets: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  systemHealthPercent: number;
  activeCircuitBreakers: number;
  totalReplicas: number;
  chaosMonkeyActive: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  type: 'INFO' | 'WARN' | 'ERROR' | 'CHAOS' | 'CIRCUIT_BREAKER' | 'AUTOSCALE';
  source: string;
  message: string;
}

export interface ArchitecturePreset {
  id: string;
  name: string;
  description: string;
  badge: string;
  nodes: NodeData[];
  edges: EdgeData[];
}
