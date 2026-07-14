import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './store'
import { router } from './router'

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
