import { io, Socket } from 'socket.io-client';
import { SERVER_URL } from './config';

class SocketService {
  public socket: Socket | null = null;
  private isConnected = false;

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('[Socket] Connected with ID:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        console.log('[Socket] Disconnected');
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
