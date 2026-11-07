import { io, Socket } from 'socket.io-client';
import { SOCKET_SERVER_URL } from './config';

class SocketService {
  public socket: Socket | null = null;
  private isConnected = false;

  connect(): Socket {
    if (!this.socket) {
      console.log('[Socket] Connecting to real-time engine at:', SOCKET_SERVER_URL);
      this.socket = io(SOCKET_SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('[Socket] Connected successfully with ID:', this.socket?.id);
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false;
        console.log('[Socket] Disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.warn('[Socket] Connection attempt warning:', error.message);
      });
    }

    return this.socket;
  }

  getSocket(): Socket {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export const socketService = new SocketService();
export const socket = socketService.getSocket();
