import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store'

export function useLogout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return async () => {
    await logout()
    navigate('/login', { replace: true })
  }
}
