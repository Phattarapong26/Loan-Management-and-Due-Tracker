/**
 * Demo component to showcase the Center Alert
 * This is for development/testing purposes only
 */

import { Button } from './button';
import { useCenterAlert } from '@/shared/hooks/useCenterAlert';

export function CenterAlertDemo() {
  const { showSuccess, showError, showWarning, showInfo, AlertComponent } = useCenterAlert();

  return (
    <div className="p-8 space-y-4">
      {AlertComponent}
      
      <h2 className="text-2xl font-bold mb-4">Center Alert Demo</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={() => showSuccess('บันทึกข้อมูลสำเร็จ')}
          className="bg-green-600 hover:bg-green-700"
        >
          Show Success
        </Button>
        
        <Button
          onClick={() => showError('อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง')}
          className="bg-red-600 hover:bg-red-700"
        >
          Show Error
        </Button>
        
        <Button
          onClick={() => showWarning('กรุณาตรวจสอบข้อมูลก่อนบันทึก')}
          className="bg-yellow-600 hover:bg-yellow-700"
        >
          Show Warning
        </Button>
        
        <Button
          onClick={() => showInfo('ระบบจะทำการบันทึกข้อมูลอัตโนมัติทุก 5 นาที')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Show Info
        </Button>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">API Error Examples:</h3>
        <div className="space-y-2">
          <Button
            onClick={() => showError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง')}
            variant="outline"
            className="w-full justify-start"
          >
            401 - Session Expired
          </Button>
          <Button
            onClick={() => showError('คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้')}
            variant="outline"
            className="w-full justify-start"
          >
            403 - Permission Denied
          </Button>
          <Button
            onClick={() => showError('ไม่พบข้อมูลที่ต้องการ')}
            variant="outline"
            className="w-full justify-start"
          >
            404 - Not Found
          </Button>
          <Button
            onClick={() => showError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต')}
            variant="outline"
            className="w-full justify-start"
          >
            Network Error
          </Button>
        </div>
      </div>
    </div>
  );
}
