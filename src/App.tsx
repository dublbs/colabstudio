import { useState } from 'react';
import { useYjs } from './hooks/useYjs';
import { Sidebar } from './components/Sidebar';
import { Whiteboard } from './components/Whiteboard';
import { Chat } from './components/Chat';
import { TopBar } from './components/TopBar';
import { FilePreviewBar } from './components/FilePreviewBar';

function App() {
  const [tempName, setTempName] = useState('');
  const [username, setUsername] = useState<string | null>(() => {
    return localStorage.getItem('colab_username') || null;
  });
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [openFiles, setOpenFiles] = useState<any[]>([]);
  const [activeFile, setActiveFile] = useState<any>(null);

  // Obtener o generar un ID de sala único de la URL
  const roomName = useState(() => {
    const params = new URLSearchParams(window.location.search);
    let room = params.get('room');
    if (!room) {
      room = 'colab-' + Math.random().toString(36).substring(2, 9);
      const newUrl = `${window.location.pathname}?room=${room}`;
      window.history.replaceState({}, '', newUrl);
    }
    return room;
  })[0];

  // Sincronizar Yjs una vez que tenemos el nombre de usuario
  const { doc, connected } = useYjs(roomName, username || undefined);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      const name = tempName.trim();
      setUsername(name);
      localStorage.setItem('colab_username', name);
    }
  };

  const handleOpenFile = (file: any) => {
    setOpenFiles(prev => {
      if (prev.some(f => f.path === file.path)) {
        return prev;
      }
      return [...prev, file];
    });
    setActiveFile(file);
  };

  const handleCloseFile = (file: any) => {
    setOpenFiles(prev => prev.filter(f => f.path !== file.path));
    if (activeFile && activeFile.path === file.path) {
      setActiveFile(null);
    }
  };

  const handleClearAllFiles = () => {
    setOpenFiles([]);
    setActiveFile(null);
  };

  if (!username) {
    return (
      <div className="auth-overlay">
        <div className="auth-card">
          <h1 className="auth-title">COLAB Studio</h1>
          <p className="auth-subtitle">Entorno Colaborativo en Tiempo Real</p>
          <form onSubmit={handleJoin}>
            <div className="auth-form-group">
              <label className="auth-label">Tu Nombre o Alias</label>
              <input
                type="text"
                className="auth-input"
                placeholder="Nombre"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn">
              Entrar al Espacio de Trabajo
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopBar 
        username={username}
        connected={connected}
        isLeftPanelOpen={isLeftPanelOpen}
        setIsLeftPanelOpen={setIsLeftPanelOpen}
        isRightPanelOpen={isRightPanelOpen}
        setIsRightPanelOpen={setIsRightPanelOpen}
        doc={doc}
      />
      <FilePreviewBar 
        openFiles={openFiles} 
        activeFile={activeFile} 
        onSelectFile={setActiveFile} 
        onCloseFile={handleCloseFile} 
        onClearAll={handleClearAllFiles} 
      />
      <div className="app-container" style={{ height: openFiles.length > 0 ? 'calc(100vh - 36px - 52px)' : 'calc(100vh - 36px)' }}>
        {/* Sidebar: Estructura del proyecto */}
        <Sidebar 
          doc={doc} 
          username={username} 
          isOpen={isLeftPanelOpen} 
          onToggle={() => setIsLeftPanelOpen(!isLeftPanelOpen)} 
          onOpenFile={handleOpenFile}
        />

        {/* Canvas Central: Pizarra Excalidraw */}
        <div className="canvas-container">
          {/* Toggle Sidebar Izquierda (Solo visible cuando está oculto) */}
          {!isLeftPanelOpen && (
            <button 
              onClick={() => setIsLeftPanelOpen(true)}
              className="panel-toggle-btn"
              style={{
                position: 'absolute',
                top: '15px',
                left: '15px',
                zIndex: 10,
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                color: 'var(--text-primary)',
                fontSize: '16px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              title="Mostrar Explorador"
            >
              ▶
            </button>
          )}

          <Whiteboard doc={doc} username={username} />

          {/* Toggle Chat Derecho (Solo visible cuando está oculto) */}
          {!isRightPanelOpen && (
            <button 
              onClick={() => setIsRightPanelOpen(true)}
              className="panel-toggle-btn"
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                zIndex: 10,
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                color: 'var(--text-primary)',
                fontSize: '16px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              title="Mostrar Chat"
            >
              ◀
            </button>
          )}
        </div>

        {/* Chat Lateral Derecho */}
        <Chat 
          doc={doc} 
          username={username} 
          isOpen={isRightPanelOpen} 
          onToggle={() => setIsRightPanelOpen(!isRightPanelOpen)} 
        />
      </div>
    </>
  );
}

export default App;
