import useSWR from 'swr';
import axios from 'axios';
import { authHeader, clearAuth, getAuth } from '../services/auth';
import { Link, useNavigate } from 'react-router-dom';

const fetcher = (url: string) => axios.get(url, { headers: { ...authHeader() } }).then((r) => r.data);

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user } = getAuth();
  const { data } = useSWR('/api/my/courses', fetcher);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Courses</h1>
        <div className="space-x-3">
          <span className="text-gray-600">{user?.name}</span>
          <button onClick={() => { clearAuth(); navigate('/login'); }} className="text-sm text-red-600">Logout</button>
        </div>
      </div>
      <div className="grid gap-4">
        {data?.courses?.map((c: any) => (
          <div key={c.course.id} className="border rounded p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{c.course.name}</div>
              <div className="text-sm text-gray-600">{c.attended} / {c.maxAttendances} attended</div>
            </div>
            <Link to={`/checkin`} className="px-3 py-1 bg-green-600 text-white rounded">Scan QR</Link>
          </div>
        ))}
      </div>
    </div>
  );
}