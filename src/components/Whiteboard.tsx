import React, { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import './Whiteboard.css';

interface ProjectFile {
  name: string;
  type: 'file' | 'folder';
  path: string;
}

interface CanvasCardData {
  id: string;
  name: string;
  type: 'file' | 'folder' | 'note' | 'rect' | 'circle' | 'draw' | 'text';
  path?: string;
  text?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: { x: number; y: number }[];
  color?: string;
  fontSize?: number;
}

interface WhiteboardProps {
  doc: Y.Doc;
  provider: any;
  username: string;
  onOpenFile: (file: ProjectFile) => void;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ doc, provider, username, onOpenFile }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Estado local para cursores remotos
  const [otherUsers, setOtherUsers] = useState<any[]>([]);
  
  // Yjs Shared Map para las tarjetas
  const yCards = doc.getMap<CanvasCardData>('canvas-cards');
  
  // Estado local para renderizado
  const [cards, setCards] = useState<CanvasCardData[]>([]);
  
  // Zoom y Paneo
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  // Herramienta activa: select, pencil, rectangle, circle, text, eraser
  const [activeTool, setActiveTool] = useState<'select' | 'pencil' | 'rectangle' | 'circle' | 'text' | 'eraser'>('select');
  
  // Estados de paneo y arrastre
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Estados de dibujo
  const [isDrawing, setIsDrawing] = useState(false);
  const drawingElementId = useRef<string | null>(null);
  const drawStartPoint = useRef({ x: 0, y: 0 });

  // 1. Sincronización Yjs -> Estado Local
  useEffect(() => {
    const updateCardsList = () => {
      setCards(Array.from(yCards.values()));
    };

    yCards.observe(updateCardsList);
    updateCardsList(); // Carga inicial

    return () => {
      yCards.unobserve(updateCardsList);
    };
  }, [yCards]);

  // 1.5 Sincronización de Cursores (Yjs Awareness)
  useEffect(() => {
    if (!provider) return;

    const handleAwarenessChange = () => {
      const states = Array.from(provider.awareness.getStates().entries()) as [number, any][];
      const remoteCursors = states
        .filter(([clientId, state]: [number, any]) => clientId !== provider.awareness.clientID && state.cursor && state.user)
        .map(([clientId, state]: [number, any]) => ({
          id: clientId,
          name: state.user.name,
          color: state.user.color || '#4f46e5',
          x: state.cursor.x,
          y: state.cursor.y,
          tool: state.cursor.tool || 'select'
        }));
      setOtherUsers(remoteCursors);
    };

    provider.awareness.on('change', handleAwarenessChange);
    
    return () => {
      provider.awareness.off('change', handleAwarenessChange);
    };
  }, [provider]);

  // 2. Mouse Down Handler (Paneo, Dibujo, Borrado)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Si hace clic en una tarjeta, textarea o botón, no actuar sobre el lienzo
    if ((e.target as HTMLElement).closest('.canvas-card') || 
        (e.target as HTMLElement).closest('.drawing-toolbar') || 
        (e.target as HTMLElement).closest('.canvas-controls')) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Coordenadas en el espacio del canvas
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const canvasX = (clientX - pan.x) / zoom;
    const canvasY = (clientY - pan.y) / zoom;

    if (activeTool === 'select') {
      // Iniciar paneo
      if (e.button === 0 || e.button === 1) {
        setIsPanning(true);
        panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
        e.preventDefault();
      }
    } else if (activeTool === 'pencil') {
      // Iniciar trazo libre
      setIsDrawing(true);
      const newId = 'draw-' + Math.random().toString(36).substring(2, 9);
      const newElement: CanvasCardData = {
        id: newId,
        name: 'Pincel',
        type: 'draw',
        x: Math.round(canvasX),
        y: Math.round(canvasY),
        points: [{ x: 0, y: 0 }],
        color: '#4f46e5'
      };
      yCards.set(newId, newElement);
      drawingElementId.current = newId;
      drawStartPoint.current = { x: canvasX, y: canvasY };
    } else if (activeTool === 'rectangle') {
      // Iniciar rectángulo
      setIsDrawing(true);
      const newId = 'rect-' + Math.random().toString(36).substring(2, 9);
      const newElement: CanvasCardData = {
        id: newId,
        name: 'Rectángulo',
        type: 'rect',
        x: Math.round(canvasX),
        y: Math.round(canvasY),
        width: 1,
        height: 1,
        color: '#4f46e5'
      };
      yCards.set(newId, newElement);
      drawingElementId.current = newId;
      drawStartPoint.current = { x: canvasX, y: canvasY };
    } else if (activeTool === 'circle') {
      // Iniciar elipse/círculo
      setIsDrawing(true);
      const newId = 'circle-' + Math.random().toString(36).substring(2, 9);
      const newElement: CanvasCardData = {
        id: newId,
        name: 'Círculo',
        type: 'circle',
        x: Math.round(canvasX),
        y: Math.round(canvasY),
        width: 1,
        height: 1,
        color: '#4f46e5'
      };
      yCards.set(newId, newElement);
      drawingElementId.current = newId;
      drawStartPoint.current = { x: canvasX, y: canvasY };
    } else if (activeTool === 'text') {
      // Crear texto y volver a modo selección
      const newId = 'text-' + Math.random().toString(36).substring(2, 9);
      const newElement: CanvasCardData = {
        id: newId,
        name: 'Texto',
        type: 'text',
        x: Math.round(canvasX),
        y: Math.round(canvasY),
        text: 'Haz doble click para editar',
        fontSize: 16,
        color: '#1e1e2e'
      };
      yCards.set(newId, newElement);
      setActiveTool('select');
    }
  };

  // 3. Mouse Move Handler (Paneo, Dibujo, Arrastre de Tarjetas, Transmisión de Cursor)
  const handleMouseMove = (e: React.MouseEvent) => {
    // Transmitir cursor local
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect && provider) {
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      const cursorX = (clientX - pan.x) / zoom;
      const cursorY = (clientY - pan.y) / zoom;
      provider.awareness.setLocalStateField('cursor', {
        x: Math.round(cursorX),
        y: Math.round(cursorY),
        tool: activeTool
      });
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y
      });
    } else if (isDrawing && drawingElementId.current) {
      if (!rect) return;

      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      const canvasX = (clientX - pan.x) / zoom;
      const canvasY = (clientY - pan.y) / zoom;

      const element = yCards.get(drawingElementId.current);
      if (!element) return;

      if (element.type === 'draw') {
        const offsetX = canvasX - drawStartPoint.current.x;
        const offsetY = canvasY - drawStartPoint.current.y;
        const updatedPoints = [...(element.points || []), { x: offsetX, y: offsetY }];
        yCards.set(drawingElementId.current, {
          ...element,
          points: updatedPoints
        });
      } else if (element.type === 'rect' || element.type === 'circle') {
        const width = canvasX - drawStartPoint.current.x;
        const height = canvasY - drawStartPoint.current.y;
        yCards.set(drawingElementId.current, {
          ...element,
          x: Math.round(width < 0 ? canvasX : drawStartPoint.current.x),
          y: Math.round(height < 0 ? canvasY : drawStartPoint.current.y),
          width: Math.round(Math.abs(width)),
          height: Math.round(Math.abs(height))
        });
      }
    } else if (draggedCardId) {
      if (!rect) return;

      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      
      const newX = (clientX - pan.x) / zoom - dragOffset.current.x;
      const newY = (clientY - pan.y) / zoom - dragOffset.current.y;

      const currentCard = yCards.get(draggedCardId);
      if (currentCard) {
        yCards.set(draggedCardId, {
          ...currentCard,
          x: Math.round(newX),
          y: Math.round(newY)
        });
      }
    }
  };

  // 4. Mouse Up Handler
  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDrawing(false);
    drawingElementId.current = null;
    setDraggedCardId(null);
  };

  // 5. Zoom Handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const canvasMouseX = (mouseX - pan.x) / zoom;
    const canvasMouseY = (mouseY - pan.y) / zoom;

    const zoomFactor = 1.1;
    let newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    newZoom = Math.max(0.15, Math.min(newZoom, 4)); // Límites

    const newPan = {
      x: mouseX - canvasMouseX * newZoom,
      y: mouseY - canvasMouseY * newZoom
    };

    setZoom(newZoom);
    setPan(newPan);
  };

  // 6. Drag & Drop desde fuera del canvas (Sidebar / Chat Messages)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const fileDataStr = e.dataTransfer.getData('application/colab-file');
    const textData = e.dataTransfer.getData('text/plain');

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const dropX = (clientX - pan.x) / zoom;
    const dropY = (clientY - pan.y) / zoom;

    let newCard: CanvasCardData;

    if (fileDataStr) {
      try {
        const fileData = JSON.parse(fileDataStr) as ProjectFile;
        newCard = {
          id: 'card-' + Math.random().toString(36).substring(2, 9),
          name: fileData.name,
          type: fileData.type,
          path: fileData.path,
          x: Math.round(dropX - 60),
          y: Math.round(dropY - 60)
        };
      } catch (_) { return; }
    } else if (textData) {
      // Arrastrar mensaje de Chat → Pizarra: Crea un Post-It
      const colors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      // Limpiar prefijos de remitente si vienen del chat
      const messageText = textData.includes(': ') ? textData.split(': ').slice(1).join(': ') : textData;
      const senderText = textData.includes(': ') ? `Enviado por: ${textData.split(': ')[0]}` : 'Nota Adhesiva';

      newCard = {
        id: 'card-' + Math.random().toString(36).substring(2, 9),
        name: senderText,
        type: 'note',
        text: messageText,
        x: Math.round(dropX - 100),
        y: Math.round(dropY - 100),
        color: randomColor
      };
    } else {
      return;
    }

    doc.transact(() => {
      yCards.set(newCard.id, newCard);
    });
  };

  // 7. Drag Start de las tarjetas (Pizarra → Chat)
  const handleCardDragStart = (e: React.MouseEvent, card: CanvasCardData) => {
    if (activeTool === 'eraser') {
      e.stopPropagation();
      e.preventDefault();
      doc.transact(() => {
        yCards.delete(card.id);
      });
      return;
    }

    e.stopPropagation();
    e.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const cardCanvasX = (clientX - pan.x) / zoom;
    const cardCanvasY = (clientY - pan.y) / zoom;

    dragOffset.current = {
      x: cardCanvasX - card.x,
      y: cardCanvasY - card.y
    };
    
    setDraggedCardId(card.id);
  };

  // Drag start para HTML5 drag and drop hacia el Chat
  const handleHtml5DragStart = (e: React.DragEvent, card: CanvasCardData) => {
    if (card.type === 'file' || card.type === 'folder') {
      e.dataTransfer.setData('application/colab-file', JSON.stringify({
        name: card.name,
        type: card.type,
        path: card.path
      }));
    } else if (card.type === 'note') {
      e.dataTransfer.setData('text/plain', card.text || '');
    }
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  // 8. Doble clic para abrir archivo
  const handleCardDoubleClick = (e: React.MouseEvent, card: CanvasCardData) => {
    e.stopPropagation();
    if (card.type === 'file' && card.path) {
      onOpenFile({
        name: card.name,
        type: 'file',
        path: card.path
      });
    }
  };

  // 9. Modificaciones en tiempo real
  const handleNoteTextChange = (cardId: string, newText: string) => {
    const card = yCards.get(cardId);
    if (card && card.type === 'note') {
      yCards.set(cardId, {
        ...card,
        text: newText
      });
    }
  };

  const handleTextChange = (cardId: string, newText: string) => {
    const card = yCards.get(cardId);
    if (card && card.type === 'text') {
      yCards.set(cardId, {
        ...card,
        text: newText
      });
    }
  };

  // 10. Limpiar cursor de Awareness al salir
  const handleMouseLeave = () => {
    if (provider) {
      provider.awareness.setLocalStateField('cursor', null);
    }
  };

  return (
    <div 
      className="whiteboard-container"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`
      }}
    >
      {/* Barra de herramientas flotante (Excalidraw Clone) */}
      <div className="drawing-toolbar">
        <button 
          className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`}
          onClick={() => setActiveTool('select')}
          title="Seleccionar y mover (V)"
        >
          ↗️
        </button>
        <button 
          className={`tool-btn ${activeTool === 'pencil' ? 'active' : ''}`}
          onClick={() => setActiveTool('pencil')}
          title="Lápiz / Dibujo libre (P)"
        >
          ✏️
        </button>
        <button 
          className={`tool-btn ${activeTool === 'rectangle' ? 'active' : ''}`}
          onClick={() => setActiveTool('rectangle')}
          title="Rectángulo (R)"
        >
          ⬜
        </button>
        <button 
          className={`tool-btn ${activeTool === 'circle' ? 'active' : ''}`}
          onClick={() => setActiveTool('circle')}
          title="Elipse / Círculo (O)"
        >
          ⚪
        </button>
        <button 
          className={`tool-btn ${activeTool === 'text' ? 'active' : ''}`}
          onClick={() => setActiveTool('text')}
          title="Texto (T)"
        >
          🔤
        </button>
        <div className="toolbar-divider" />
        <button 
          className={`tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
          onClick={() => setActiveTool('eraser')}
          title="Borrador (E)"
        >
          ❌
        </button>
      </div>

      {/* Tablero infinito transformado */}
      <div 
        className="canvas-infinite-board"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {/* Capa de Dibujo SVG */}
        <svg className="canvas-svg-layer">
          {cards.map(card => {
            if (card.type === 'rect') {
              const isSelected = activeTool === 'select' || activeTool === 'eraser';
              return (
                <rect
                  key={card.id}
                  x={card.x}
                  y={card.y}
                  width={card.width || 0}
                  height={card.height || 0}
                  fill="none"
                  stroke={card.color || '#4f46e5'}
                  strokeWidth="2.5"
                  style={{ pointerEvents: isSelected ? 'auto' : 'none', cursor: activeTool === 'eraser' ? 'pointer' : 'move' }}
                  onMouseDown={(e) => isSelected && handleCardDragStart(e, card)}
                />
              );
            }

            if (card.type === 'circle') {
              const isSelected = activeTool === 'select' || activeTool === 'eraser';
              const rx = (card.width || 0) / 2;
              const ry = (card.height || 0) / 2;
              const cx = card.x + rx;
              const cy = card.y + ry;
              return (
                <ellipse
                  key={card.id}
                  cx={cx}
                  cy={cy}
                  rx={rx}
                  ry={ry}
                  fill="none"
                  stroke={card.color || '#4f46e5'}
                  strokeWidth="2.5"
                  style={{ pointerEvents: isSelected ? 'auto' : 'none', cursor: activeTool === 'eraser' ? 'pointer' : 'move' }}
                  onMouseDown={(e) => isSelected && handleCardDragStart(e, card)}
                />
              );
            }

            if (card.type === 'draw' && card.points) {
              const isSelected = activeTool === 'select' || activeTool === 'eraser';
              const pathData = card.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${card.x + p.x} ${card.y + p.y}`).join(' ');
              return (
                <g key={card.id}>
                  {/* Trazo grueso invisible para facilitar click y arrastre */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="15"
                    style={{ pointerEvents: isSelected ? 'auto' : 'none', cursor: activeTool === 'eraser' ? 'pointer' : 'move' }}
                    onMouseDown={(e) => isSelected && handleCardDragStart(e, card)}
                  />
                  {/* Trazo visible */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={card.color || '#4f46e5'}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            }
            return null;
          })}
        </svg>

        {/* Capa de Tarjetas de React */}
        {cards.map(card => {
          const isFile = card.type === 'file';
          const isFolder = card.type === 'folder';
          const isNote = card.type === 'note';
          const isText = card.type === 'text';

          if (!isFile && !isFolder && !isNote && !isText) return null;

          return (
            <div
              key={card.id}
              className={`canvas-card ${card.type}-card ${draggedCardId === card.id ? 'dragging' : ''}`}
              style={{
                left: `${card.x}px`,
                top: `${card.y}px`,
                backgroundColor: isNote ? card.color : undefined
              }}
              onMouseDown={(e) => handleCardDragStart(e, card)}
              onDoubleClick={(e) => handleCardDoubleClick(e, card)}
            >
              {/* Botón de borrar tarjeta */}
              <button 
                className="card-delete-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  doc.transact(() => yCards.delete(card.id));
                }}
                title="Eliminar del lienzo"
              >
                ✖
              </button>

              {/* Contenido según tipo */}
              {isFile && (
                <div className="card-file-content">
                  <div 
                    className="mac-file-icon"
                    draggable={true}
                    onDragStart={(e) => handleHtml5DragStart(e, card)}
                    style={{ cursor: 'grab' }}
                    title="Arrastra este icono al chat para compartir"
                  >
                    📄
                  </div>
                  <div className="card-title" title={card.name}>{card.name}</div>
                  <div className="card-subtitle">{card.path?.split('/')[0] || ''}</div>
                  <div className="card-action-hint">Doble click para abrir</div>
                </div>
              )}

              {isFolder && (
                <div className="card-folder-content">
                  <div 
                    className="mac-file-icon"
                    draggable={true}
                    onDragStart={(e) => handleHtml5DragStart(e, card)}
                    style={{ cursor: 'grab' }}
                    title="Arrastra este icono al chat para compartir"
                  >
                    📁
                  </div>
                  <div className="card-title" title={card.name}>{card.name}</div>
                  <div className="card-subtitle">Carpeta</div>
                </div>
              )}

              {isNote && (
                <div className="card-note-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                  <div 
                    className="card-note-header"
                    draggable={true}
                    onDragStart={(e) => handleHtml5DragStart(e, card)}
                    style={{ 
                      cursor: 'grab', 
                      display: 'flex', 
                      justifyContent: 'center', 
                      width: '100%', 
                      marginBottom: '4px',
                      fontSize: '16px' 
                    }}
                    title="Arrastra el pin al chat para compartir la nota"
                  >
                    📌
                  </div>
                  <textarea
                    className="card-note-textarea"
                    value={card.text || ''}
                    onChange={(e) => handleNoteTextChange(card.id, e.target.value)}
                    placeholder="Escribe algo aquí..."
                    onMouseDown={(e) => e.stopPropagation()} // evitar paneo del lienzo
                  />
                </div>
              )}

              {isText && (
                <input
                  type="text"
                  className="card-text-input"
                  value={card.text || ''}
                  onChange={(e) => handleTextChange(card.id, e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()} // evitar paneo
                  style={{
                    fontSize: `${card.fontSize || 16}px`,
                    color: card.color || '#1e1e2e',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    width: 'auto',
                    minWidth: '100px',
                    fontWeight: 600
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Cursores Colaborativos (Punteros Láser) */}
        {otherUsers.map(user => (
          <div
            key={user.id}
            className="collaborative-cursor"
            style={{
              left: `${user.x}px`,
              top: `${user.y}px`
            }}
          >
            <div 
              className="laser-pointer-dot" 
              style={{ backgroundColor: user.color, boxShadow: `0 0 10px 4px ${user.color}` }} 
            />
            <div 
              className="laser-pointer-label" 
              style={{ backgroundColor: user.color }}
            >
              {user.name} {user.tool === 'pencil' ? '✏️' : user.tool === 'eraser' ? '❌' : ''}
            </div>
          </div>
        ))}
      </div>

      {/* Controles de Zoom */}
      <div className="canvas-controls">
        <button className="control-btn" onClick={() => setZoom(z => Math.min(z + 0.1, 4))}>＋</button>
        <div className="zoom-indicator">{Math.round(zoom * 100)}%</div>
        <button className="control-btn" onClick={() => setZoom(z => Math.max(z - 0.1, 0.15))}>－</button>
        <button className="control-btn reset-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reajustar</button>
      </div>

      <div className="canvas-help-badge">
        💡 {username}: Arrastra el fondo para desplazarte | Rueda del mouse para Zoom | Doble click en archivos
      </div>
    </div>
  );
};

export default Whiteboard;
