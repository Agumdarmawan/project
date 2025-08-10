import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  QrCode, 
  Plus, 
  Clock, 
  Calendar,
  Copy,
  Download
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const QRGenerator = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [duration, setDuration] = useState(3600);
  const [loading, setLoading] = useState(false);
  const [generatedQR, setGeneratedQR] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchActiveSessions();
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const response = await axios.get('/api/courses');
      setCourses(response.data.courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const response = await axios.get(`/api/qr/course/${selectedCourse}`);
      setActiveSessions(response.data.sessions);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    }
  };

  const generateQR = async (e) => {
    e.preventDefault();
    if (!selectedCourse || !sessionName) {
      toast.error('Please select a course and enter a session name');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/qr/generate', {
        courseId: selectedCourse,
        sessionName,
        duration
      });

      setGeneratedQR(response.data.qrCode);
      toast.success('QR code generated successfully!');
      fetchActiveSessions();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to generate QR code';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const copyQRData = () => {
    if (generatedQR) {
      navigator.clipboard.writeText(generatedQR.data);
      toast.success('QR data copied to clipboard!');
    }
  };

  const downloadQR = () => {
    if (generatedQR) {
      const link = document.createElement('a');
      link.href = generatedQR.image;
      link.download = `qr_${sessionName}_${Date.now()}.png`;
      link.click();
    }
  };

  const deactivateQR = async (qrCodeId) => {
    try {
      await axios.put(`/api/qr/deactivate/${qrCodeId}`);
      toast.success('QR code deactivated successfully!');
      fetchActiveSessions();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to deactivate QR code';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QR Code Generator</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate QR codes for attendance sessions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generate QR Form */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Generate New QR Code</h3>
          </div>
          <div className="card-body">
            <form onSubmit={generateQR} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session Name
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="input"
                  placeholder="e.g., Week 1 Lecture, Midterm Review"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="input"
                  min="300"
                  max="7200"
                  placeholder="3600 (1 hour)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum: 5 minutes (300s), Maximum: 2 hours (7200s)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate QR Code
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Generated QR Display */}
        {generatedQR && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Generated QR Code</h3>
            </div>
            <div className="card-body text-center">
              <div className="mb-4">
                <img
                  src={generatedQR.image}
                  alt="Generated QR Code"
                  className="mx-auto max-w-xs border rounded-lg"
                />
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p><strong>Course:</strong> {courses.find(c => c.id == selectedCourse)?.name}</p>
                <p><strong>Session:</strong> {generatedQR.sessionName}</p>
                <p><strong>Expires:</strong> {new Date(generatedQR.expiresAt).toLocaleString()}</p>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={copyQRData}
                  className="btn-secondary flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Data
                </button>
                <button
                  onClick={downloadQR}
                  className="btn-secondary flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Sessions */}
      {selectedCourse && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Active Sessions</h3>
          </div>
          <div className="card-body">
            {activeSessions.length > 0 ? (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Session
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Start Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        End Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeSessions.map((session) => (
                      <tr key={session.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {session.session_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(session.start_time).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(session.end_time).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="badge-success">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => deactivateQR(session.qr_code_id)}
                            className="btn-danger"
                          >
                            Deactivate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <QrCode className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No active sessions</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Generate a QR code to start a new session.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QRGenerator;