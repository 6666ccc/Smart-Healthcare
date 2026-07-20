import { createBrowserRouter, Navigate } from 'react-router-dom'
import { GuestOnly, RequireAuth, RequirePatient } from './guards'
import Home from '../views/Home'
import Login from '../views/Login'
import Registration from '../views/Registration'
import RegistrationDetail from '../views/Registration/Detail'
import Department from '../views/Department'
import Payment from '../views/Payment'
import PaymentPay from '../views/Payment/Pay'
import User from '../views/User'
import Assistant from '../views/Assistant'
import ModeSelect from '../views/ModeSelect'

export const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [
      { path: '/',       element: <Login /> },
      { path: '/login',  element: <Login /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequirePatient />,
        children: [
          { path: '/mode-select',      element: <ModeSelect /> },
          { path: '/home',             element: <Home /> },
          { path: '/user',             element: <User /> },
          { path: '/assistant',        element: <Assistant /> },
          { path: '/registration',     element: <Registration /> },
          { path: '/registration/:id', element: <RegistrationDetail /> },
          { path: '/department',       element: <Department /> },
          { path: '/payment',          element: <Payment /> },
          { path: '/payment/:id',      element: <PaymentPay /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
])
