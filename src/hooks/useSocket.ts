import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = (orderId?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    // 连接到我们的 Custom Server
    const socketInstance = io({
      path: '/api/socket/io',
      addTrailingSlash: false,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      // 连接成功后立即加入房间
      socketInstance.emit('join_room', orderId);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [orderId]);

  return { socket, isConnected };
};
