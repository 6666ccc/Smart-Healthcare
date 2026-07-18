import { createBrowserRouter, Navigate } from 'react-router-dom'
import { GuestOnly, RequireAuth, RequirePortal } from './guards'
import Login from '../views/Login'
import Registration from '../views/Registration'
import RegistrationDetail from '../views/Registration/Detail'
import Department from '../views/Department'
import Payment from '../views/Payment'
import PaymentPay from '../views/Payment/Pay'
import User from '../views/User'
import Assistant from '../views/Assistant'
import DoctorHome from '../views/doctor/Home'
import DoctorQueue from '../views/doctor/Queue'
import DoctorConsultation from '../views/doctor/Consultation'

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
        element: <RequirePortal portal="patient" />,
        children: [
          { path: '/home',             element: <Navigate to="/assistant" replace /> },
          { path: '/user',             element: <User /> },
          { path: '/assistant',        element: <Assistant /> },
          { path: '/registration',     element: <Registration /> },
          { path: '/registration/:id', element: <RegistrationDetail /> },
          { path: '/department',       element: <Department /> },
          { path: '/payment',          element: <Payment /> },
          { path: '/payment/:id',      element: <PaymentPay /> },
        ],
      },
      {
        element: <RequirePortal portal="doctor" />,
        children: [
          { path: '/doctor/home',                    element: <DoctorHome /> },
          { path: '/doctor/queue',                   element: <DoctorQueue /> },
          { path: '/doctor/consultation/:visitId',  element: <DoctorConsultation /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
])
