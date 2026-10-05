import React, { useState } from 'react';
import { X, Copy, Download, Check, FileCode, Layers, BookOpen } from 'lucide-react';
import type { NodeData, EdgeData } from '../types';
import { generateDockerCompose, generateTerraform, generateMarkdownDoc } from '../utils/exporters';

interface ExportModalProps {
  nodes: NodeData[];
  edges: EdgeData[];
  presetName: string;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  nodes,
  edges,
  presetName,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'docker' | 'terraform' | 'markdown' | 'json'>('docker');
  const [copied, setCopied] = useState<boolean>(false);

  const dockerContent = generateDockerCompose(nodes, edges);
  const terraformContent = generateTerraform(nodes, edges);
  const markdownContent = generateMarkdownDoc(nodes, edges, presetName);
  const jsonContent = JSON.stringify({ nodes, edges, generatedAt: new Date().toISOString() }, null, 2);

  const getCurrentContent = () => {
    switch (activeTab) {
      case 'docker': return dockerContent;
      case 'terraform': return terraformContent;
      case 'markdown': return markdownContent;
      case 'json': return jsonContent;
    }
  };

  const getFileName = () => {
    switch (activeTab) {
      case 'docker': return 'docker-compose.yml';
      case 'terraform': return 'main.tf';
      case 'markdown': return 'LIVING_SPEC.md';
      case 'json': return 'architecture-mesh.json';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([getCurrentContent()], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = getFileName();
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <Layers className="text-cyan" size={20} />
            <div>
              <h2 className="modal-title">Export Infrastructure & Living Docs</h2>
              <span className="modal-subtitle">Direct translation from visual architecture to production code</span>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="modal-tabs">
          <button
            className={`modal-tab-btn ${activeTab === 'docker' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('docker')}
          >
            <FileCode size={16} />
            <span>docker-compose.yml</span>
          </button>
          <button
            className={`modal-tab-btn ${activeTab === 'terraform' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('terraform')}
          >
            <Layers size={16} />
            <span>Terraform (AWS)</span>
          </button>
          <button
            className={`modal-tab-btn ${activeTab === 'markdown' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('markdown')}
          >
            <BookOpen size={16} />
            <span>Living Spec (Markdown)</span>
          </button>
          <button
            className={`modal-tab-btn ${activeTab === 'json' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('json')}
          >
            <FileCode size={16} />
            <span>Architecture JSON</span>
          </button>
        </div>

        {/* Code Preview Area */}
        <div className="modal-code-area">
          <pre className="code-pre">
            <code>{getCurrentContent()}</code>
          </pre>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <span className="file-info-badge">{getFileName()} ({getCurrentContent().split('\n').length} lines)</span>
          <div className="modal-footer-actions">
            <button className="btn-secondary" onClick={handleCopy}>
              {copied ? <Check size={16} className="text-emerald" /> : <Copy size={16} />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
            </button>
            <button className="btn-primary" onClick={handleDownload}>
              <Download size={16} />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
