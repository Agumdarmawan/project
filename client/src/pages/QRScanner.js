import React, { useState, useEffect } from 'react';
import { QrReader } from 'react-qr-reader';
import axios from 'axios';
import toast from 'react-hot-toast';
import { QrCode, CheckCircle, XCircle, Camera, AlertCircle } from 'lucide-react';

const QRScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleScan = async (data) => {
    if (data && !loading) {
      setLoading(true);
      setError(null);
      
      try {
        // First, get QR code info
        const infoResponse = await axios.get(`/api/qr/info/${data}`);
        const qrInfo = infoResponse.data.qrCode;

        // Then mark attendance
        const attendanceResponse = await axios.post('/api/attendance/check-in', {
          qrData: data,
          location: 'Web Scanner',
          deviceInfo: navigator.userAgent
        });

        setResult({
          success: true,
          courseName: qrInfo.courseName,
          sessionName: qrInfo.sessionName,
          checkInTime: attendanceResponse.data.attendance.checkInTime
        });

        toast.success('Attendance marked successfully!');
        setScanning(false);
      } catch (error) {
        const message = error.response?.data?.error || 'Failed to mark attendance';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleError = (err) => {
    console.error('QR Scanner error:', err);
    setError('Failed to access camera. Please check permissions.');
  };

  const resetScanner = () => {
    setResult(null);
    setError(null);
    setScanning(true);
  };

  useEffect(() => {
    setScanning(true);
  }, []);

  if (result) {
    return (
      <div className="max-w-md mx-auto">
        <div className="card">
          <div className="card-body text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Attendance Marked Successfully!
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Course:</strong> {result.courseName}</p>
              {result.sessionName && <p><strong>Session:</strong> {result.sessionName}</p>}
              <p><strong>Time:</strong> {new Date(result.checkInTime).toLocaleString()}</p>
            </div>
            <button
              onClick={resetScanner}
              className="btn-primary mt-6"
            >
              Scan Another QR Code
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">QR Code Scanner</h3>
          <p className="mt-1 text-sm text-gray-500">
            Point your camera at a QR code to mark your attendance
          </p>
        </div>
        <div className="card-body">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <XCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {scanning && (
            <div className="relative">
              <QrReader
                onResult={handleScan}
                constraints={{ facingMode: 'environment' }}
                className="w-full"
              />
              {loading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white p-4 rounded-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Processing...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Make sure the QR code is clearly visible in the camera view
            </p>
          </div>

          {!scanning && !result && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setScanning(true)}
                className="btn-primary"
              >
                <Camera className="h-4 w-4 mr-2" />
                Start Scanner
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 card">
        <div className="card-body">
          <h4 className="text-sm font-medium text-gray-900 mb-3">How to use:</h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start">
              <span className="flex-shrink-0 h-2 w-2 bg-primary-500 rounded-full mt-2 mr-3"></span>
              Ensure you're enrolled in the course for the QR code
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 h-2 w-2 bg-primary-500 rounded-full mt-2 mr-3"></span>
              Point your camera at the QR code displayed by your instructor
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 h-2 w-2 bg-primary-500 rounded-full mt-2 mr-3"></span>
              Hold steady until the code is scanned
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 h-2 w-2 bg-primary-500 rounded-full mt-2 mr-3"></span>
              You'll receive confirmation once attendance is marked
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;