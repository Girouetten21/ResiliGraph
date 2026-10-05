import React, { useState, useEffect, useRef } from 'react';
import { ARCHITECTURE_PRESETS } from './presets';
import { SimulationEngine } from './engine/simulationEngine';
import { ArchitectureCanvas } from './components/ArchitectureCanvas';
import { TopNav } from './components/TopNav';
import { TelemetryHud } from './components/TelemetryHud';
import { NodeInspectorDrawer } from './components/NodeInspectorDrawer';
import { ExportModal } from './components/ExportModal';
import { AuditLogDrawer } from './components/AuditLogDrawer';
import { AddNodeModal } from './components/AddNodeModal';
import { BenchmarkModal } from './components/BenchmarkModal';
import { CustomTopologyModal } from './components/CustomTopologyModal';
import { AppLoader } from './components/AppLoader';
import { 
  saveTopology, 
  loadTopology, 
  clearSavedTopology, 
  hasCustomSavedTopology, 
  getLastActivePresetId,
  getCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
} from './utils/storage';
import type { NodeData, EdgeData, Packet, SimulationState, AuditLogEntry, NodeType, ArchitecturePreset } from './types';

export const App: React.FC = () => {
  const [customPresets, setCustomPresets] = useState<ArchitecturePreset[]>(() => getCustomPresets());
  const allPresets = [...ARCHITECTURE_PRESETS, ...customPresets];

  const initialPresetId = getLastActivePresetId() || ARCHITECTURE_PRESETS[0].id;
  const [currentPresetId, setCurrentPresetId] = useState<string>(initialPresetId);
  const currentPreset = allPresets.find(p => p.id === currentPresetId) || ARCHITECTURE_PRESETS[0];

  const engineRef = useRef<SimulationEngine | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  const [nodes, setNodes] = useState<NodeData[]>(() => {
    const saved = loadTopology(initialPresetId);
    return saved ? saved.nodes : currentPreset.nodes;
  });
  const [edges, setEdges] = useState<EdgeData[]>(() => {
    const saved = loadTopology(initialPresetId);
    return saved ? saved.edges : currentPreset.edges;
  });
  const [packets, setPackets] = useState<Packet[]>([]);
  const [simState, setSimState] = useState<SimulationState>({
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
    totalReplicas: 0,
    chaosMonkeyActive: false,
  });
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Persistence State
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [hasCustomChanges, setHasCustomChanges] = useState<boolean>(() => hasCustomSavedTopology(initialPresetId));

  // Canvas selection vs Drawer inspection state (Separated for smooth dragging without forced drawer opening)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [inspectingNodeId, setInspectingNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Modals & Drawers state
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false);
  const [isAddNodeOpen, setIsAddNodeOpen] = useState<boolean>(false);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState<boolean>(false);
  const [isTopologyManagerOpen, setIsTopologyManagerOpen] = useState<boolean>(false);
  const [addNodeInitialType, setAddNodeInitialType] = useState<NodeType | undefined>(undefined);

  // Auto-save helper with debounce
  const triggerAutoSave = (updatedNodes: NodeData[], updatedEdges: EdgeData[], rps?: number) => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      saveTopology(currentPresetId, updatedNodes, updatedEdges, rps ?? simState.targetRps);
      setSaveStatus('saved');
      setHasCustomChanges(true);
    }, 400);
  };

  // Manual save handler
  const handleManualSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTopology(currentPresetId, nodes, edges, simState.targetRps);
    setSaveStatus('saved');
    setHasCustomChanges(true);
  };

  // Reset current preset to factory defaults
  const handleResetPresetToDefault = () => {
    clearSavedTopology(currentPresetId);
    setHasCustomChanges(false);
    const engine = new SimulationEngine(currentPreset.nodes, currentPreset.edges);
    engineRef.current = engine;
    setNodes(engine.getNodes());
    setEdges(engine.getEdges());
    setPackets([]);
    setSelectedNodeId(null);
    setInspectingNodeId(null);
    setSelectedEdgeId(null);
    setSaveStatus('saved');
  };

  // Custom Topologies Management Handlers
  const handleSaveNewCustomTopology = (name: string, description: string, badge: string) => {
    const newId = `custom-topo-${Date.now()}`;
    const newPreset: ArchitecturePreset = {
      id: newId,
      name,
      description,
      badge,
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    saveCustomPreset(newPreset);
    setCustomPresets(getCustomPresets());
    setCurrentPresetId(newId);
  };

  const handleUpdateCustomTopology = (updatedPreset: ArchitecturePreset) => {
    saveCustomPreset(updatedPreset);
    setCustomPresets(getCustomPresets());
  };

  const handleDeleteCustomTopology = (presetId: string) => {
    deleteCustomPreset(presetId);
    const updated = getCustomPresets();
    setCustomPresets(updated);
    if (currentPresetId === presetId) {
      setCurrentPresetId(ARCHITECTURE_PRESETS[0].id);
    }
  };

  // Keyboard shortcut: Ctrl + S / Cmd + S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPresetId, nodes, edges, simState.targetRps]);

  // Initialize Engine on preset change (loads from saved storage if available)
  useEffect(() => {
    const activePreset = allPresets.find(p => p.id === currentPresetId) || ARCHITECTURE_PRESETS[0];
    const saved = loadTopology(currentPresetId);
    const initialNodes = saved ? saved.nodes : activePreset.nodes;
    const initialEdges = saved ? saved.edges : activePreset.edges;

    const engine = new SimulationEngine(initialNodes, initialEdges);
    if (saved?.targetRps) {
      engine.setTargetRps(saved.targetRps);
    }
    engineRef.current = engine;
    setNodes(engine.getNodes());
    setEdges(engine.getEdges());
    setPackets([]);
    setSelectedNodeId(null);
    setInspectingNodeId(null);
    setSelectedEdgeId(null);
    setHasCustomChanges(hasCustomSavedTopology(currentPresetId));
    setSaveStatus('saved');
  }, [currentPresetId]);

  // Main high-frequency loop for smooth simulation updates
  useEffect(() => {
    let animId: number;

    const loop = (time: number) => {
      if (engineRef.current) {
        engineRef.current.tick(time);
        setNodes([...engineRef.current.getNodes()]);
        setPackets([...engineRef.current.getPackets()]);
        setSimState({ ...engineRef.current.getState() });
        setAuditLogs([...engineRef.current.getAuditLogs()]);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Preset switch
  const handleSelectPreset = (presetId: string) => {
    setCurrentPresetId(presetId);
  };

  // Node position update via drag & drop
  const handleUpdateNodePosition = (nodeId: string, x: number, y: number) => {
    if (engineRef.current) {
      engineRef.current.updateNodeConfig(nodeId, node => {
        node.x = x;
        node.y = y;
      });
      const updatedNodes = [...engineRef.current.getNodes()];
      setNodes(updatedNodes);
      triggerAutoSave(updatedNodes, edges);
    }
  };

  // Connect Two Nodes (Create Edge)
  const handleCreateEdge = (fromNodeId: string, toNodeId: string) => {
    if (engineRef.current) {
      const fromNode = nodes.find(n => n.id === fromNodeId);
      const toNode = nodes.find(n => n.id === toNodeId);
      if (!fromNode || !toNode) return;

      let protocol: EdgeData['protocol'] = 'HTTP/2';
      if (toNode.type === 'database') protocol = 'TCP/SQL';
      if (toNode.type === 'cache') protocol = 'Redis';
      if (toNode.type === 'queue') protocol = 'Kafka';
      if (toNode.type === 'service' && fromNode.type === 'gateway') protocol = 'gRPC';

      const newEdge: EdgeData = {
        id: `edge-${Date.now()}`,
        from: fromNodeId,
        to: toNodeId,
        protocol,
        baseLatencyMs: 12,
        bandwidthLimitRps: 3000,
        routingProbability: 1.0,
        status: 'active',
        label: `${protocol} Link`,
      };

      engineRef.current.addEdge(newEdge);
      const updatedEdges = [...engineRef.current.getEdges()];
      setEdges(updatedEdges);
      triggerAutoSave(nodes, updatedEdges);
    }
  };

  // Delete Selected Node or Edge
  const handleDeleteSelected = () => {
    if (engineRef.current) {
      if (selectedNodeId) {
        engineRef.current.removeNode(selectedNodeId);
        const updatedNodes = [...engineRef.current.getNodes()];
        const updatedEdges = [...engineRef.current.getEdges()];
        setNodes(updatedNodes);
        setEdges(updatedEdges);
        setSelectedNodeId(null);
        triggerAutoSave(updatedNodes, updatedEdges);
      } else if (selectedEdgeId) {
        engineRef.current.removeEdge(selectedEdgeId);
        const updatedEdges = [...engineRef.current.getEdges()];
        setEdges(updatedEdges);
        setSelectedEdgeId(null);
        triggerAutoSave(nodes, updatedEdges);
      }
    }
  };

  // Delete specific node
  const handleDeleteNode = (nodeId: string) => {
    if (engineRef.current) {
      engineRef.current.removeNode(nodeId);
      const updatedNodes = [...engineRef.current.getNodes()];
      const updatedEdges = [...engineRef.current.getEdges()];
      setNodes(updatedNodes);
      setEdges(updatedEdges);
      setSelectedNodeId(null);
      triggerAutoSave(updatedNodes, updatedEdges);
    }
  };

  // Delete specific edge
  const handleDeleteEdge = (edgeId: string) => {
    if (engineRef.current) {
      engineRef.current.removeEdge(edgeId);
      const updatedEdges = [...engineRef.current.getEdges()];
      setEdges(updatedEdges);
      setSelectedEdgeId(null);
      triggerAutoSave(nodes, updatedEdges);
    }
  };

  // Duplicate node
  const handleDuplicateNode = (nodeId: string) => {
    if (engineRef.current) {
      const cloned = engineRef.current.duplicateNode(nodeId);
      if (cloned) {
        const updatedNodes = [...engineRef.current.getNodes()];
        setNodes(updatedNodes);
        setSelectedNodeId(cloned.id);
        triggerAutoSave(updatedNodes, edges);
      }
    }
  };

  // Update node replicas manually
  const handleUpdateNodeReplicas = (nodeId: string, delta: number) => {
    if (engineRef.current) {
      engineRef.current.updateNodeConfig(nodeId, node => {
        const cur = node.metrics.currentReplicas || 1;
        node.metrics.currentReplicas = Math.max(1, Math.min(32, cur + delta));
      });
      const updatedNodes = [...engineRef.current.getNodes()];
      setNodes(updatedNodes);
      triggerAutoSave(updatedNodes, edges);
    }
  };

  // Clear entire mesh
  const handleClearAll = () => {
    if (engineRef.current) {
      engineRef.current.setNodesAndEdges([], []);
      setNodes([]);
      setEdges([]);
      setPackets([]);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      triggerAutoSave([], []);
    }
  };

  // Node property update
  const handleUpdateNode = (nodeId: string, updater: (node: NodeData) => void) => {
    if (engineRef.current) {
      engineRef.current.updateNodeConfig(nodeId, updater);
      const updatedNodes = [...engineRef.current.getNodes()];
      setNodes(updatedNodes);
      triggerAutoSave(updatedNodes, edges);
    }
  };

  // Simulation Controls
  const handleTogglePlay = () => {
    if (engineRef.current) {
      engineRef.current.setRunning(!simState.isRunning);
    }
  };

  const handleSpeedChange = (speed: number) => {
    if (engineRef.current) {
      engineRef.current.setSpeed(speed);
    }
  };

  const handleRpsChange = (rps: number) => {
    if (engineRef.current) {
      engineRef.current.setTargetRps(rps);
      triggerAutoSave(nodes, edges, rps);
    }
  };

  const handlePatternChange = (pattern: SimulationState['trafficPattern']) => {
    if (engineRef.current) {
      engineRef.current.setTrafficPattern(pattern);
    }
  };

  const handleToggleChaosMonkey = () => {
    if (engineRef.current) {
      engineRef.current.toggleChaosMonkey(!simState.chaosMonkeyActive);
    }
  };

  const handleTriggerSpike = () => {
    if (engineRef.current) {
      engineRef.current.triggerGlobalSpike();
    }
  };

  const handleResetChaos = () => {
    if (engineRef.current) {
      engineRef.current.resetAllChaos();
    }
  };

  // Fault Injection Handlers
  const handleKillNode = (nodeId: string) => {
    if (engineRef.current) {
      engineRef.current.killNode(nodeId);
    }
  };

  const handleLatencyChange = (nodeId: string, latencyMs: number) => {
    if (engineRef.current) {
      engineRef.current.injectNodeLatency(nodeId, latencyMs);
    }
  };

  const handleErrorRateChange = (nodeId: string, rate: number) => {
    if (engineRef.current) {
      engineRef.current.updateNodeConfig(nodeId, n => {
        n.chaos.errorInjectionRate = rate;
      });
    }
  };

  const handleCircuitBreakerToggle = (nodeId: string, enabled: boolean) => {
    if (engineRef.current) {
      engineRef.current.updateNodeConfig(nodeId, n => {
        n.circuitBreaker.enabled = enabled;
        if (!enabled) {
          n.circuitBreaker.state = 'CLOSED';
          n.circuitBreaker.consecutiveFailures = 0;
        }
      });
    }
  };

  const handleRateLimiterToggle = (nodeId: string, enabled: boolean) => {
    if (engineRef.current) {
      engineRef.current.updateNodeConfig(nodeId, n => {
        n.rateLimiter.enabled = enabled;
      });
    }
  };

  // Open Add Node Modal with optional preset type
  const handleOpenAddNode = (presetType?: NodeType) => {
    setAddNodeInitialType(presetType);
    setIsAddNodeOpen(true);
  };

  // Add Custom Node
  const handleAddNode = (newNode: NodeData) => {
    if (engineRef.current) {
      engineRef.current.addNode(newNode);
      const updatedNodes = [...engineRef.current.getNodes()];
      setNodes(updatedNodes);
      setSelectedNodeId(newNode.id);
      triggerAutoSave(updatedNodes, edges);
    }
  };

  const inspectingNode = nodes.find(n => n.id === inspectingNodeId) || null;

  return (
    <div className="livingspec-app">
      {/* Top Header Navigation */}
      <TopNav
        presets={ARCHITECTURE_PRESETS}
        customPresets={customPresets}
        currentPresetId={currentPresetId}
        onSelectPreset={handleSelectPreset}
        simState={simState}
        onTogglePlay={handleTogglePlay}
        onSpeedChange={handleSpeedChange}
        onRpsChange={handleRpsChange}
        onPatternChange={handlePatternChange}
        onToggleChaosMonkey={handleToggleChaosMonkey}
        onTriggerSpike={handleTriggerSpike}
        onResetChaos={handleResetChaos}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenAddNode={() => handleOpenAddNode()}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        onToggleAuditLog={() => setIsAuditOpen(!isAuditOpen)}
        auditCount={auditLogs.length}
        saveStatus={saveStatus}
        hasCustomChanges={hasCustomChanges}
        onManualSave={handleManualSave}
        onResetPresetToDefault={handleResetPresetToDefault}
        onOpenTopologyManager={() => setIsTopologyManagerOpen(true)}
      />

      {/* Main Interactive Workspace */}
      <main className="main-viewport">
        {/* Floating Telemetry HUD */}
        <TelemetryHud simState={simState} nodesCount={nodes.length} />

        {/* 60 FPS HTML5 Canvas */}
        <ArchitectureCanvas
          nodes={nodes}
          edges={edges}
          packets={packets}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onSelectNode={setSelectedNodeId}
          onSelectEdge={setSelectedEdgeId}
          onUpdateNodePosition={handleUpdateNodePosition}
          onCreateEdge={handleCreateEdge}
          onDeleteSelected={handleDeleteSelected}
          onOpenAddNode={handleOpenAddNode}
          onKillToggle={handleKillNode}
          onDuplicateNode={handleDuplicateNode}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
          onUpdateNodeReplicas={handleUpdateNodeReplicas}
          onClearAll={handleClearAll}
          onOpenNodeInspector={(id) => {
            setSelectedNodeId(id);
            setInspectingNodeId(id);
          }}
        />

        {/* Node Specification & Runbook Drawer (Opens on Double Click or Right-Click Inspect) */}
        <NodeInspectorDrawer
          node={inspectingNode}
          onClose={() => setInspectingNodeId(null)}
          onUpdateNode={handleUpdateNode}
          onKillToggle={handleKillNode}
          onLatencyChange={handleLatencyChange}
          onErrorRateChange={handleErrorRateChange}
          onCircuitBreakerToggle={handleCircuitBreakerToggle}
          onRateLimiterToggle={handleRateLimiterToggle}
          onDeleteNode={handleDeleteNode}
        />

        {/* Terminal Audit Log Drawer */}
        <AuditLogDrawer
          isOpen={isAuditOpen}
          onClose={() => setIsAuditOpen(false)}
          logs={auditLogs}
        />
      </main>

      {/* Modals */}
      {isExportOpen && (
        <ExportModal
          nodes={nodes}
          edges={edges}
          presetName={currentPreset.name}
          onClose={() => setIsExportOpen(false)}
        />
      )}

      <AddNodeModal
        isOpen={isAddNodeOpen}
        initialType={addNodeInitialType}
        onClose={() => { setIsAddNodeOpen(false); setAddNodeInitialType(undefined); }}
        onAddNode={handleAddNode}
        existingNodes={nodes}
      />

      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        nodes={nodes}
        edges={edges}
        simState={simState}
        onClose={() => setIsBenchmarkOpen(false)}
      />

      <CustomTopologyModal
        isOpen={isTopologyManagerOpen}
        currentNodes={nodes}
        currentEdges={edges}
        customPresets={customPresets}
        currentPresetId={currentPresetId}
        onSaveNewTopology={handleSaveNewCustomTopology}
        onUpdateTopology={handleUpdateCustomTopology}
        onDeleteTopology={handleDeleteCustomTopology}
        onSelectTopology={handleSelectPreset}
        onClose={() => setIsTopologyManagerOpen(false)}
      />

      {/* Initial System Boot & Imagotipo Loader */}
      <AppLoader />

      {/* Floating GitHub Repository Link */}
      <a
        href="https://github.com/Girouetten21/ResiliGraph"
        target="_blank"
        rel="noopener noreferrer"
        className="github-floating-link"
        title="View ResiliGraph on GitHub (@Girouetten21)"
        aria-label="GitHub Repository"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
      </a>
    </div>
  );
};

export default App;
