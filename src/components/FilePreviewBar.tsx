import React, { useState, useEffect } from 'react';
import './FilePreviewBar.css';

interface ProjectFile {
  name: string;
  type: 'file' | 'folder';
  path: string;
}

interface FilePreviewBarProps {
  openFiles: ProjectFile[];
  activeFile: ProjectFile | null;
  onSelectFile: (file: ProjectFile) => void;
  onCloseFile: (file: ProjectFile) => void;
  onClearAll: () => void;
}

export const FilePreviewBar: React.FC<FilePreviewBarProps> = ({ 
  openFiles, 
  activeFile, 
  onSelectFile, 
  onCloseFile, 
  onClearAll 
}) => {
  const [showQuickLook, setShowQuickLook] = useState(false);

  // Open modal automatically when a file is clicked/opened
  useEffect(() => {
    if (activeFile) {
      setShowQuickLook(true);
    }
  }, [activeFile]);

  if (openFiles.length === 0) return null;

  // Simulated content based on file types
  const getFileContentPreview = (file: ProjectFile) => {
    if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
      return `import React from 'react';\n\nexport const ${file.name.split('.')[0]} = () => {\n  return (\n    <div>\n      <h1>Hello from ${file.name}</h1>\n    </div>\n  );\n};`;
    }
    if (file.name.endsWith('.md')) {
      return `# ${file.name.split('.')[0]}\n\nEste es un archivo de documentación colaborativa.\n\n- Proyecto: ColabStudio\n- Estado: Fase 1.5`;
    }
    return `{\n  "name": "${file.name.split('.')[0]}",\n  "version": "1.0.0",\n  "description": "Simulado para vista previa"\n}`;
  };

  return (
    <div className="preview-bar-container">
      <div className="preview-bar-title">Abiertos:</div>
      <div className="preview-bar-scroll">
        {openFiles.map(file => {
          const isActive = activeFile && activeFile.path === file.path;
          const handleDragStart = (e: React.DragEvent) => {
            e.dataTransfer.setData('application/colab-file', JSON.stringify(file));
            e.dataTransfer.effectAllowed = 'copyMove';
          };
          return (
            <div 
              key={file.path}
              className={`preview-file-card ${isActive ? 'active-preview' : ''}`}
              onClick={() => onSelectFile(file)}
              draggable
              onDragStart={handleDragStart}
              title="Haz clic para Vista Previa Rápida (Quick Look) o arrastra"
            >
              <span className="preview-card-icon">📄</span>
              <span className="preview-card-name" style={{ fontWeight: isActive ? 600 : 400 }}>{file.name}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginRight: '8px' }}>({file.path})</span>
              <button 
                className="card-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseFile(file);
                }}
                title="Cerrar archivo"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <button 
        className="preview-close-btn"
        onClick={onClearAll}
        title="Cerrar todos los archivos"
      />

      {/* Quick Look Modal (Mac Style) */}
      {showQuickLook && activeFile && (
        <div className="quicklook-overlay" onClick={() => setShowQuickLook(false)}>
          <div className="quicklook-modal" onClick={(e) => e.stopPropagation()}>
            <div className="quicklook-header">
              <div className="mac-buttons">
                <span className="mac-close" onClick={() => setShowQuickLook(false)}></span>
                <span className="mac-minimize"></span>
                <span className="mac-expand"></span>
              </div>
              <span className="quicklook-title">{activeFile.name} — Vista Previa</span>
            </div>
            <div className="quicklook-body">
              <pre className="quicklook-code">
                <code>{getFileContentPreview(activeFile)}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
