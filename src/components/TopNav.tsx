import React from 'react';
import { Play, Pause, Zap, Flame, ShieldCheck, Download, Plus, Terminal, Award, Save, RotateCcw, Check, FolderHeart } from 'lucide-react';
import { ResiliLogo } from './ResiliLogo';
import type { SimulationState, ArchitecturePreset } from '../types';

interface TopNavProps {
  presets: ArchitecturePreset[];
  customPresets?: ArchitecturePreset[];
  currentPresetId: string;
  onSelectPreset: (presetId: string) => void;
  simState: SimulationState;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
  onRpsChange: (rps: number) => void;
  onPatternChange: (pattern: SimulationState['trafficPattern']) => void;
  onToggleChaosMonkey: () => void;
  onTriggerSpike: () => void;
  onResetChaos: () => void;
  onOpenExport: () => void;
  onOpenAddNode: () => void;
  onOpenBenchmark: () => void;
  onToggleAuditLog: () => void;
  auditCount: number;
  saveStatus: 'saved' | 'saving';
  hasCustomChanges: boolean;
  onManualSave: () => void;
  onResetPresetToDefault: () => void;
  onOpenTopologyManager?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  presets,
  customPresets = [],
  currentPresetId,
  onSelectPreset,
  simState,
  onTogglePlay,
  onSpeedChange,
  onRpsChange,
  onPatternChange,
  onToggleChaosMonkey,
  onTriggerSpike,
  onResetChaos,
  onOpenExport,
  onOpenAddNode,
  onOpenBenchmark,
  onToggleAuditLog,
  auditCount,
  saveStatus,
  hasCustomChanges,
  onManualSave,
  onResetPresetToDefault,
  onOpenTopologyManager,
}) => {
  return (
    <header className="top-nav">
      {/* 1. Brand Logo & Title */}
      <div className="nav-brand-section">
        <ResiliLogo size={26} withGlow={true} className="nav-brand-logo" />
        <div className="brand-text-container">
          <h1 className="brand-title">ResiliGraph</h1>
        </div>
      </div>

      {/* 2. Topology Preset Selector & Manager */}
      <div className="nav-preset-section">
        <select
          id="preset-selector"
          className="preset-select"
          value={currentPresetId}
          onChange={(e) => onSelectPreset(e.target.value)}
          title="Select Architecture Topology Preset"
        >
          <optgroup label="System Presets">
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name} ({preset.badge})
              </option>
            ))}
          </optgroup>
          {customPresets.length > 0 && (
            <optgroup label="My Custom Topologies">
              {customPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  ⭐ {preset.name} ({preset.badge})
                </option>
              ))}
            </optgroup>
          )}
        </select>

        {onOpenTopologyManager && (
          <button
            className="nav-btn btn-secondary topology-manage-btn"
            onClick={onOpenTopologyManager}
            title="Create, save or manage your custom topologies"
          >
            <FolderHeart size={13} className="text-cyan" />
            <span className="btn-label">Topologies</span>
          </button>
        )}

        {hasCustomChanges && (
          <button
            className="nav-btn icon-only-btn reset-preset-btn"
            onClick={onResetPresetToDefault}
            title="Reset this topology to default factory template"
          >
            <RotateCcw size={13} />
          </button>
        )}
      </div>

      {/* 3. Real-Time Simulation Controls */}
      <div className="nav-sim-controls">
        <button
          id="sim-play-pause-btn"
          className={`nav-btn ${simState.isRunning ? 'btn-active' : 'btn-primary'}`}
          onClick={onTogglePlay}
          title={simState.isRunning ? 'Pause simulation engine' : 'Run simulation engine'}
        >
          {simState.isRunning ? <Pause size={14} /> : <Play size={14} />}
          <span className="btn-label">{simState.isRunning ? 'Running' : 'Paused'}</span>
        </button>

        <div className="speed-selector">
          {[0.5, 1, 2, 5].map((speed) => (
            <button
              key={speed}
              className={`speed-chip ${simState.speedMultiplier === speed ? 'speed-active' : ''}`}
              onClick={() => onSpeedChange(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>

        <div className="traffic-slider-group">
          <span className="traffic-val">{simState.targetRps.toLocaleString()} RPS</span>
          <input
            id="traffic-rps-slider"
            type="range"
            min="200"
            max="12000"
            step="200"
            value={simState.targetRps}
            onChange={(e) => onRpsChange(Number(e.target.value))}
            className="styled-slider"
            title="Adjust Master Traffic Scale"
          />
        </div>

        <select
          id="traffic-pattern-selector"
          className="pattern-select"
          value={simState.trafficPattern}
          onChange={(e) => onPatternChange(e.target.value as SimulationState['trafficPattern'])}
          title="Traffic Waveform Pattern"
        >
          <option value="steady">Steady</option>
          <option value="wave">Wave</option>
          <option value="chaos">Chaos Jitter</option>
        </select>
      </div>

      {/* 4. Chaos Fault Injection Drills */}
      <div className="nav-chaos-section">
        <button
          id="chaos-monkey-btn"
          className={`nav-btn chaos-btn ${simState.chaosMonkeyActive ? 'chaos-btn-active' : ''}`}
          onClick={onToggleChaosMonkey}
          title="Chaos Monkey randomly disrupts components"
        >
          <Flame size={14} />
          <span className="btn-label">Chaos Monkey</span>
        </button>

        <button
          id="surge-spike-btn"
          className="nav-btn warning-btn"
          onClick={onTriggerSpike}
          title="Simulate 10x traffic spike"
        >
          <Zap size={14} />
          <span className="btn-label">Spike 10x</span>
        </button>

        <button
          id="reset-chaos-btn"
          className="nav-btn heal-btn"
          onClick={onResetChaos}
          title="Restore all services and clear faults"
        >
          <ShieldCheck size={14} />
          <span className="btn-label">Heal Mesh</span>
        </button>
      </div>

      {/* 5. Actions, Export & Audit */}
      <div className="nav-action-section">
        <button
          id="save-topology-btn"
          className={`nav-btn save-btn ${saveStatus === 'saved' ? 'save-btn-saved' : 'save-btn-saving'}`}
          onClick={onManualSave}
          title="Auto-saved to localStorage (Ctrl+S to save immediately)"
        >
          {saveStatus === 'saved' ? <Check size={14} className="text-emerald" /> : <Save size={14} />}
          <span className="btn-label">{saveStatus === 'saved' ? 'Saved' : 'Saving...'}</span>
        </button>

        <button
          id="benchmark-btn"
          className="nav-btn benchmark-btn"
          onClick={onOpenBenchmark}
          title="Run automated reliability scorecard & chaos stress audit"
        >
          <Award size={14} />
          <span className="btn-label">Benchmark</span>
        </button>

        <button
          id="add-node-btn"
          className="nav-btn action-btn"
          onClick={onOpenAddNode}
          title="Add new architecture component"
        >
          <Plus size={14} />
          <span className="btn-label">Add Node</span>
        </button>

        <button
          id="export-iac-btn"
          className="nav-btn action-btn"
          onClick={onOpenExport}
          title="Export Docker Compose, Terraform & Living Docs"
        >
          <Download size={14} />
          <span className="btn-label">Export IaC</span>
        </button>

        <button
          id="audit-log-btn"
          className="nav-btn action-btn terminal-btn"
          onClick={onToggleAuditLog}
          title="View live telemetry audit stream"
        >
          <Terminal size={14} />
          <span className="btn-label">Audit</span>
          {auditCount > 0 && <span className="counter-pill">{auditCount}</span>}
        </button>
      </div>
    </header>
  );
};
