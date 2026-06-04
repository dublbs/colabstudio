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

  const username = useMemo(() => {
    if (initialUsername) return initialUsername;
    const names = ['Pipe', 'Amaro', 'Colaborador-1', 'Colaborador-2'];
    return names[Math.floor(Math.random() * names.length)];
  }, [initialUsername]);

  const doc = useMemo(() => new Y.Doc(), [roomName]);

  const provider = useMemo(() => {
    const wsServerUrl = import.meta.env.VITE_YJS_WS_SERVER || 'wss://demos.yjs.dev/ws';
    console.log(`[Yjs] Conectando a ${wsServerUrl} | sala: ${roomName}`);
    try {
      return new WebsocketProvider(wsServerUrl, roomName, doc, { connect: true });
    } catch (e) {
      console.error('[Yjs] Error al conectar WebsocketProvider:', e);
      return null;
    }
  }, [doc, roomName]);

  useEffect(() => {
    if (!provider) return;

    const handleStatus = (event: { status: string }) => {
      setConnected(event.status === 'connected');
    };

    provider.on('status', handleStatus);
    
    // Sincronizar estado inmediato por si ya se conectó en localhost
    setConnected(provider.wsconnected);

    provider.awareness.setLocalStateField('user', {
      name: username,
      color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
    });

    return () => {
      provider.off('status', handleStatus);
      provider.disconnect();
      doc.destroy();
    };
  }, [provider, doc, username]);

  return { doc, provider, connected, username };
}
