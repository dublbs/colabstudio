import React, { useEffect, useState, useRef } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import * as Y from 'yjs';
import './Whiteboard.css';

interface WhiteboardProps {
  doc: Y.Doc;
  username: string;
}

export const Whiteboard: React.FC<WhiteboardProps> = ({ doc, username }) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const elementsMap = doc.getMap('excalidraw-elements');
  const isRemoteUpdate = useRef(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!excalidrawAPI) return;

    const appState = excalidrawAPI.getAppState();
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Calcular coordenadas relativas a la pizarra Excalidraw
    const clientX = e.clientX;
    const clientY = e.clientY;
    const dropX = (clientX - rect.left - appState.scrollX) / appState.zoom.value;
    const dropY = (clientY - rect.top - appState.scrollY) / appState.zoom.value;

    let dropText = '';
    
    // Obtener datos si es un archivo arrastrado desde Sidebar
    const fileData = e.dataTransfer.getData('application/colab-file');
    if (fileData) {
      const file = JSON.parse(fileData);
      dropText = `${file.type === 'folder' ? '📁' : '📄'} ${file.name}\n(${file.path})`;
    } else {
      // Obtener datos si es texto plano (como un mensaje de chat)
      const textData = e.dataTransfer.getData('text/plain');
      if (textData) {
        dropText = textData;
      }
    }

    if (!dropText) return;

    const id = 'text-' + Math.random().toString(36).substr(2, 9);
    const textElement = {
      id,
      type: 'text',
      x: dropX,
      y: dropY,
      width: 200,
      height: 50,
      angle: 0,
      strokeColor: '#4f46e5',
      backgroundColor: 'transparent',
      fillStyle: 'hachure',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: Math.floor(Math.random() * 100000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 100000),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      text: dropText,
      fontSize: 16,
      fontFamily: 1,
      textAlign: 'left',
      verticalAlign: 'top',
      baseline: 15,
      containerId: null,
      originalText: dropText,
      lastEditedBy: username
    };

    doc.transact(() => {
      elementsMap.set(id, textElement);
    });

    // Actualizar la escena local de inmediato
    excalidrawAPI.updateScene({
      elements: [...excalidrawAPI.getSceneElements(), textElement]
    });
  };

  // Sincronizar cambios remotos de Yjs hacia Excalidraw
  useEffect(() => {
    if (!excalidrawAPI) return;

    const handleObserve = (event: Y.YMapEvent<any>) => {
      // Ignorar actualizaciones locales para que no interrumpan el dibujo del usuario
      if (event.transaction.local) return;

      isRemoteUpdate.current = true;
      const elements: any[] = Array.from(elementsMap.values());
      
      // Actualizamos solo si hay elementos o cambios
      excalidrawAPI.updateScene({
        elements: elements.filter(el => !el.isDeleted)
      });
      
      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 50);
    };

    elementsMap.observe(handleObserve);

    // Carga inicial
    const initialElements: any[] = Array.from(elementsMap.values());
    if (initialElements.length > 0) {
      excalidrawAPI.updateScene({
        elements: initialElements.filter(el => !el.isDeleted)
      });
    }

    return () => {
      elementsMap.unobserve(handleObserve);
    };
  }, [excalidrawAPI, doc]);

  // Sincronizar cambios locales de Excalidraw hacia Yjs
  const onChange = (elements: readonly any[], _appState: any) => {
    if (isRemoteUpdate.current || !excalidrawAPI) return;

    // Transacción de Yjs para agrupar las actualizaciones
    doc.transact(() => {
      elements.forEach((element) => {
        const existing = elementsMap.get(element.id) as any;
        // Solo actualizar si el elemento cambió o no existe
        if (!existing || existing.version !== element.version) {
          elementsMap.set(element.id, {
            ...element,
            // Guardamos quién editó
            lastEditedBy: username
          });
        }
      });
    });
  };

  return (
    <div 
      className="whiteboard-wrapper"
      onDragOverCapture={(e) => e.preventDefault()}
      onDropCapture={handleDrop}
    >
      <Excalidraw
        excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
        onChange={onChange}
        theme="light"
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
            clearCanvas: true
          }
        }}
      />
    </div>
  );
};
