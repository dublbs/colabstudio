import { useEffect, useState, useMemo } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export interface YjsSession {
  doc: Y.Doc;
  provider: WebsocketProvider | null;
  connected: boolean;
  username: string;
}

export function useYjs(roomName: string, initialUsername?: string): YjsSession {
  const [connected, setConnected] = useState(false);
  
  // Seteamos un nombre de usuario por defecto
  const username = useMemo(() => {
    if (initialUsername) return initialUsername;
    const names = ['Pipe', 'Amaro', 'Colaborador-1', 'Colaborador-2'];
    return names[Math.floor(Math.random() * names.length)];
  }, [initialUsername]);

  const doc = useMemo(() => new Y.Doc(), []);

  const provider = useMemo(() => {
    const wsServerUrl = import.meta.env.VITE_YJS_WS_SERVER || 'wss://demos.yjs.dev/ws';
    console.log(`Conectando a Yjs WS en: ${wsServerUrl} para la sala ${roomName}`);
    
    try {
      const wsProvider = new WebsocketProvider(wsServerUrl, roomName, doc, {
        connect: true
      });
      return wsProvider;
    } catch (e) {
      console.error('Error al inicializar WebsocketProvider:', e);
      return null;
    }
  }, [doc, roomName]);

  useEffect(() => {
    if (!provider) return;

    const handleStatus = (event: { status: string }) => {
      console.log('Estado de conexión Yjs:', event.status);
      setConnected(event.status === 'connected');
    };

    provider.on('status', handleStatus);

    // Configurar Awareness (Presencia)
    provider.awareness.setLocalStateField('user', {
      name: username,
      color: '#' + Math.floor(Math.random()*16777215).toString(16) // Color aleatorio para cursores
    });

    return () => {
      provider.off('status', handleStatus);
      provider.disconnect();
      doc.destroy();
    };
  }, [provider, doc, username]);

  return {
    doc,
    provider,
    connected,
    username
  };
}
