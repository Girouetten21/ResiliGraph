import React, { useState } from 'react';
import { X, Layers, Plus, Trash2, Edit3, Check, Sparkles, FolderHeart } from 'lucide-react';
import type { ArchitecturePreset, NodeData, EdgeData } from '../types';

interface CustomTopologyModalProps {
  isOpen: boolean;
  currentNodes: NodeData[];
  currentEdges: EdgeData[];
  customPresets: ArchitecturePreset[];
  currentPresetId: string;
  onSaveNewTopology: (name: string, description: string, badge: string) => void;
  onUpdateTopology: (preset: ArchitecturePreset) => void;
  onDeleteTopology: (presetId: string) => void;
  onSelectTopology: (presetId: string) => void;
  onClose: () => void;
}

export const CustomTopologyModal: React.FC<CustomTopologyModalProps> = ({
  isOpen,
  currentNodes,
  currentEdges,
  customPresets,
  currentPresetId,
  onSaveNewTopology,
  onUpdateTopology,
  onDeleteTopology,
  onSelectTopology,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'save_current' | 'manage'>('save_current');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [badge, setBadge] = useState<string>('Custom Topology');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSaveNewTopology(name.trim(), description.trim() || 'Custom user created architecture topology.', badge.trim() || 'Custom');
    setName('');
    setDescription('');
    onClose();
  };

  const handleStartEdit = (preset: ArchitecturePreset) => {
    setEditingId(preset.id);
    setDeletingId(null);
    setEditName(preset.name);
    setEditDesc(preset.description);
  };

  const handleSaveEdit = (preset: ArchitecturePreset) => {
    if (!editName.trim()) return;
    onUpdateTopology({
      ...preset,
      name: editName.trim(),
      description: editDesc.trim(),
    });
    setEditingId(null);
  };

  const handleConfirmDelete = (presetId: string) => {
    onDeleteTopology(presetId);
    setDeletingId(null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container modal-topology-manager" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <FolderHeart className="text-cyan" size={22} />
            <div>
              <h2 className="modal-title">Custom Topologies Manager</h2>
              <span className="modal-subtitle">Create, rename, customize, and switch between your personal system architectures</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="topology-tabs">
          <button
            className={`topology-tab ${activeTab === 'save_current' ? 'active' : ''}`}
            onClick={() => setActiveTab('save_current')}
          >
            <Plus size={15} />
            <span>Save Current Canvas As New</span>
          </button>
          <button
            className={`topology-tab ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage')}
          >
            <Layers size={15} />
            <span>My Topologies ({customPresets.length})</span>
          </button>
        </div>

        <div className="modal-body-padded">
          {activeTab === 'save_current' ? (
            <form onSubmit={handleSave} className="topology-form">
              <div className="topology-hero-info">
                <Sparkles size={20} className="text-cyan" />
                <div>
                  <strong>Snapshot Current Canvas</strong>
                  <p>
                    Saving your current architecture with <strong>{currentNodes.length} nodes</strong> and{' '}
                    <strong>{currentEdges.length} connections</strong> as a new reusable topology template.
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="topology-name-input">
                  Topology Name *
                </label>
                <input
                  id="topology-name-input"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Multi-Region Payment Mesh v2"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label className="form-label" htmlFor="topology-badge-input">
                    Badge / Tag
                  </label>
                  <input
                    id="topology-badge-input"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Staging, Production, Chaos Drill"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="topology-desc-input">
                  Description & Context
                </label>
                <textarea
                  id="topology-desc-input"
                  className="form-textarea"
                  rows={3}
                  placeholder="Explain the purpose of this architecture, failover mechanisms, or target SLOs..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="topology-form-actions">
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={!name.trim()}>
                  <Plus size={16} />
                  Save New Topology
                </button>
              </div>
            </form>
          ) : (
            <div className="custom-topologies-list">
              {customPresets.length === 0 ? (
                <div className="empty-topologies-state">
                  <Layers size={36} className="text-muted" />
                  <h4>No Custom Topologies Saved Yet</h4>
                  <p>Use the "Save Current Canvas As New" tab to create and save your personalized architectures.</p>
                </div>
              ) : (
                <div className="topologies-grid">
                  {customPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className={`custom-preset-card ${currentPresetId === preset.id ? 'active-preset' : ''}`}
                    >
                      {deletingId === preset.id ? (
                        <div className="preset-delete-confirm">
                          <p className="delete-confirm-text">
                            Are you sure you want to delete <strong>"{preset.name}"</strong>?
                          </p>
                          <div className="preset-edit-actions">
                            <button
                              type="button"
                              className="btn-danger-confirm"
                              onClick={() => handleConfirmDelete(preset.id)}
                            >
                              <Trash2 size={13} /> Yes, Delete
                            </button>
                            <button
                              type="button"
                              className="btn-icon-cancel"
                              onClick={() => setDeletingId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : editingId === preset.id ? (
                        <div className="preset-edit-mode">
                          <input
                            type="text"
                            className="form-input"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Topology Name"
                          />
                          <input
                            type="text"
                            className="form-input"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            placeholder="Description"
                          />
                          <div className="preset-edit-actions">
                            <button
                              type="button"
                              className="btn-icon-save"
                              onClick={() => handleSaveEdit(preset)}
                              title="Save changes"
                            >
                              <Check size={14} /> Save
                            </button>
                            <button
                              type="button"
                              className="btn-icon-cancel"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="custom-preset-header">
                            <div className="custom-preset-title-wrap">
                              <h4 className="custom-preset-title">{preset.name}</h4>
                              <span className="preset-badge-tag">{preset.badge}</span>
                            </div>
                            <div className="preset-actions-row">
                              <button
                                className="icon-btn-subtle"
                                onClick={() => handleStartEdit(preset)}
                                title="Rename & edit info"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                className="icon-btn-subtle text-crimson"
                                onClick={() => setDeletingId(preset.id)}
                                title="Delete this custom topology"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <p className="custom-preset-desc">{preset.description}</p>

                          <div className="custom-preset-footer">
                            <span className="preset-nodes-count">
                              {preset.nodes.length} Nodes · {preset.edges.length} Links
                            </span>
                            <button
                              className={`btn-load-topology ${currentPresetId === preset.id ? 'btn-current' : ''}`}
                              onClick={() => {
                                onSelectTopology(preset.id);
                                onClose();
                              }}
                            >
                              {currentPresetId === preset.id ? 'Currently Active' : 'Load Topology'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
