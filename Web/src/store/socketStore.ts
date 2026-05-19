import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './authStore';

// Definimos la interfaz para el tipado de TypeScript
interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  
  // Acciones
  connect: () => void;
  disconnect: () => void;
  emitEvent: (event: string, data?: unknown) => void;
  onEvent: (event: string, callback: () => void) => () => void;
  onEventWithData: <T = unknown>(event: string, callback: (data: T) => void) => () => void;
  
  // Helpers específicos para el sistema de huellas
  joinTerminal: (terminalUuid: string) => void;
  leaveTerminal: (terminalUuid: string) => void;
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: () => {
    // 1. Obtenemos los datos directamente del AuthStore
    const userId = useAuthStore.getState().getUserId();
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    
    // Si no hay usuario o no está autenticado, no conectamos
    if (!userId || !isAuthenticated) {
      console.warn("Socket.io: Intento de conexión sin usuario autenticado.");
      return;
    }

    // Si ya existe una instancia conectada, evitamos duplicados
    if (get().socket?.connected) return;

    // URL de tu API (Asegúrate de configurar tu variable de entorno)
    const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const socketInstance = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    // --- Manejadores de Eventos ---
    socketInstance.on('connect', () => {
      console.log('✅ Socket.io: Conectado. ID:', socketInstance.id);
      set({ isConnected: true });
      
      // Vinculamos el socket con el ID del usuario para notificaciones generales
      socketInstance.emit('setSessionId', userId);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Socket.io: Desconectado.');
      set({ isConnected: false });
    });

    socketInstance.on('connect_error', (err) => {
      console.error('⚠️ Socket.io Error de conexión:', err.message);
    });

    set({ socket: socketInstance });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  emitEvent: (event: string, data?: unknown) => {
    const { socket } = get();
    if (!socket || !event) {
      return;
    }

    if (typeof data === 'undefined') {
      socket.emit(event);
      return;
    }

    socket.emit(event, data);
  },

  onEvent: (event: string, callback: () => void) => {
    const { socket } = get();
    if (!socket || !event || typeof callback !== 'function') {
      return () => {};
    }

    socket.on(event, callback);

    // Devolvemos cleanup para poder desuscribir fácilmente.
    return () => {
      socket.off(event, callback);
    };
  },

  onEventWithData: <T = unknown>(event: string, callback: (data: T) => void) => {
    const { socket } = get();
    if (!socket || !event || typeof callback !== 'function') {
      return () => {};
    }

    socket.on(event, callback as (...args: unknown[]) => void);

    // Devolvemos cleanup para poder desuscribir fácilmente.
    return () => {
      socket.off(event, callback as (...args: unknown[]) => void);
    };
  },

  joinTerminal: (terminalUuid: string) => {
    const { socket } = get();
    if (socket && terminalUuid) {
      socket.emit('joinTerminalRoom', terminalUuid);
      console.log(`📡 Sintonizando terminal: ${terminalUuid}`);
    }
  },

  leaveTerminal: (terminalUuid: string) => {
    const { socket } = get();
    if (socket) {
      socket.emit('leaveTerminalRoom', terminalUuid);
    }
  }
}));