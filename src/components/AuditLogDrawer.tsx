import React from 'react';
import { X, Terminal, AlertCircle, AlertTriangle, Info, Flame, ShieldAlert } from 'lucide-react';
import type { AuditLogEntry } from '../types';

interface AuditLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLogEntry[];
}

export const AuditLogDrawer: React.FC<AuditLogDrawerProps> = ({
  isOpen,
  onClose,
  logs,
}) => {
  if (!isOpen) return null;

  const getLogIcon = (type: AuditLogEntry['type']) => {
    switch (type) {
      case 'ERROR': return <AlertCircle size={14} className="text-crimson" />;
      case 'WARN': return <AlertTriangle size={14} className="text-amber" />;
      case 'CHAOS': return <Flame size={14} className="text-rose" />;
      case 'CIRCUIT_BREAKER': return <ShieldAlert size={14} className="text-amber" />;
      case 'INFO':
      default:
        return <Info size={14} className="text-cyan" />;
    }
  };

  return (
    <aside className="audit-log-drawer" aria-label="System Event and Telemetry Audit Log">
      <div className="audit-header">
        <div className="audit-title-row">
          <Terminal size={18} className="text-cyan" />
          <h3 className="audit-title">Live Architecture Audit Stream</h3>
          <span className="log-counter">{logs.length} events</span>
        </div>
        <button className="audit-close-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="audit-list">
        {logs.length === 0 ? (
          <div className="empty-audit">
            <p>No telemetry events logged yet. System operating at baseline.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`audit-entry log-${log.type.toLowerCase()}`}>
              <div className="audit-entry-meta">
                <span className="audit-icon">{getLogIcon(log.type)}</span>
                <span className="audit-time">{log.timestamp}</span>
                <span className="audit-source">[{log.source}]</span>
              </div>
              <p className="audit-message">{log.message}</p>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
