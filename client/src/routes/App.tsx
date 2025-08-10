import { Link, Navigate } from 'react-router-dom';
import { getAuth } from '../services/auth';

export default function App() {
  const { user } = getAuth();
  if (!user) return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">QR Attendance</h1>
      <Link to="/login" className="text-blue-600 underline">Login</Link>
    </div>
  );
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return <Navigate to="/admin" replace />;
  return <Navigate to="/user" replace />;
}