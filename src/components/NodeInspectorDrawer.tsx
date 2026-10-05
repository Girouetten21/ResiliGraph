import React, { useState, useRef } from 'react';
import { X, Server, Activity, BookOpen, Flame, Database, Network, AlertTriangle, Sliders, Trash2, Cpu, Maximize2, Minimize2, GripVertical } from 'lucide-react';
import type { NodeData, CloudRegion } from '../types';

interface NodeInspectorDrawerProps {
  node: NodeData | null;
  onClose: () => void;
  onUpdateNode: (nodeId: string, updater: (node: NodeData) => void) => void;
  onKillToggle: (nodeId: string) => void;
  onLatencyChange: (nodeId: string, latencyMs: number) => void;
  onErrorRateChange: (nodeId: string, errorRate: number) => void;
  onCircuitBreakerToggle: (nodeId: string, enabled: boolean) => void;
  onRateLimiterToggle: (nodeId: string, enabled: boolean) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const NodeInspectorDrawer: React.FC<NodeInspectorDrawerProps> = ({
  node,
  onClose,
  onUpdateNode,
  onKillToggle,
  onLatencyChange,
  onErrorRateChange,
  onCircuitBreakerToggle,
  onRateLimiterToggle,
  onDeleteNode,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'processing' | 'sre' | 'endpoints' | 'chaos' | 'runbook'>('overview');
  
  // Resizable drawer state
  const [drawerWidth, setDrawerWidth] = useState<number>(() => {
    const saved = localStorage.getItem('resiligraph_drawer_width');
    return saved ? Math.max(380, Math.min(850, Number(saved))) : 490;
  });
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);

  // Drag to resize logic
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsResizing(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newWidth = Math.max(380, Math.min(window.innerWidth - 80, window.innerWidth - moveEvent.clientX));
      setDrawerWidth(newWidth);
      setIsMaximized(false);
      localStorage.setItem('resiligraph_drawer_width', String(newWidth));
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      setIsResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  if (!node) return null;

  const isDead = node.chaos.isKilled;
  const currentWidth = isMaximized ? Math.min(760, window.innerWidth - 60) : drawerWidth;

  return (
    <aside
      className={`node-inspector-drawer ${isResizing ? 'drawer-is-resizing' : ''}`}
      style={{ width: `${currentWidth}px` }}
      aria-label="Component Specification and Controls"
    >
      {/* Left Edge Resize Handle */}
      <div
        className="drawer-resize-handle"
        onMouseDown={handleMouseDownResize}
        title="Drag left/right to resize inspector menu"
      >
        <div className="resize-handle-bar">
          <GripVertical size={12} />
        </div>
      </div>

      {/* Header */}
      <div className="drawer-header">
        <div className="drawer-header-left">
          <div className={`node-type-icon type-${node.type}`}>
            {node.type === 'database' || node.type === 'cache' ? <Database size={20} /> :
             node.type === 'gateway' || node.type === 'cdn' ? <Network size={20} /> :
             <Server size={20} />}
          </div>
          <div>
            <div className="drawer-title-row">
              <input
                type="text"
                className="drawer-title-input"
                value={node.name}
                onChange={(e) => onUpdateNode(node.id, n => { n.name = e.target.value; })}
                title="Click to rename component"
              />
              <span className={`status-pill pill-${node.status}`}>
                {node.status.toUpperCase()}
              </span>
            </div>
            <span className="drawer-subtitle">{node.tier} • {node.ownerTeam}</span>
          </div>
        </div>

        <div className="drawer-header-actions">
          <button
            className="drawer-action-btn"
            onClick={toggleMaximize}
            title={isMaximized ? "Restore default width" : "Expand inspector panel"}
          >
            {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button className="drawer-close-btn" onClick={onClose} title="Close Inspector">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Modern 2-Row Segmented Tab Grid (Zero Scrollbars) */}
      <div className="drawer-segmented-tabs">
        <button
          className={`drawer-segment-btn ${activeTab === 'overview' ? 'segment-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={14} />
          <span>Overview</span>
        </button>
        <button
          className={`drawer-segment-btn ${activeTab === 'processing' ? 'segment-active' : ''}`}
          onClick={() => setActiveTab('processing')}
        >
          <Sliders size={14} />
          <span>Performance</span>
        </button>
        <button
          className={`drawer-segment-btn ${activeTab === 'sre' ? 'segment-active' : ''}`}
          onClick={() => setActiveTab('sre')}
        >
          <Cpu size={14} />
          <span>Autoscale & SRE</span>
        </button>
        <button
          className={`drawer-segment-btn ${activeTab === 'endpoints' ? 'segment-active' : ''}`}
          onClick={() => setActiveTab('endpoints')}
        >
          <Network size={14} />
          <span>Endpoints ({node.endpoints.length})</span>
        </button>
        <button
          className={`drawer-segment-btn ${activeTab === 'chaos' ? 'segment-active' : ''}`}
          onClick={() => setActiveTab('chaos')}
        >
          <Flame size={14} />
          <span>Chaos</span>
        </button>
        <button
          className={`drawer-segment-btn ${activeTab === 'runbook' ? 'segment-active' : ''}`}
          onClick={() => setActiveTab('runbook')}
        >
          <BookOpen size={14} />
          <span>Runbook</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="drawer-content">
        {activeTab === 'overview' && (
          <div className="tab-pane">
            <div className="inspector-card">
              <h3 className="section-heading">Description & Configuration</h3>
              <textarea
                className="styled-textarea drawer-desc-textarea"
                rows={3}
                value={node.description}
                onChange={(e) => onUpdateNode(node.id, n => { n.description = e.target.value; })}
                placeholder="Describe architectural role, business logic, and operational purpose..."
              />
            </div>

            <div className="inspector-card">
              <h3 className="section-heading">Deployment Region & Tier</h3>
              <div className="form-row drawer-form-row">
                <div className="form-group">
                  <label className="form-label">Cloud Region</label>
                  <select
                    className="styled-select"
                    value={node.region || 'us-east-1'}
                    onChange={(e) => onUpdateNode(node.id, n => { n.region = e.target.value as CloudRegion; })}
                  >
                    <option value="us-east-1">🌐 us-east-1 (N. Virginia)</option>
                    <option value="us-west-2">🌐 us-west-2 (Oregon)</option>
                    <option value="eu-central-1">🌐 eu-central-1 (Frankfurt)</option>
                    <option value="ap-southeast-1">🌐 ap-southeast-1 (Singapore)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tier SLA</label>
                  <select
                    className="styled-select"
                    value={node.tier}
                    onChange={(e) => onUpdateNode(node.id, n => { n.tier = e.target.value as NodeData['tier']; })}
                  >
                    <option value="Tier 1 (Mission Critical)">Tier 1 (Critical)</option>
                    <option value="Tier 2 (High Priority)">Tier 2 (High)</option>
                    <option value="Tier 3 (Standard)">Tier 3 (Standard)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="inspector-card">
              <h3 className="section-heading">Technology Stack</h3>
              <div className="tech-tags-list">
                {node.techStack.map((tech) => (
                  <span key={tech} className="tech-tag">{tech}</span>
                ))}
              </div>
              <div className="tech-edit-row">
                <label className="form-sublabel">Edit Technologies (comma-separated):</label>
                <input
                  type="text"
                  className="styled-input"
                  value={node.techStack.join(', ')}
                  onChange={(e) => onUpdateNode(node.id, n => { n.techStack = e.target.value.split(',').map(s => s.trim()).filter(Boolean); })}
                  placeholder="e.g. Node.js 20, PostgreSQL, Redis"
                />
              </div>
            </div>

            <div className="inspector-card">
              <h3 className="section-heading">Live Node Telemetry (Isolated)</h3>
              <div className="metrics-grid">
                <div className="metric-box">
                  <span className="metric-label">Node Throughput</span>
                  <span className="metric-val text-cyan">{node.metrics.currentRps.toLocaleString()} RPS</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Execution Latency</span>
                  <span className="metric-val text-purple">{node.metrics.avgLatencyMs} ms</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">CPU Saturation</span>
                  <div className="cpu-metric-bar">
                    <span>{node.metrics.cpuPercent}%</span>
                    <div className="progress-bg">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${node.metrics.cpuPercent}%`,
                          backgroundColor: node.metrics.cpuPercent > 75 ? '#ef4444' : '#10b981'
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Active Replicas</span>
                  <span className="metric-val text-emerald">{node.metrics.currentReplicas || 1} Instances</span>
                </div>
              </div>
            </div>

            <div className="delete-section">
              <button
                className="btn-danger-outline"
                onClick={() => onDeleteNode(node.id)}
                title="Remove component and connections from architecture"
              >
                <Trash2 size={15} />
                <span>Delete Component from Architecture</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'processing' && (
          <div className="tab-pane">
            {node.type === 'client' && (
              <div className="chaos-control-box">
                <h4 className="chaos-item-title">Client Output Traffic (RPS)</h4>
                <p className="chaos-item-desc">Individual requests per second generated by this traffic source.</p>
                <div className="slider-row">
                  <input
                    type="range"
                    min="50"
                    max="6000"
                    step="50"
                    value={node.processing?.clientGeneratedRps || 1000}
                    onChange={(e) => onUpdateNode(node.id, n => {
                      if (!n.processing) n.processing = { baseProcessingTimeMs: 4, concurrencyLimit: 1000, workerThreads: 4 };
                      n.processing.clientGeneratedRps = Number(e.target.value);
                    })}
                    className="styled-slider"
                  />
                  <span className="slider-value">{(node.processing?.clientGeneratedRps || 1000).toLocaleString()} RPS</span>
                </div>
              </div>
            )}

            <div className="chaos-control-box">
              <h4 className="chaos-item-title">Base Internal Processing Time</h4>
              <p className="chaos-item-desc">Duration the CPU/Worker thread spends computing before answering.</p>
              <div className="slider-row">
                <input
                  type="range"
                  min="1"
                  max="400"
                  step="1"
                  value={node.processing?.baseProcessingTimeMs || 10}
                  onChange={(e) => onUpdateNode(node.id, n => {
                    if (!n.processing) n.processing = { baseProcessingTimeMs: 10, concurrencyLimit: 1000, workerThreads: 4 };
                    n.processing.baseProcessingTimeMs = Number(e.target.value);
                  })}
                  className="styled-slider"
                />
                <span className="slider-value">{node.processing?.baseProcessingTimeMs || 10} ms</span>
              </div>
            </div>

            <div className="chaos-control-box">
              <h4 className="chaos-item-title">Concurrency Limit Per Instance</h4>
              <p className="chaos-item-desc">Max concurrent requests per container before queueing begins.</p>
              <div className="slider-row">
                <input
                  type="range"
                  min="50"
                  max="5000"
                  step="50"
                  value={node.processing?.concurrencyLimit || 1000}
                  onChange={(e) => onUpdateNode(node.id, n => {
                    if (!n.processing) n.processing = { baseProcessingTimeMs: 10, concurrencyLimit: 1000, workerThreads: 4 };
                    n.processing.concurrencyLimit = Number(e.target.value);
                  })}
                  className="styled-slider"
                />
                <span className="slider-value">{node.processing?.concurrencyLimit || 1000}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sre' && (
          <div className="tab-pane">
            <div className="chaos-control-box">
              <div className="chaos-item-row">
                <div>
                  <h4 className="chaos-item-title">Horizontal Pod Autoscaler (HPA)</h4>
                  <p className="chaos-item-desc">Dynamically scale container replicas based on CPU load.</p>
                </div>
                <input
                  type="checkbox"
                  checked={node.autoscaling?.enabled || false}
                  onChange={(e) => onUpdateNode(node.id, n => {
                    if (!n.autoscaling) n.autoscaling = { enabled: true, minReplicas: 1, maxReplicas: 8, cpuThresholdPercent: 70, scaleUpCooldownMs: 5000, lastScaleTime: 0 };
                    n.autoscaling.enabled = e.target.checked;
                  })}
                  className="styled-checkbox"
                />
              </div>

              {node.autoscaling?.enabled && (
                <>
                  <div className="slider-row">
                    <span className="form-label">CPU Trigger Threshold:</span>
                    <input
                      type="range"
                      min="40"
                      max="90"
                      step="5"
                      value={node.autoscaling.cpuThresholdPercent}
                      onChange={(e) => onUpdateNode(node.id, n => { n.autoscaling.cpuThresholdPercent = Number(e.target.value); })}
                      className="styled-slider"
                    />
                    <span className="slider-value">{node.autoscaling.cpuThresholdPercent}%</span>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Min Replicas</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        className="styled-input"
                        value={node.autoscaling.minReplicas}
                        onChange={(e) => onUpdateNode(node.id, n => { n.autoscaling.minReplicas = Number(e.target.value); })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Max Replicas</label>
                      <input
                        type="number"
                        min="2"
                        max="32"
                        className="styled-input"
                        value={node.autoscaling.maxReplicas}
                        onChange={(e) => onUpdateNode(node.id, n => { n.autoscaling.maxReplicas = Number(e.target.value); })}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="chaos-control-box">
              <div className="chaos-item-row">
                <div>
                  <h4 className="chaos-item-title">Database Connection Pool</h4>
                  <p className="chaos-item-desc">Limit concurrent active database socket handles.</p>
                </div>
                <input
                  type="checkbox"
                  checked={node.connectionPool?.enabled || false}
                  onChange={(e) => onUpdateNode(node.id, n => {
                    if (!n.connectionPool) n.connectionPool = { enabled: true, maxPoolSize: 20, activeConnections: 0, connectionTimeoutMs: 200 };
                    n.connectionPool.enabled = e.target.checked;
                  })}
                  className="styled-checkbox"
                />
              </div>

              {node.connectionPool?.enabled && (
                <div className="slider-row">
                  <span className="form-label">Max Pool Size:</span>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={node.connectionPool.maxPoolSize}
                    onChange={(e) => onUpdateNode(node.id, n => { n.connectionPool.maxPoolSize = Number(e.target.value); })}
                    className="styled-slider"
                  />
                  <span className="slider-value">{node.connectionPool.maxPoolSize} conns</span>
                </div>
              )}
            </div>

            <div className="chaos-control-box">
              <div className="chaos-item-row">
                <div>
                  <h4 className="chaos-item-title">Exponential Retry Policy</h4>
                  <p className="chaos-item-desc">Automatically retry failed requests with backoff.</p>
                </div>
                <input
                  type="checkbox"
                  checked={node.retryPolicy?.enabled || false}
                  onChange={(e) => onUpdateNode(node.id, n => {
                    if (!n.retryPolicy) n.retryPolicy = { enabled: true, maxRetries: 3, baseBackoffMs: 50, backoffMultiplier: 2 };
                    n.retryPolicy.enabled = e.target.checked;
                  })}
                  className="styled-checkbox"
                />
              </div>

              {node.retryPolicy?.enabled && (
                <div className="slider-row">
                  <span className="form-label">Max Retries:</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={node.retryPolicy.maxRetries}
                    onChange={(e) => onUpdateNode(node.id, n => { n.retryPolicy.maxRetries = Number(e.target.value); })}
                    className="styled-slider"
                  />
                  <span className="slider-value">{node.retryPolicy.maxRetries} tries</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'endpoints' && (
          <div className="tab-pane">
            <div className="endpoints-list">
              {node.endpoints.map((ep, idx) => (
                <div key={ep.id} className="endpoint-item">
                  <div className="endpoint-header">
                    <span className={`method-pill method-${ep.method.toLowerCase()}`}>{ep.method}</span>
                    <input
                      type="text"
                      className="styled-input-clean"
                      value={ep.path}
                      onChange={(e) => onUpdateNode(node.id, n => { n.endpoints[idx].path = e.target.value; })}
                    />
                    <span className="endpoint-status">{ep.statusCode}</span>
                  </div>
                  <input
                    type="text"
                    className="styled-input-clean desc-input"
                    value={ep.description}
                    onChange={(e) => onUpdateNode(node.id, n => { n.endpoints[idx].description = e.target.value; })}
                    placeholder="Endpoint description"
                  />
                </div>
              ))}
              <button
                className="btn-secondary add-ep-btn"
                onClick={() => onUpdateNode(node.id, n => {
                  n.endpoints.push({
                    id: `ep-${Date.now()}`,
                    method: 'POST',
                    path: '/api/v1/resource',
                    latencyMs: 20,
                    statusCode: 200,
                    description: 'New API endpoint',
                  });
                })}
              >
                + Add Endpoint Contract
              </button>
            </div>
          </div>
        )}

        {activeTab === 'chaos' && (
          <div className="tab-pane">
            <div className="chaos-control-box">
              <div className="chaos-item-row">
                <div>
                  <h4 className="chaos-item-title">Terminate Node (Crash Simulation)</h4>
                  <p className="chaos-item-desc">Instantly crash process to simulate hardware or OOM failure.</p>
                </div>
                <button
                  className={`chaos-toggle-btn ${isDead ? 'btn-danger-active' : 'btn-danger'}`}
                  onClick={() => onKillToggle(node.id)}
                >
                  {isDead ? 'Revive Node' : 'Kill Service'}
                </button>
              </div>
            </div>

            <div className="chaos-control-box">
              <h4 className="chaos-item-title">Inject Artificial Network Latency</h4>
              <p className="chaos-item-desc">Simulate slow queries or cross-region fiber jitter.</p>
              <div className="slider-row">
                <input
                  type="range"
                  min="0"
                  max="1500"
                  step="50"
                  value={node.chaos.latencyJitterMs}
                  onChange={(e) => onLatencyChange(node.id, Number(e.target.value))}
                  className="styled-slider"
                />
                <span className="slider-value">+{node.chaos.latencyJitterMs} ms</span>
              </div>
            </div>

            <div className="chaos-control-box">
              <h4 className="chaos-item-title">Inject HTTP 500 Error Rate</h4>
              <p className="chaos-item-desc">Simulate unhandled exceptions or lock timeouts.</p>
              <div className="slider-row">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={node.chaos.errorInjectionRate}
                  onChange={(e) => onErrorRateChange(node.id, Number(e.target.value))}
                  className="styled-slider"
                />
                <span className="slider-value">{Math.round(node.chaos.errorInjectionRate * 100)}%</span>
              </div>
            </div>

            <div className="chaos-control-box">
              <div className="chaos-item-row">
                <div>
                  <h4 className="chaos-item-title">Circuit Breaker Protection</h4>
                  <p className="chaos-item-desc">Fast-fails downstream to avoid cascading overload.</p>
                </div>
                <input
                  type="checkbox"
                  checked={node.circuitBreaker.enabled}
                  onChange={(e) => onCircuitBreakerToggle(node.id, e.target.checked)}
                  className="styled-checkbox"
                />
              </div>
              {node.circuitBreaker.enabled && (
                <div className="circuit-status-display">
                  <div className="circuit-metric">
                    <span>State:</span>
                    <strong className={`circuit-state state-${node.circuitBreaker.state.toLowerCase()}`}>
                      {node.circuitBreaker.state}
                    </strong>
                  </div>
                  <div className="circuit-metric">
                    <span>Threshold:</span>
                    <strong>{node.circuitBreaker.failureThreshold} errors</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="chaos-control-box">
              <div className="chaos-item-row">
                <div>
                  <h4 className="chaos-item-title">Token Bucket Rate Limiter</h4>
                  <p className="chaos-item-desc">Shed excess requests when capacity runs out.</p>
                </div>
                <input
                  type="checkbox"
                  checked={node.rateLimiter.enabled}
                  onChange={(e) => onRateLimiterToggle(node.id, e.target.checked)}
                  className="styled-checkbox"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'runbook' && (
          <div className="tab-pane">
            <div className="runbook-container">
              <div className="runbook-header">
                <AlertTriangle size={16} className="text-amber" />
                <span>On-Call Incident Response Guide</span>
              </div>
              <div className="runbook-body">
                <textarea
                  className="styled-textarea runbook-editor"
                  rows={10}
                  value={node.runbook}
                  onChange={(e) => onUpdateNode(node.id, n => { n.runbook = e.target.value; })}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
