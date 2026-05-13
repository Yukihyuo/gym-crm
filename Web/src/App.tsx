import Routes from './routes';
import LoginPage from './routes/login/page';
import { useAuthStore } from './store/authStore';
import { useSocketStore } from './store/socketStore'; // Importamos el store del socket
import { useEffect } from 'react';

export default function App() {
  const { isAuthenticated } = useAuthStore();
  const connect = useSocketStore((state) => state.connect);
  const disconnect = useSocketStore((state) => state.disconnect);

  // Vigilante del Socket: Se conecta al iniciar sesión y se limpia al salir
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
  }, [isAuthenticated, connect, disconnect]);

  return (
    <div>
      {isAuthenticated ? <Routes /> : <LoginPage />}
    </div>
  );
}