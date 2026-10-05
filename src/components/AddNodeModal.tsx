import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import type { NodeData, NodeType, NodeCategory, CloudRegion } from '../types';

interface AddNodeModalProps {
  isOpen: boolean;
  initialType?: NodeType;
  onClose: () => void;
  onAddNode: (node: NodeData) => void;
  existingNodes: NodeData[];
}

export const AddNodeModal: React.FC<AddNodeModalProps> = ({
  isOpen,
  initialType,
  onClose,
  onAddNode,
  existingNodes,
}) => {
  const [name, setName] = useState<string>('Custom Microservice');
  const [type, setType] = useState<NodeType>(initialType || 'service');
  const [region, setRegion] = useState<CloudRegion>('us-east-1');
  const [ownerTeam, setOwnerTeam] = useState<string>('Core Backend');
  const [techStack, setTechStack] = useState<string>('Node.js 20, Express, TypeScript');
  const [tier, setTier] = useState<NodeData['tier']>('Tier 2 (High Priority)');
  const [description, setDescription] = useState<string>('Processes business transactions and exposes REST API contracts.');
  const [baseProcessingMs, setBaseProcessingMs] = useState<number>(20);
  const [clientRps, setClientRps] = useState<number>(1200);

  useEffect(() => {
    if (initialType) {
      setType(initialType);
      if (initialType === 'database') {
        setName('PostgreSQL Cluster');
        setTechStack('PostgreSQL 16, PgBouncer');
        setBaseProcessingMs(15);
      } else if (initialType === 'cache') {
        setName('Redis Cache');
        setTechStack('Redis 7.2, In-Memory');
        setBaseProcessingMs(2);
      } else if (initialType === 'queue') {
        setName('Kafka Stream');
        setTechStack('Kafka 3.6, KRaft');
        setBaseProcessingMs(4);
      } else if (initialType === 'client') {
        setName('Traffic Ingress Source');
        setTechStack('k6 Engine, Load Simulator');
      } else if (initialType === 'gateway') {
        setName('Envoy Ingress Gateway');
        setTechStack('Envoy, HTTP/2');
        setBaseProcessingMs(8);
      }
    }
  }, [initialType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let category: NodeCategory = 'compute';
    if (type === 'database' || type === 'cache') category = 'storage';
    if (type === 'gateway' || type === 'cdn') category = 'network';
    if (type === 'queue') category = 'queue';
    if (type === 'client') category = 'client';
    if (type === 'external') category = 'external';

    // Position nicely on canvas
    const count = existingNodes.length;
    const posX = count === 0 ? 100 : 100 + (count % 4) * 260;
    const posY = count === 0 ? 240 : 140 + Math.floor(count / 4) * 160;

    const newNode: NodeData = {
      id: `node-${Date.now()}`,
      name,
      type,
      category,
      region,
      x: posX,
      y: posY,
      width: 190,
      height: 105,
      status: 'healthy',
      techStack: techStack.split(',').map(s => s.trim()).filter(Boolean),
      ownerTeam,
      tier,
      description,
      runbook: `### Standard Operating Runbook for ${name}\n- Check incoming requests and error rate.\n- Restart container if memory exceeds 85%.\n- Inspect upstream connection pool.`,
      endpoints: [
        {
          id: `ep-${Date.now()}`,
          method: type === 'database' || type === 'cache' ? 'GET' : 'POST',
          path: type === 'database' ? '/query' : '/api/v1/resource',
          latencyMs: baseProcessingMs,
          statusCode: 200,
          description: 'Main operation endpoint',
        }
      ],
      metrics: {
        currentRps: 0,
        avgLatencyMs: baseProcessingMs,
        errorRate: 0.0,
        cpuPercent: 12,
        memoryMb: 256,
        maxMemoryMb: 2048,
        activeConnections: 100,
        queueDepth: 0,
        currentReplicas: type === 'client' ? 1 : 2,
      },
      processing: {
        baseProcessingTimeMs: baseProcessingMs,
        concurrencyLimit: type === 'database' ? 200 : (type === 'client' ? 5000 : 1000),
        workerThreads: 4,
        clientGeneratedRps: type === 'client' ? clientRps : undefined,
      },
      autoscaling: {
        enabled: type === 'service' || type === 'gateway',
        minReplicas: 2,
        maxReplicas: 8,
        cpuThresholdPercent: 70,
        scaleUpCooldownMs: 5000,
        lastScaleTime: 0,
      },
      connectionPool: {
        enabled: type === 'database' || type === 'service',
        maxPoolSize: 40,
        activeConnections: 0,
        connectionTimeoutMs: 300,
      },
      retryPolicy: {
        enabled: true,
        maxRetries: 3,
        baseBackoffMs: 50,
        backoffMultiplier: 2,
      },
      chaos: { isKilled: false, latencyJitterMs: 0, errorInjectionRate: 0, isPartitioned: false },
      circuitBreaker: { enabled: type !== 'client', state: 'CLOSED', failureThreshold: 5, consecutiveFailures: 0, resetTimeoutMs: 8000, lastStateChange: Date.now(), probeRequestsAllowed: 2 },
      rateLimiter: { enabled: true, capacity: 2000, tokens: 1900, refillRatePerSec: 2000 },
      dockerImage: `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}:latest`,
    };

    onAddNode(newNode);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container modal-small" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <Plus className="text-cyan" size={20} />
            <div>
              <h2 className="modal-title">Add Architecture Component</h2>
              <span className="modal-subtitle">Spawn a new service, database, client or queue onto the live canvas</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="add-node-form">
          <div className="form-group">
            <label className="form-label">Component Name</label>
            <input
              type="text"
              required
              className="styled-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Recommendation API"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Component Type</label>
              <select
                className="styled-select"
                value={type}
                onChange={(e) => setType(e.target.value as NodeType)}
              >
                <option value="client">Client (Traffic Generator)</option>
                <option value="gateway">API Gateway / Ingress</option>
                <option value="service">Microservice (Compute)</option>
                <option value="database">Database (SQL / NoSQL)</option>
                <option value="cache">In-Memory Cache (Redis)</option>
                <option value="queue">Message Queue (Kafka / RabbitMQ)</option>
                <option value="external">External 3rd Party API</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Cloud Region</label>
              <select
                className="styled-select"
                value={region}
                onChange={(e) => setRegion(e.target.value as CloudRegion)}
              >
                <option value="us-east-1">🌐 us-east-1 (N. Virginia)</option>
                <option value="us-west-2">🌐 us-west-2 (Oregon)</option>
                <option value="eu-central-1">🌐 eu-central-1 (Frankfurt)</option>
                <option value="ap-southeast-1">🌐 ap-southeast-1 (Singapore)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">SLA Tier</label>
              <select
                className="styled-select"
                value={tier}
                onChange={(e) => setTier(e.target.value as NodeData['tier'])}
              >
                <option value="Tier 1 (Mission Critical)">Tier 1 (Mission Critical)</option>
                <option value="Tier 2 (High Priority)">Tier 2 (High Priority)</option>
                <option value="Tier 3 (Standard)">Tier 3 (Standard)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Owner Team</label>
              <input
                type="text"
                required
                className="styled-input"
                value={ownerTeam}
                onChange={(e) => setOwnerTeam(e.target.value)}
              />
            </div>
          </div>

          {type === 'client' ? (
            <div className="form-group">
              <label className="form-label">Generated Traffic Output (RPS)</label>
              <input
                type="number"
                min="50"
                max="10000"
                className="styled-input"
                value={clientRps}
                onChange={(e) => setClientRps(Number(e.target.value))}
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">Base Processing Latency (ms)</label>
              <input
                type="number"
                min="1"
                max="500"
                className="styled-input"
                value={baseProcessingMs}
                onChange={(e) => setBaseProcessingMs(Number(e.target.value))}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Tech Stack (comma separated)</label>
            <input
              type="text"
              required
              className="styled-input"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description & Architectural Purpose</label>
            <textarea
              className="styled-textarea"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="modal-footer form-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Plus size={16} />
              <span>Deploy to Canvas</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
