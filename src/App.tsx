import { useState, useCallback } from 'react';
import { useYjs } from './hooks/useYjs';
import { Sidebar } from './components/Sidebar';
import { Whiteboard } from './components/Whiteboard';
import { Chat } from './components/Chat';
import { TopBar } from './components/TopBar';
import { FilePreviewBar } from './components/FilePreviewBar';

const DEFAULT_ROOMS: Record<string, string> = {
  'sala-1': 'Sala Principal 🚀',
  'sala-2': 'Diseño y UI 🎨',
  'sala-3': 'Feedback y Tareas 📝',
};

function loadRooms(): Record<string, string> {
  try {
    const saved = localStorage.getItem('colab_rooms');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Object.keys(parsed).length > 0) return parsed;
    }
  } catch (_) {}
  return { ...DEFAULT_ROOMS };
}

function saveRooms(rooms: Record<string, string>) {
  localStorage.setItem('colab_rooms', JSON.stringify(rooms));
}

function App() {
  const [tempName, setTempName] = useState('');
  const [username, setUsername] = useState<string | null>(() => {
    return localStorage.getItem('colab_username') || null;
  });
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [openFiles, setOpenFiles] = useState<any[]>([]);
  const [activeFile, setActiveFile] = useState<any>(null);

  // Salas desde localStorage — instantáneo, sin race condition de WebSocket
  const [rooms, setRooms] = useState<Record<string, string>>(loadRooms);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    // Validar que la sala del URL existe
    const currentRooms = loadRooms();
    return roomParam && currentRooms[roomParam] ? roomParam : null;
  });

  // Sincronizar Yjs una vez que tenemos la sala seleccionada
  const activeRoomId = selectedRoomId || 'colab-dummy-lobby';
  const { doc, provider, connected } = useYjs(activeRoomId, username || undefined);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      const name = tempName.trim();
      setUsername(name);
      localStorage.setItem('colab_username', name);
    }
  };

  const handleSelectRoom = useCallback((roomId: string) => {
    setSelectedRoomId(roomId);
    window.history.replaceState({}, '', `${window.location.pathname}?room=${roomId}`);
  }, []);

  const handleCreateRoom = useCallback(() => {
    const newId = 'sala-' + Math.random().toString(36).substring(2, 9);
    const updated = { ...rooms, [newId]: 'Nueva Sala ✨' };
    setRooms(updated);
    saveRooms(updated);
    handleSelectRoom(newId);
  }, [rooms, handleSelectRoom]);

  const handleRenameRoom = useCallback((roomId: string, newName: string) => {
    setRooms(prev => {
      const updated = { ...prev, [roomId]: newName };
      saveRooms(updated);
      return updated;
    });
  }, []);

  const handleLeaveRoom = () => {
    setSelectedRoomId(null);
    const newUrl = window.location.pathname;
    window.history.replaceState({}, '', newUrl);
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
              Ingresar Nombre
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Si tiene nombre pero no ha elegido una sala, mostrar el selector
  if (!selectedRoomId) {
    return (
      <div className="auth-overlay">
        <div className="auth-card" style={{ maxWidth: '500px', width: '95%' }}>
          <h1 className="auth-title">Salas de Trabajo</h1>
          <p className="auth-subtitle">Selecciona o crea una sala para colaborar</p>
          
          <div className="rooms-list">
            {Object.entries(rooms).map(([id, name]) => (
              <div key={id} className="room-item-card">
                <div className="room-info-wrapper">
                  <input
                    type="text"
                    className="room-name-input"
                    value={name}
                    onChange={(e) => handleRenameRoom(id, e.target.value)}
                    title="Haz clic para renombrar la sala"
                  />
                  <span className="room-connection-id">ID: {id}</span>
                </div>
                <button 
                  onClick={() => handleSelectRoom(id)}
                  className="btn btn-room-join"
                >
                  Entrar
                </button>
              </div>
            ))}
          </div>

          <div className="rooms-action-bar">
            <button 
              onClick={handleCreateRoom} 
              className="btn btn-create-room"
            >
              + Crear Nueva Sala
            </button>
            <button 
              onClick={() => {
                setUsername(null);
                localStorage.removeItem('colab_username');
              }} 
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '12px 20px' }}
            >
              Salir
            </button>
          </div>
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
        roomName={activeRoomId}
        roomDisplayName={rooms[activeRoomId] || activeRoomId}
        onLeaveRoom={handleLeaveRoom}
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

        {/* Canvas Central: Pizarra BlockSuite */}
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

          {!connected && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(248,249,250,0.8)', backdropFilter: 'blur(4px)',
              fontSize: '14px', color: 'var(--text-secondary)',
              flexDirection: 'column', gap: '12px'
            }}>
              <div style={{ width: 24, height: 24, border: '2px solid var(--border-color)', borderTopColor: 'var(--accent-color)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Conectando a la sala...
            </div>
          )}
          <Whiteboard doc={doc} provider={provider} username={username} onOpenFile={handleOpenFile} />

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
