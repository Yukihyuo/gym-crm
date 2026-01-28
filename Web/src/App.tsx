import Routes from './routes';
import LoginPage from './routes/login/page';
import { useAuthStore } from './store/authStore'

export default function App() {
  const { isAuthenticated } = useAuthStore();
  return (
    <div>
      {
        isAuthenticated ? <Routes /> : <LoginPage />
      }
    </div>
  )
}
