/**
 * LINE QR Code Card Component
 * 
 * Task 4.3.5: Display LINE OA QR code for user registration
 * Shows QR code that users can scan to add the LINE Official Account
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Button } from '@/shared/components/ui/button';
import { Download, ExternalLink, RefreshCw } from 'lucide-react';
import { apiClient } from '@/shared/lib/api-client';

interface LineConfig {
  qrCodeUrl: string;
  lineOaId: string;
  addFriendUrl: string;
}

export function LineQRCodeCard() {
  const [config, setConfig] = useState<LineConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/api/line/config');
      setConfig(response.data as LineConfig);
    } catch (err: any) {
      console.error('Error fetching LINE config:', err);
      setError(err.response?.data?.message || 'ไม่สามารถโหลดข้อมูล LINE QR Code ได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleDownloadQR = () => {
    if (!config?.qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = config.qrCodeUrl;
    link.download = `LINE-QR-${config.lineOaId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenLineApp = () => {
    if (!config?.addFriendUrl) return;
    window.open(config.addFriendUrl, '_blank');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>LINE Official Account QR Code</CardTitle>
          <CardDescription>สแกน QR Code เพื่อเพิ่มเพื่อนและลงทะเบียน</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-64 w-64 mx-auto" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>LINE Official Account QR Code</CardTitle>
          <CardDescription>สแกน QR Code เพื่อเพิ่มเพื่อนและลงทะเบียน</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={fetchConfig} 
            variant="outline" 
            className="mt-4 w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            ลองใหม่อีกครั้ง
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>LINE Official Account QR Code</CardTitle>
        <CardDescription>
          สแกน QR Code เพื่อเพิ่มเพื่อนและลงทะเบียนใช้งานผ่าน LINE
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* QR Code Image */}
        <div className="flex justify-center">
          <div className="relative">
            <img
              src={config.qrCodeUrl}
              alt="LINE Official Account QR Code"
              className="w-64 h-64 border-2 border-gray-200 rounded-lg shadow-md"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder.svg';
                setError('ไม่สามารถโหลด QR Code ได้');
              }}
            />
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
              LINE OA
            </div>
          </div>
        </div>

        {/* LINE OA ID */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">LINE Official Account ID</p>
          <p className="text-lg font-mono font-semibold text-gray-900">
            @{config.lineOaId}
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">วิธีการลงทะเบียน:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>สแกน QR Code ด้วยแอป LINE</li>
            <li>กดปุ่ม "เพิ่มเพื่อน" (Add Friend)</li>
            <li>ส่งข้อความ "ลงทะเบียน" หรือ "REGISTER"</li>
            <li>ทำตามขั้นตอนที่ระบบแจ้ง</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleDownloadQR}
            variant="outline"
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            ดาวน์โหลด QR
          </Button>
          <Button
            onClick={handleOpenLineApp}
            variant="default"
            className="w-full bg-green-500 hover:bg-green-600"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            เปิดใน LINE
          </Button>
        </div>

        {/* Additional Info */}
        <div className="text-xs text-gray-500 text-center pt-2 border-t">
          <p>QR Code นี้สามารถแชร์ให้ผู้ใช้งานเพื่อลงทะเบียนได้</p>
          <p className="mt-1">ผู้ใช้จะต้องมีบัญชีในระบบก่อนจึงจะสามารถลงทะเบียนผ่าน LINE ได้</p>
        </div>
      </CardContent>
    </Card>
  );
}
