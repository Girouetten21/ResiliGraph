import type { NodeData, EdgeData, ArchitecturePreset } from '../types';

const STORAGE_PREFIX = 'resiligraph_v1_';
const CUSTOM_PRESETS_KEY = `${STORAGE_PREFIX}custom_presets_list`;

export interface SavedTopology {
  presetId: string;
  savedAt: string;
  nodes: NodeData[];
  edges: EdgeData[];
  targetRps?: number;
}

/**
 * Save architecture nodes and edges to localStorage
 */
export function saveTopology(presetId: string, nodes: NodeData[], edges: EdgeData[], targetRps?: number): void {
  try {
    const payload: SavedTopology = {
      presetId,
      savedAt: new Date().toISOString(),
      nodes,
      edges,
      targetRps,
    };
    localStorage.setItem(`${STORAGE_PREFIX}topology_${presetId}`, JSON.stringify(payload));
    localStorage.setItem(`${STORAGE_PREFIX}last_active_preset`, presetId);
  } catch (err) {
    console.error('Failed to save topology to localStorage:', err);
  }
}

/**
 * Load saved architecture nodes and edges from localStorage
 */
export function loadTopology(presetId: string): SavedTopology | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}topology_${presetId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedTopology;
    if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to parse topology from localStorage:', err);
  }
  return null;
}

/**
 * Get last active preset ID
 */
export function getLastActivePresetId(): string | null {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}last_active_preset`);
  } catch {
    return null;
  }
}

/**
 * Reset and clear saved state for a specific preset
 */
export function clearSavedTopology(presetId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}topology_${presetId}`);
  } catch (err) {
    console.error('Failed to clear saved topology:', err);
  }
}

/**
 * Check if a preset has user-customized saved state
 */
export function hasCustomSavedTopology(presetId: string): boolean {
  try {
    return !!localStorage.getItem(`${STORAGE_PREFIX}topology_${presetId}`);
  } catch {
    return false;
  }
}

/**
 * Get list of user created custom architecture presets
 */
export function getCustomPresets(): ArchitecturePreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load custom presets:', err);
    return [];
  }
}

/**
 * Save or update a custom architecture preset
 */
export function saveCustomPreset(preset: ArchitecturePreset): void {
  try {
    const list = getCustomPresets();
    const existingIdx = list.findIndex(p => p.id === preset.id);
    if (existingIdx >= 0) {
      list[existingIdx] = preset;
    } else {
      list.push(preset);
    }
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(list));
    // Also save its nodes and edges in the topology cache
    saveTopology(preset.id, preset.nodes, preset.edges);
  } catch (err) {
    console.error('Failed to save custom preset:', err);
  }
}

/**
 * Delete a custom architecture preset
 */
export function deleteCustomPreset(presetId: string): void {
  try {
    const list = getCustomPresets().filter(p => p.id !== presetId);
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(list));
    clearSavedTopology(presetId);
  } catch (err) {
    console.error('Failed to delete custom preset:', err);
  }
}

