import React, { useState, useEffect } from 'react';
import * as Y from 'yjs';
import './Sidebar.css';

interface SidebarProps {
  doc: Y.Doc;
  username: string;
  isOpen: boolean;
  onToggle: () => void;
  onOpenFile: (file: ProjectFile) => void;
}

interface ProjectFile {
  name: string;
  type: 'file' | 'folder';
  path: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ doc, username, isOpen, onToggle, onOpenFile }) => {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'file' | 'folder'>('file');
  const [showInput, setShowInput] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const filesMap = doc.getMap<ProjectFile>('project-files');

  // Cargar y observar cambios en la estructura del proyecto
  useEffect(() => {
    const updateFilesList = () => {
      const allFiles = Array.from(filesMap.values());
      setFiles(allFiles);
    };

    filesMap.observe(updateFilesList);
    updateFilesList(); // Inicial

    // Si está vacío, agregar algunos archivos de ejemplo por defecto
    if (filesMap.size === 0) {
      const defaultFiles: ProjectFile[] = [
        { name: 'src', type: 'folder', path: 'src' },
        { name: 'App.tsx', type: 'file', path: 'src/App.tsx' },
        { name: 'main.tsx', type: 'file', path: 'src/main.tsx' },
        { name: 'README.md', type: 'file', path: 'README.md' }
      ];
      defaultFiles.forEach(f => filesMap.set(f.path, f));
    }

    return () => {
      filesMap.unobserve(updateFilesList);
    };
  }, [doc]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const path = newItemType === 'folder' 
      ? newItemName.trim()
      : `src/${newItemName.trim()}`;

    const newFile: ProjectFile = {
      name: newItemName.trim(),
      type: newItemType,
      path: path
    };

    filesMap.set(path, newFile);
    setNewItemName('');
    setShowInput(false);
  };

  const handleDragStart = (e: React.DragEvent, file: ProjectFile) => {
    e.dataTransfer.setData('application/colab-file', JSON.stringify(file));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  return (
    <div className={`panel sidebar ${isOpen ? '' : 'collapsed'}`}>
      <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <h2 className="panel-title" style={{ fontSize: '15px' }}>Estructura</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="view-toggle-container">
            <button 
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vista Lista"
            >
              ☰
            </button>
            <button 
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vista Cuadrícula"
            >
              ⊞
            </button>
          </div>
          <button className="add-btn" onClick={() => setShowInput(!showInput)}>
            {showInput ? '✖' : '＋'}
          </button>
          <button 
            onClick={onToggle}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              fontSize: '14px', 
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
              marginLeft: '4px'
            }}
            title="Ocultar Explorador"
          >
            ◀
          </button>
        </div>
      </div>

      <div className="panel-body">
        {showInput && (
          <form onSubmit={handleAddItem} className="add-item-form">
            <input
              type="text"
              className="auth-input"
              placeholder="Nombre..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              autoFocus
            />
            <div className="type-selector">
              <label>
                <input
                  type="radio"
                  name="type"
                  checked={newItemType === 'file'}
                  onChange={() => setNewItemType('file')}
                />
                Archivo
              </label>
              <label>
                <input
                  type="radio"
                  name="type"
                  checked={newItemType === 'folder'}
                  onChange={() => setNewItemType('folder')}
                />
                Carpeta
              </label>
            </div>
            <button type="submit" className="btn">Agregar</button>
          </form>
        )}

        <div className={`file-tree ${viewMode}`}>
          {files.map((file) => (
            <div 
              key={file.path} 
              className={`file-item ${file.type}`} 
              style={{ paddingLeft: viewMode === 'list' && file.path.includes('/') ? '20px' : '10px' }}
              draggable
              onDragStart={(e) => handleDragStart(e, file)}
              onClick={() => file.type === 'file' && onOpenFile(file)}
            >
              <span className="icon">
                {file.type === 'folder' ? '📁' : '📄'}
              </span>
              <span className="file-name">{file.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="sidebar-footer">
        <div className="user-badge">
          <span className="status-indicator"></span>
          Conectado como <strong>{username}</strong>
        </div>
      </div>
    </div>
  );
};
