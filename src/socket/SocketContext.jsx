import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Netlify gibi ortamlarda backend URL'ini .env icindeki VITE_SOCKET_URL'den okuyoruz.
    // Ornek: VITE_SOCKET_URL=https://replikk-backend.onrender.com
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL || window.location.origin;

    const s = io(socketUrl, {
      transports: ['websocket']
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}

