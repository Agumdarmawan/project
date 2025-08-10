import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { authHeader } from '../services/auth';

function getTokenFromUrl(): string | null {
  const url = new URL(window.location.href);
  return url.searchParams.get('token');
}

export default function CheckInScanner() {
  const [result, setResult] = useState<string | null>(null);
  const divId = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const token = getTokenFromUrl();
    if (token) {
      // Token came from QR link (deep link)
      axios.post('/api/attendance/checkin', { token }, { headers: { ...authHeader() } })
        .then((r) => setResult('Checked in successfully'))
        .catch((e) => setResult(e?.response?.data?.error || 'Check-in failed'));
      return;
    }

    const scanner = new Html5QrcodeScanner(divId.current, { fps: 10, qrbox: 250 });
    scanner.render(async (decodedText) => {
      try {
        const url = new URL(decodedText);
        const token = url.searchParams.get('token') || decodedText;
        const res = await axios.post('/api/attendance/checkin', { token }, { headers: { ...authHeader() } });
        setResult('Checked in successfully');
        scanner.clear();
      } catch (e: any) {
        setResult(e?.response?.data?.error || 'Check-in failed');
      }
    }, (err) => {
      // ignore errors
    });
    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Scan QR to Check In</h1>
      {result ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded">{result}</div>
      ) : (
        <div id={divId.current} />
      )}
    </div>
  );
}