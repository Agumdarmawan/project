import useSWR from 'swr';
import axios from 'axios';
import { authHeader, clearAuth, getAuth } from '../services/auth';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const fetcher = (url: string) => axios.get(url, { headers: { ...authHeader() } }).then((r) => r.data);

export default function AdminDashboard() {
  const { user } = getAuth();
  const navigate = useNavigate();
  const { data, mutate } = useSWR('/api/courses', fetcher);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [qr, setQr] = useState<{ courseId: string; dataUrl: string } | null>(null);

  async function createSession(courseId: string) {
    try {
      setLoadingId(courseId);
      const res = await axios.post(`/api/courses/${courseId}/sessions`, {}, { headers: { ...authHeader() } });
      setQr({ courseId, dataUrl: res.data.qrDataUrl });
      mutate();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{user?.role === 'SUPER_ADMIN' ? 'All Courses' : 'My Courses'}</h1>
        <div className="space-x-3">
          <span className="text-gray-600">{user?.name}</span>
          <button onClick={() => { clearAuth(); navigate('/login'); }} className="text-sm text-red-600">Logout</button>
        </div>
      </div>
      <div className="grid gap-4">
        {data?.courses?.map((course: any) => (
          <div key={course.id} className="border rounded p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{course.name}</div>
              {user?.role === 'SUPER_ADMIN' && (
                <div className="text-sm text-gray-600">Admin: {course.admin?.name || course.adminId}</div>
              )}
            </div>
            <button disabled={loadingId === course.id} onClick={() => createSession(course.id)} className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50">{loadingId === course.id ? 'Creating...' : 'Create QR'}</button>
          </div>
        ))}
      </div>
      {qr && (
        <div className="p-4 border rounded">
          <div className="font-medium mb-2">QR for course {qr.courseId}</div>
          <img src={qr.dataUrl} className="w-64 h-64"/>
        </div>
      )}
    </div>
  );
}