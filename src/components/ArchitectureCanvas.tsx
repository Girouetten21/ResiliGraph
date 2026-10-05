import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { NodeData, EdgeData, Packet, NodeType } from '../types';

export const FIXED_NODE_WIDTH = 210;
export const FIXED_NODE_HEIGHT = 105;

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  targetType: 'canvas' | 'node' | 'edge';
  targetId?: string;
}

interface ArchitectureCanvasProps {
  nodes: NodeData[];
  edges: EdgeData[];
  packets: Packet[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onSelectEdge: (edgeId: string | null) => void;
  onUpdateNodePosition: (nodeId: string, x: number, y: number) => void;
  onCreateEdge: (fromNodeId: string, toNodeId: string) => void;
  onDeleteSelected: () => void;
  onOpenAddNode: (presetType?: NodeType) => void;
  onKillToggle: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onUpdateNodeReplicas: (nodeId: string, delta: number) => void;
  onClearAll: () => void;
  onOpenNodeInspector?: (nodeId: string) => void;
}

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = ({
  nodes,
  edges,
  packets,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onUpdateNodePosition,
  onCreateEdge,
  onDeleteSelected,
  onOpenAddNode,
  onKillToggle,
  onDuplicateNode,
  onDeleteNode,
  onDeleteEdge,
  onUpdateNodeReplicas,
  onClearAll,
  onOpenNodeInspector,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 60, y: 60 });
  const [zoom, setZoom] = useState<number>(1);
  const [isDraggingNode, setIsDraggingNode] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [nodeOffset, setNodeOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Custom Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    worldX: 0,
    worldY: 0,
    targetType: 'canvas',
  });

  // Connecting wire state
  const [connectingFromNodeId, setConnectingFromNodeId] = useState<string | null>(null);
  const [connectingMousePos, setConnectingMousePos] = useState<{ x: number; y: number } | null>(null);

  // Resize canvas
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close context menu on click elsewhere
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.isOpen) {
        setContextMenu(prev => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu.isOpen]);

  // Keyboard shortcut for deleting nodes/edges
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedNodeId || selectedEdgeId)) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;
        onDeleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, onDeleteSelected]);

  // Compute bezier curve points between nodes
  const getEdgeEndpoints = useCallback((edge: EdgeData, currentNodes: NodeData[]) => {
    const fromNode = currentNodes.find(n => n.id === edge.from);
    const toNode = currentNodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return null;

    const fromW = FIXED_NODE_WIDTH;
    const fromH = FIXED_NODE_HEIGHT;
    const toH = FIXED_NODE_HEIGHT;

    const startX = fromNode.x + fromW;
    const startY = fromNode.y + fromH / 2;
    const endX = toNode.x;
    const endY = toNode.y + toH / 2;

    const dx = Math.abs(endX - startX) * 0.55;
    const cp1x = startX + dx;
    const cp1y = startY;
    const cp2x = endX - dx;
    const cp2y = endY;

    return { startX, startY, endX, endY, cp1x, cp1y, cp2x, cp2y };
  }, []);

  // 60fps render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // 1. Tech Background Grid
      ctx.save();
      ctx.fillStyle = '#06090e';
      ctx.fillRect(0, 0, width, height);

      const gridSize = 32 * zoom;
      const startX = (pan.x % gridSize) - gridSize;
      const startY = (pan.y % gridSize) - gridSize;

      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      for (let x = startX; x < width + gridSize; x += gridSize) {
        for (let y = startY; y < height + gridSize; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2 * Math.min(1.5, Math.max(0.6, zoom)), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      // Transform context for World coordinates
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // 2. Render Edges (Connections)
      edges.forEach(edge => {
        const pts = getEdgeEndpoints(edge, nodes);
        if (!pts) return;

        const isEdgeSelected = edge.id === selectedEdgeId;

        // Path
        ctx.beginPath();
        ctx.moveTo(pts.startX, pts.startY);
        ctx.bezierCurveTo(pts.cp1x, pts.cp1y, pts.cp2x, pts.cp2y, pts.endX, pts.endY);

        let strokeColor = isEdgeSelected ? '#00f0ff' : 'rgba(56, 189, 248, 0.35)';
        if (edge.status === 'congested') strokeColor = '#f59e0b';
        if (edge.status === 'broken') strokeColor = '#ef4444';

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isEdgeSelected ? 3.5 : 2.2;
        ctx.setLineDash(edge.status === 'broken' ? [6, 6] : []);
        ctx.stroke();
        ctx.setLineDash([]);

        // Protocol badge pill on midpoint
        const midT = 0.5;
        const midX = Math.pow(1 - midT, 3) * pts.startX +
          3 * Math.pow(1 - midT, 2) * midT * pts.cp1x +
          3 * (1 - midT) * Math.pow(midT, 2) * pts.cp2x +
          Math.pow(midT, 3) * pts.endX;
        const midY = Math.pow(1 - midT, 3) * pts.startY +
          3 * Math.pow(1 - midT, 2) * midT * pts.cp1y +
          3 * (1 - midT) * Math.pow(midT, 2) * pts.cp2y +
          Math.pow(midT, 3) * pts.endY;

        ctx.fillStyle = isEdgeSelected ? 'rgba(0, 240, 255, 0.2)' : 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = isEdgeSelected ? '#00f0ff' : 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 1;
        const badgeW = 66;
        const badgeH = 18;
        ctx.beginPath();
        ctx.roundRect(midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH, 9);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isEdgeSelected ? '#00f0ff' : '#94a3b8';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(edge.protocol, midX, midY);
      });

      // 3. Render In-Progress Wire (Connecting from Port to Mouse)
      if (connectingFromNodeId && connectingMousePos) {
        const fromNode = nodes.find(n => n.id === connectingFromNodeId);
        if (fromNode) {
          const startX = fromNode.x + FIXED_NODE_WIDTH;
          const startY = fromNode.y + FIXED_NODE_HEIGHT / 2;
          const endX = connectingMousePos.x;
          const endY = connectingMousePos.y;

          const dx = Math.abs(endX - startX) * 0.55;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.bezierCurveTo(startX + dx, startY, endX - dx, endY, endX, endY);
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // 4. Render Packets (Moving glowing particles)
      packets.forEach(packet => {
        const edge = edges.find(e => e.id === packet.edgeId);
        if (!edge) return;
        const pts = getEdgeEndpoints(edge, nodes);
        if (!pts) return;

        const t = Math.max(0, Math.min(1, packet.progress));
        const px = Math.pow(1 - t, 3) * pts.startX +
          3 * Math.pow(1 - t, 2) * t * pts.cp1x +
          3 * (1 - t) * Math.pow(t, 2) * pts.cp2x +
          Math.pow(t, 3) * pts.endX;
        const py = Math.pow(1 - t, 3) * pts.startY +
          3 * Math.pow(1 - t, 2) * t * pts.cp1y +
          3 * (1 - t) * Math.pow(t, 2) * pts.cp2y +
          Math.pow(t, 3) * pts.endY;

        let glowColor = '#00f0ff';
        let coreColor = '#ffffff';
        if (packet.status === 'error') {
          glowColor = '#ff0055';
          coreColor = '#ffb3c6';
        } else if (packet.status === 'throttled') {
          glowColor = '#ffaa00';
          coreColor = '#fff2cc';
        }

        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 12;
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 5. Render Architecture Nodes (Fixed Size 210 x 105)
      nodes.forEach(node => {
        const isSelected = node.id === selectedNodeId;
        const isDead = node.chaos.isKilled;
        const isCircuitOpen = node.circuitBreaker.enabled && node.circuitBreaker.state === 'OPEN';
        const replicas = node.metrics.currentReplicas || 1;
        const nodeW = FIXED_NODE_WIDTH;
        const nodeH = FIXED_NODE_HEIGHT;

        // Selection glow & rounded concentric outline
        if (isSelected) {
          ctx.save();
          ctx.shadowColor = 'rgba(0, 240, 255, 0.85)';
          ctx.shadowBlur = 16;
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.roundRect(node.x - 3, node.y - 3, nodeW + 6, nodeH + 6, 13);
          ctx.stroke();
          ctx.restore();
        } else if (isCircuitOpen) {
          ctx.save();
          ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
          ctx.shadowBlur = 14;
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(node.x - 2, node.y - 2, nodeW + 4, nodeH + 4, 12);
          ctx.stroke();
          ctx.restore();
        }

        // Node card background
        ctx.save();
        const cardBg = ctx.createLinearGradient(node.x, node.y, node.x, node.y + nodeH);
        if (isDead) {
          cardBg.addColorStop(0, '#2a0e14');
          cardBg.addColorStop(1, '#18070a');
        } else if (isCircuitOpen) {
          cardBg.addColorStop(0, '#241a0d');
          cardBg.addColorStop(1, '#151009');
        } else {
          cardBg.addColorStop(0, '#111827');
          cardBg.addColorStop(1, '#0b0f19');
        }

        ctx.fillStyle = cardBg;
        ctx.beginPath();
        ctx.roundRect(node.x, node.y, nodeW, nodeH, 10);
        ctx.fill();

        // Border
        let borderColor = 'rgba(255, 255, 255, 0.12)';
        if (isDead) borderColor = 'rgba(239, 68, 68, 0.8)';
        else if (isCircuitOpen) borderColor = 'rgba(245, 158, 11, 0.8)';
        else if (node.status === 'degraded') borderColor = 'rgba(245, 158, 11, 0.5)';
        else if (isSelected) borderColor = 'rgba(0, 240, 255, 0.9)';

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Status Pulse Pill / Dot
        let statusDotColor = '#10b981';
        if (isDead) statusDotColor = '#ef4444';
        else if (isCircuitOpen || node.status === 'throttled') statusDotColor = '#f59e0b';
        else if (node.status === 'degraded') statusDotColor = '#eab308';

        ctx.save();
        ctx.fillStyle = statusDotColor;
        ctx.shadowColor = statusDotColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(node.x + 16, node.y + 20, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Replicas HPA Badge or Category Badge
        if (replicas > 1) {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(node.x + nodeW - 55, node.y + 11, 44, 16, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 9px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${replicas}x ⚡`, node.x + nodeW - 33, node.y + 19);
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.beginPath();
          ctx.roundRect(node.x + nodeW - 64, node.y + 11, 52, 16, 4);
          ctx.fill();

          ctx.fillStyle = '#94a3b8';
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(node.type.toUpperCase(), node.x + nodeW - 38, node.y + 19);
        }

        // Node Name (Clamped)
        ctx.fillStyle = isDead ? '#f87171' : '#f8fafc';
        ctx.font = 'bold 12.5px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const displayName = node.name.length > 17 ? node.name.slice(0, 16) + '…' : node.name;
        ctx.fillText(displayName, node.x + 28, node.y + 20);

        // Region Badge & Tech stack
        ctx.fillStyle = '#64748b';
        ctx.font = '10px Inter, system-ui, sans-serif';
        const regionTag = `🌐 ${node.region || 'us-east-1'}`;
        const techSummary = node.techStack && node.techStack.length > 0
          ? `${regionTag} • ${node.techStack[0]}`
          : regionTag;
        ctx.fillText(techSummary.length > 28 ? techSummary.slice(0, 27) + '…' : techSummary, node.x + 14, node.y + 42);

        // Divider
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.beginPath();
        ctx.moveTo(node.x + 10, node.y + 54);
        ctx.lineTo(node.x + nodeW - 10, node.y + 54);
        ctx.stroke();

        // INDIVIDUAL Live Metrics (Real node throughput & latency)
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`${node.metrics.currentRps.toLocaleString()} RPS`, node.x + 14, node.y + 70);

        ctx.fillStyle = '#a855f7';
        ctx.textAlign = 'right';
        ctx.fillText(`${node.metrics.avgLatencyMs}ms`, node.x + nodeW - 14, node.y + 70);

        // CPU / Health Mini Bar
        const barWidth = nodeW - 28;
        const cpuFill = Math.min(1, Math.max(0, node.metrics.cpuPercent / 100));
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.roundRect(node.x + 14, node.y + 84, barWidth, 4, 2);
        ctx.fill();

        let cpuColor = '#10b981';
        if (cpuFill > 0.75) cpuColor = '#ef4444';
        else if (cpuFill > 0.5) cpuColor = '#f59e0b';

        ctx.fillStyle = cpuColor;
        ctx.beginPath();
        ctx.roundRect(node.x + 14, node.y + 84, barWidth * cpuFill, 4, 2);
        ctx.fill();

        // Circuit Breaker Warning Badge overlay
        if (isCircuitOpen) {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.roundRect(node.x + 15, node.y - 11, nodeW - 30, 18, 9);
          ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 9px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚡ CIRCUIT BREAKER OPEN', node.x + nodeW / 2, node.y - 2);
        }

        // Connection Ports (Input Port on Left, Output Port on Right)
        // Left Input Port
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(node.x, node.y + nodeH / 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Right Output Port
        ctx.fillStyle = connectingFromNodeId === node.id ? '#00f0ff' : 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(node.x + nodeW, node.y + nodeH / 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [nodes, edges, packets, pan, zoom, selectedNodeId, selectedEdgeId, connectingFromNodeId, connectingMousePos, getEdgeEndpoints]);

  // Mouse Coordinates Translation
  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>): { screenX: number; screenY: number; worldX: number; worldY: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { screenX: 0, screenY: 0, worldX: 0, worldY: 0 };
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    return {
      screenX,
      screenY,
      worldX: (screenX - pan.x) / zoom,
      worldY: (screenY - pan.y) / zoom,
    };
  };

  // Right-Click Context Menu Trigger
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevents the browser image download / default context menu!
    const { worldX, worldY } = getCanvasMousePos(e);

    // 1. Check if right-clicked on a Node
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (
        worldX >= node.x &&
        worldX <= node.x + FIXED_NODE_WIDTH &&
        worldY >= node.y &&
        worldY <= node.y + FIXED_NODE_HEIGHT
      ) {
        onSelectNode(node.id);
        setContextMenu({
          isOpen: true,
          x: e.clientX,
          y: e.clientY,
          worldX,
          worldY,
          targetType: 'node',
          targetId: node.id,
        });
        return;
      }
    }

    // 2. Check if right-clicked on an Edge
    for (let i = edges.length - 1; i >= 0; i--) {
      const edge = edges[i];
      const pts = getEdgeEndpoints(edge, nodes);
      if (pts) {
        const midX = (pts.startX + pts.endX) / 2;
        const midY = (pts.startY + pts.endY) / 2;
        if (Math.hypot(worldX - midX, worldY - midY) <= 24) {
          onSelectEdge(edge.id);
          setContextMenu({
            isOpen: true,
            x: e.clientX,
            y: e.clientY,
            worldX,
            worldY,
            targetType: 'edge',
            targetId: edge.id,
          });
          return;
        }
      }
    }

    // 3. Right-clicked on empty canvas space
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      worldX,
      worldY,
      targetType: 'canvas',
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) return; // Right click handled by onContextMenu

    const { screenX, screenY, worldX, worldY } = getCanvasMousePos(e);

    // 1. Check if clicked on an Output Port (to start wire connection)
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const portX = node.x + FIXED_NODE_WIDTH;
      const portY = node.y + FIXED_NODE_HEIGHT / 2;
      const dist = Math.hypot(worldX - portX, worldY - portY);
      if (dist <= 12) {
        setConnectingFromNodeId(node.id);
        setConnectingMousePos({ x: worldX, y: worldY });
        onSelectNode(node.id);
        onSelectEdge(null);
        return;
      }
    }

    // 2. Check if clicked inside a node body
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (
        worldX >= node.x &&
        worldX <= node.x + FIXED_NODE_WIDTH &&
        worldY >= node.y &&
        worldY <= node.y + FIXED_NODE_HEIGHT
      ) {
        setIsDraggingNode(node.id);
        setNodeOffset({ x: worldX - node.x, y: worldY - node.y });
        onSelectNode(node.id);
        onSelectEdge(null);
        return;
      }
    }

    // 3. Check if clicked near an edge midpoint to select edge
    for (let i = edges.length - 1; i >= 0; i--) {
      const edge = edges[i];
      const pts = getEdgeEndpoints(edge, nodes);
      if (pts) {
        const midX = (pts.startX + pts.endX) / 2;
        const midY = (pts.startY + pts.endY) / 2;
        if (Math.hypot(worldX - midX, worldY - midY) <= 24) {
          onSelectEdge(edge.id);
          onSelectNode(null);
          return;
        }
      }
    }

    // 4. Otherwise, pan canvas & deselect
    setIsPanning(true);
    setDragStart({ x: screenX - pan.x, y: screenY - pan.y });
    onSelectNode(null);
    onSelectEdge(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { screenX, screenY, worldX, worldY } = getCanvasMousePos(e);

    if (connectingFromNodeId) {
      setConnectingMousePos({ x: worldX, y: worldY });
    } else if (isDraggingNode) {
      const newX = Math.round(worldX - nodeOffset.x);
      const newY = Math.round(worldY - nodeOffset.y);
      onUpdateNodePosition(isDraggingNode, newX, newY);
    } else if (isPanning) {
      setPan({
        x: screenX - dragStart.x,
        y: screenY - dragStart.y,
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { worldX, worldY } = getCanvasMousePos(e);

    if (connectingFromNodeId) {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const targetNode = nodes[i];
        if (targetNode.id !== connectingFromNodeId) {
          if (
            worldX >= targetNode.x - 15 &&
            worldX <= targetNode.x + FIXED_NODE_WIDTH + 10 &&
            worldY >= targetNode.y - 10 &&
            worldY <= targetNode.y + FIXED_NODE_HEIGHT + 10
          ) {
            onCreateEdge(connectingFromNodeId, targetNode.id);
            break;
          }
        }
      }
      setConnectingFromNodeId(null);
      setConnectingMousePos(null);
    }

    setIsDraggingNode(null);
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(2.5, Math.max(0.4, zoom * zoomFactor));

    const { screenX, screenY } = getCanvasMousePos(e);
    const newPanX = screenX - (screenX - pan.x) * (newZoom / zoom);
    const newPanY = screenY - (screenY - pan.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const resetView = () => {
    setPan({ x: 60, y: 60 });
    setZoom(1);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { worldX, worldY } = getCanvasMousePos(e);
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (
        worldX >= node.x &&
        worldX <= node.x + FIXED_NODE_WIDTH &&
        worldY >= node.y &&
        worldY <= node.y + FIXED_NODE_HEIGHT
      ) {
        if (onOpenNodeInspector) {
          onOpenNodeInspector(node.id);
        }
        return;
      }
    }
  };

  return (
    <div className="canvas-wrapper" onContextMenu={(e) => e.preventDefault()}>
      <canvas
        ref={canvasRef}
        className="architecture-canvas"
        onContextMenu={handleContextMenu}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
      />

      {/* Empty State Banner */}
      {nodes.length === 0 && (
        <div className="empty-canvas-overlay">
          <div className="empty-canvas-box">
            <h3 className="empty-title">Blank Architecture Canvas Ready</h3>
            <p className="empty-desc">
              Start designing your distributed architecture from scratch or right-click on the canvas to deploy components.
            </p>
            <button className="btn-primary empty-add-btn" onClick={() => onOpenAddNode()}>
              ➕ Add First Component
            </button>
          </div>
        </div>
      )}

      {/* Floating Toolbar Controls */}
      <div className="canvas-floating-controls">
        <button className="canvas-btn" onClick={() => setZoom(z => Math.min(2.5, z * 1.15))} title="Zoom In">
          +
        </button>
        <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>
        <button className="canvas-btn" onClick={() => setZoom(z => Math.max(0.4, z * 0.85))} title="Zoom Out">
          -
        </button>
        <button className="canvas-btn reset-btn" onClick={resetView} title="Reset View">
          ⤢ Reset View
        </button>
        {(selectedNodeId || selectedEdgeId) && (
          <button className="canvas-btn delete-btn" onClick={onDeleteSelected} title="Delete selected component (Del)">
            🗑️ Delete
          </button>
        )}
      </div>

      {/* Custom Right-Click Context Menu */}
      {contextMenu.isOpen && (
        <div
          className="canvas-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.targetType === 'canvas' && (
            <>
              <div className="context-menu-header">➕ Add Component</div>
              <button className="context-menu-item" onClick={() => { setContextMenu(p => ({ ...p, isOpen: false })); onOpenAddNode('service'); }}>
                ⚡ Microservice (Compute)
              </button>
              <button className="context-menu-item" onClick={() => { setContextMenu(p => ({ ...p, isOpen: false })); onOpenAddNode('database'); }}>
                🗄️ PostgreSQL / Database
              </button>
              <button className="context-menu-item" onClick={() => { setContextMenu(p => ({ ...p, isOpen: false })); onOpenAddNode('cache'); }}>
                ⚡ Redis Cache
              </button>
              <button className="context-menu-item" onClick={() => { setContextMenu(p => ({ ...p, isOpen: false })); onOpenAddNode('queue'); }}>
                📨 Kafka / RabbitMQ Queue
              </button>
              <button className="context-menu-item" onClick={() => { setContextMenu(p => ({ ...p, isOpen: false })); onOpenAddNode('client'); }}>
                🌐 Traffic Client Source
              </button>
              <div className="context-menu-divider" />
              <button className="context-menu-item text-amber" onClick={() => { setContextMenu(p => ({ ...p, isOpen: false })); resetView(); }}>
                ⤢ Reset Canvas Center
              </button>
              <button className="context-menu-item text-crimson" onClick={() => { setContextMenu(p => ({ ...p, isOpen: false })); onClearAll(); }}>
                🧹 Clear Entire Canvas
              </button>
            </>
          )}

          {contextMenu.targetType === 'node' && contextMenu.targetId && (
            <>
              <div className="context-menu-header">Component Actions</div>
              <button className="context-menu-item text-cyan" onClick={() => { if (onOpenNodeInspector) onOpenNodeInspector(contextMenu.targetId!); setContextMenu(p => ({ ...p, isOpen: false })); }}>
                ⚙️ Inspect & Configure (Specs)
              </button>
              <div className="context-menu-divider" />
              <button className="context-menu-item" onClick={() => { onKillToggle(contextMenu.targetId!); setContextMenu(p => ({ ...p, isOpen: false })); }}>
                🔥 Kill / Revive Service
              </button>
              <button className="context-menu-item" onClick={() => { onDuplicateNode(contextMenu.targetId!); setContextMenu(p => ({ ...p, isOpen: false })); }}>
                📋 Duplicate Component
              </button>
              <button className="context-menu-item" onClick={() => { onUpdateNodeReplicas(contextMenu.targetId!, 1); setContextMenu(p => ({ ...p, isOpen: false })); }}>
                ⚡ Scale Up (+1 Replica)
              </button>
              <button className="context-menu-item" onClick={() => { onUpdateNodeReplicas(contextMenu.targetId!, -1); setContextMenu(p => ({ ...p, isOpen: false })); }}>
                ⬇️ Scale Down (-1 Replica)
              </button>
              <div className="context-menu-divider" />
              <button className="context-menu-item text-crimson" onClick={() => { onDeleteNode(contextMenu.targetId!); setContextMenu(p => ({ ...p, isOpen: false })); }}>
                🗑️ Delete Component
              </button>
            </>
          )}

          {contextMenu.targetType === 'edge' && contextMenu.targetId && (
            <>
              <div className="context-menu-header">Link Actions</div>
              <button className="context-menu-item text-crimson" onClick={() => { onDeleteEdge(contextMenu.targetId!); setContextMenu(p => ({ ...p, isOpen: false })); }}>
                ✂️ Sever / Delete Connection
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
