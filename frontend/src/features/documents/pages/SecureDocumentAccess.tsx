/**
 * Secure Document Access Page
 * 
 * Password-protected document access using last 4 digits of ID card
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface TokenInfo {
  documentType: string;
  businessName: string;
  expiresAt: string;
}

export const SecureDocumentAccess: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchTokenInfo();
    }
  }, [token]);

  const getApiBaseUrl = () => {
    // Priority 1: explicit VITE_BACKEND_URL (set in Railway/production env)
    const backendUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;
    if (backendUrl && !backendUrl.includes('localhost') && !backendUrl.includes('127.0.0.1')) {
      return backendUrl.replace(/\/+$/, '');
    }
    // Priority 2: VITE_API_BASE_URL
    const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
      return configured.replace(/\/+$/, '');
    }
    // Priority 3: VITE_API_URL
    const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
    if (apiUrl && !apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
      return apiUrl.replace(/\/+$/, '');
    }
    // Fallback: window.location.origin (works in normal browser, may be frontend URL in LINE browser)
    return window.location.origin;
  };

  const apiFetch = async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const baseUrl = getApiBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
        ...init,
      });

      clearTimeout(timeoutId);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          (typeof body?.error === 'string' ? body.error : null) ||
          body?.error?.message ||
          body?.message ||
          (typeof body === 'string' ? body : null) ||
          `HTTP ${response.status}`;
        const error: any = new Error(message);
        error.status = response.status;
        error.body = body;
        throw error;
      }

      return (body?.data ?? body) as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง');
      }
      throw err;
    }
  };

  const fetchTokenInfo = async () => {
    try {
      const info = await apiFetch<TokenInfo>(`/api/secure-documents/${token}/info`);
      setTokenInfo(info);
    } catch (err: any) {
      setError(err?.message || 'ลิงก์ไม่ถูกต้องหรือหมดอายุ');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length !== 4) {
      toast.error('กรุณากรอกรหัสผ่าน 4 หลัก');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const debugUrl = getApiBaseUrl();
      console.log('[SecureDoc] API base URL:', debugUrl);

      // ใช้ fetch โดยตรงเพื่อจัดการ 401 (รหัสผิด) แยกจาก error อื่น
      const baseUrl = getApiBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let response: Response;
      try {
        response = await fetch(`${baseUrl}/api/secure-documents/validate`, {
          method: 'POST',
          credentials: 'include',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password }),
        });
        clearTimeout(timeoutId);
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        if (fetchErr.name === 'AbortError') throw new Error('การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง');
        throw fetchErr;
      }

      const body = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 400) {
        // รหัสผิด หรือ validation error — แสดง error ชัดเจน
        const msg = (typeof body?.error === 'string' ? body.error : null)
          || body?.error?.message
          || body?.message
          || 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
        setError(msg);
        toast.error(msg);
        return;
      }

      if (!response.ok) {
        throw new Error(body?.message || `เกิดข้อผิดพลาด (${response.status})`);
      }

      const result = body?.data ?? body;

      if (result.success || result.documentUrl) {
        toast.success('ยืนยันตัวตนสำเร็จ');
        const viewUrl = `${baseUrl}/api/secure-documents/${token}/view?password=${encodeURIComponent(password)}`;
        window.open(viewUrl, '_self');
      } else {
        const msg = result.error || 'ไม่สามารถเข้าถึงเอกสารได้';
        setError(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'ใบแจ้งหนี้';
      case 'receipt':
        return 'ใบเสร็จรับเงิน';
      case 'contract':
        return 'สัญญา';
      default:
        return 'เอกสาร';
    }
  };

  if (error && !tokenInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">ไม่สามารถเข้าถึงเอกสาร</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ยืนยันตัวตนเพื่อเข้าถึงเอกสาร
          </h1>
          {tokenInfo && (
            <div className="text-sm text-gray-600 space-y-1">
              <p className="font-medium">{getDocumentTypeLabel(tokenInfo.documentType)}</p>
              <p>{tokenInfo.businessName}</p>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">🔒 เอกสารนี้ได้รับการปกป้อง</p>
              <p>กรุณากรอกเลขบัตรประชาชน 4 ตัวท้ายเพื่อยืนยันตัวตน</p>
            </div>
          </div>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              เลขบัตรประชาชน 4 ตัวท้าย
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPassword(value);
              }}
              maxLength={4}
              pattern="[0-9]{4}"
              placeholder="••••"
              className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-500 text-center">
              ตัวอย่าง: หากบัตรประชาชนของคุณคือ 1-2345-67890-12-3 ให้กรอก 1234
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || password.length !== 4}
            className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                กำลังตรวจสอบ...
              </span>
            ) : (
              'ยืนยันและเข้าถึงเอกสาร'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-2">
            <p className="flex items-center justify-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              ข้อมูลของคุณได้รับการเข้ารหัสและปกป้องอย่างปลอดภัย
            </p>
            {tokenInfo && (
              <p className="text-center">
                {(() => {
                  try {
                    const d = new Date(tokenInfo.expiresAt);
                    if (isNaN(d.getTime())) return null;
                    return `ลิงก์นี้จะหมดอายุในวันที่ ${d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`;
                  } catch { return null; }
                })()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
