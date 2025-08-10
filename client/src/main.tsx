import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import App from './routes/App';
import Login from './routes/Login';
import UserDashboard from './routes/UserDashboard';
import AdminDashboard from './routes/AdminDashboard';
import CheckInScanner from './routes/CheckInScanner';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/login', element: <Login /> },
  { path: '/user', element: <UserDashboard /> },
  { path: '/admin', element: <AdminDashboard /> },
  { path: '/checkin', element: <CheckInScanner /> },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
