import React, { useState, useEffect } from 'react';
import * as Y from 'yjs';
import './TopBar.css';

interface TopBarProps {
  username: string;
  connected: boolean;
  isLeftPanelOpen: boolean;
  setIsLeftPanelOpen: (val: boolean) => void;
  isRightPanelOpen: boolean;
  setIsRightPanelOpen: (val: boolean) => void;
  doc: Y.Doc;
}

export const TopBar: React.FC<TopBarProps> = ({
  username,
  connected,
  isLeftPanelOpen,
  setIsLeftPanelOpen,
  isRightPanelOpen,
  setIsRightPanelOpen,
  doc
}) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  // Stats
  const [elementCount, setElementCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const elementsMap = doc.getMap('excalidraw-elements');
    const updateStats = () => {
      setElementCount(Array.from(elementsMap.values()).filter((el: any) => !el.isDeleted).length);
    };
    elementsMap.observe(updateStats);
    updateStats();
    return () => elementsMap.unobserve(updateStats);
  }, [doc]);

  return (
    <div className="top-bar-container">
      {/* Left Menu Items */}
      <div className="top-bar-left">
        <span className="logo-item" onClick={() => setIsControlPanelOpen(!isControlPanelOpen)}>
          ▲ colab
        </span>
        
        <div className="menu-group">
          <div className="menu-item-wrapper">
            <span className="menu-item" onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}>Archivo</span>
            {activeMenu === 'file' && (
              <div className="menu-dropdown">
                <div className="dropdown-item" onClick={() => { alert('Nuevo espacio de trabajo creado'); setActiveMenu(null); }}>Nuevo Proyecto</div>
                <div className="dropdown-item" onClick={() => { window.location.reload(); }}>Recargar Aplicación</div>
              </div>
            )}
          </div>

          <div className="menu-item-wrapper">
            <span className="menu-item" onClick={() => setActiveMenu(activeMenu === 'panels' ? null : 'panels')}>Ver</span>
            {activeMenu === 'panels' && (
              <div className="menu-dropdown">
                <div className="dropdown-item" onClick={() => { setIsLeftPanelOpen(!isLeftPanelOpen); setActiveMenu(null); }}>
                  {isLeftPanelOpen ? '✖ Ocultar Explorador' : '✔ Mostrar Explorador'}
                </div>
                <div className="dropdown-item" onClick={() => { setIsRightPanelOpen(!isRightPanelOpen); setActiveMenu(null); }}>
                  {isRightPanelOpen ? '✖ Ocultar Chat' : '✔ Mostrar Chat'}
                </div>
              </div>
            )}
          </div>

          <div className="menu-item-wrapper">
            <span className="menu-item" onClick={() => setActiveMenu(activeMenu === 'whiteboard' ? null : 'whiteboard')}>Pizarra</span>
            {activeMenu === 'whiteboard' && (
              <div className="menu-dropdown">
                <div className="dropdown-item" onClick={() => { 
                  const elementsMap = doc.getMap('excalidraw-elements');
                  doc.transact(() => {
                    elementsMap.forEach((el: any) => {
                      elementsMap.set(el.id, { ...el, isDeleted: true });
                    });
                  });
                  setActiveMenu(null);
                }}>Limpiar Pizarra</div>
                <div className="dropdown-item-header">Elementos activos: {elementCount}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Status Items */}
      <div className="top-bar-right">
        <span className="status-indicator-top">
          <span className={`status-dot ${connected ? 'connected' : 'offline'}`}></span>
          {connected ? 'Sincronizado' : 'Modo Local'}
        </span>
        
        <span className="top-username">
          {username}
        </span>
        
        <span className="top-time">
          {time}
        </span>

        <button className="control-center-toggle" onClick={() => setIsControlPanelOpen(!isControlPanelOpen)}>
          🎛️
        </button>
      </div>

      {/* Control Panel Dropdown (Mac Style) */}
      {isControlPanelOpen && (
        <div className="control-panel-dropdown">
          <div className="control-panel-header">
            <h3>Centro de Control</h3>
            <span className="mac-os-subtitle">COLAB Studio v1.5</span>
          </div>

          {/* Quick Toggle Grid */}
          <div className="control-panel-grid">
            <div className={`control-card ${connected ? 'active' : ''}`}>
              <div className="card-icon">📡</div>
              <div className="card-info">
                <div className="card-title">Red/Sync</div>
                <div className="card-state">{connected ? 'Sincronizado' : 'Modo Local'}</div>
              </div>
            </div>

            <div className={`control-card ${isLeftPanelOpen ? 'active' : ''}`} onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}>
              <div className="card-icon">📁</div>
              <div className="card-info">
                <div className="card-title">Explorador</div>
                <div className="card-state">{isLeftPanelOpen ? 'Visible' : 'Oculto'}</div>
              </div>
            </div>

            <div className={`control-card ${isRightPanelOpen ? 'active' : ''}`} onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}>
              <div className="card-icon">💬</div>
              <div className="card-info">
                <div className="card-title">Chat</div>
                <div className="card-state">{isRightPanelOpen ? 'Visible' : 'Oculto'}</div>
              </div>
            </div>

            <div className="control-card active" onClick={() => {
              const body = document.body;
              if (body.getAttribute('data-theme') === 'dark') {
                body.removeAttribute('data-theme');
              } else {
                body.setAttribute('data-theme', 'dark');
              }
            }}>
              <div className="card-icon">🌗</div>
              <div className="card-info">
                <div className="card-title">Apariencia</div>
                <div className="card-state">Alternar Tema</div>
              </div>
            </div>
          </div>

          {/* Stats & Session Panel */}
          <div className="control-panel-footer">
            <div className="footer-stat-row">
              <span>Elementos en Pizarra:</span>
              <strong>{elementCount}</strong>
            </div>
            <div className="footer-stat-row">
              <span>Usuario Activo:</span>
              <strong>{username}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
