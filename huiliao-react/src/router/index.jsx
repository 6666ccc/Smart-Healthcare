import { createBrowserRouter, Navigate } from 'react-router-dom'
import Login from '../views/Login'
import Home from '../views/Home'
import User from '../views/User'
import Assistant from '../views/Assistant'
import Registration from '../views/Registration'
import RegistrationDetail from '../views/Registration/Detail'
import Department from '../views/Department'
import Payment from '../views/Payment'
import PaymentPay from '../views/Payment/Pay'
import Consultation from '../views/Consultation'
import Dispense from '../views/Dispense'
import PatientList from '../views/PatientList'
import ScheduleManage from '../views/ScheduleManage'
import DrugManage from '../views/DrugManage'
import { GuestOnly, RequireAuth } from './guards'

const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [
      { path: '/', element: <Login /> },
      { path: '/login', element: <Login /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/home', element: <Home /> },
      { path: '/user', element: <User /> },
      { path: '/assistant', element: <Assistant /> },
      { path: '/registration', element: <Registration /> },
      { path: '/registration/:id', element: <RegistrationDetail /> },
      { path: '/department', element: <Department /> },
      { path: '/payment', element: <Payment /> },
      { path: '/payment/:id', element: <PaymentPay /> },
      { path: '/consultation', element: <Consultation /> },
      { path: '/dispense', element: <Dispense /> },
      { path: '/patients', element: <PatientList /> },
      { path: '/schedules', element: <ScheduleManage /> },
      { path: '/drugs', element: <DrugManage /> },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
])

export default router
