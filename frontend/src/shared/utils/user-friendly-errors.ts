/**
 * User-Friendly Error Handler
 * Converts technical errors to user-friendly messages with actionable steps
 */

export interface UserFriendlyError {
  title: string;
  description: string;
  steps?: string[];
  type?: 'error' | 'warning' | 'info';
}

/**
 * Convert technical errors to user-friendly messages
 */
export function getUserFriendlyErrorMessage(error: any): UserFriendlyError {
  const errorMessage = error?.message || error?.toString() || '';
  
  // Check for specific error patterns and return user-friendly messages
  if (errorMessage.includes('กรุณากรอกข้อมูลให้ครบถ้วน') || errorMessage.includes('required')) {
    return {
      title: 'ข้อมูลไม่ครบถ้วน',
      description: 'ระบบตรวจพบว่าข้อมูลบางส่วนในเอกสารยังไม่ครบถ้วน กรุณาตรวจสอบและเพิ่มข้อมูลที่จำเป็น',
      steps: [
        'ตรวจสอบชื่อบริษัท/ร้านค้าให้ครบถ้วน',
        'ใส่เลขประจำตัวผู้เสียภาษี (13 หลัก)',
        'ระบุเบอร์โทรศัพท์ติดต่อ',
        'เพิ่มที่อยู่ของธุรกิจ',
        'กดบันทึกอีกครั้งหลังจากแก้ไขข้อมูล'
      ],
      type: 'warning'
    };
  }
  
  if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
    return {
      title: 'ข้อมูลซ้ำในระบบ',
      description: 'ลูกค้านี้มีอยู่ในระบบแล้ว กรุณาเลือกผูกเอกสารกับลูกค้าที่มีอยู่แทน',
      steps: [
        'คลิกปุ่ม "ผูกกับลูกค้าที่มีอยู่"',
        'เลือกลูกค้าจากรายการ',
        'กดยืนยันเพื่อผูกเอกสาร'
      ],
      type: 'info'
    };
  }
  
  if (errorMessage.includes('permission') || errorMessage.includes('access')) {
    return {
      title: 'ไม่มีสิทธิ์เข้าถึง',
      description: 'คุณไม่มีสิทธิ์ในการสร้างลูกค้าใหม่ กรุณาติดต่อผู้ดูแลระบบ',
      steps: [
        'ติดต่อผู้จัดการสาขาหรือผู้ดูแลระบบ',
        'ขอสิทธิ์ในการสร้างลูกค้าใหม่',
        'หรือให้ผู้ที่มีสิทธิ์ช่วยสร้างลูกค้าให้'
      ],
      type: 'error'
    };
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
    return {
      title: 'ปัญหาการเชื่อมต่อ',
      description: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
      steps: [
        'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
        'รอสักครู่แล้วลองใหม่อีกครั้ง',
        'หากยังไม่ได้ กรุณาติดต่อฝ่าย IT'
      ],
      type: 'error'
    };
  }
  
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return {
      title: 'ข้อมูลไม่ถูกต้อง',
      description: 'ข้อมูลที่กรอกไม่ถูกต้องตามรูปแบบที่กำหนด กรุณาตรวจสอบและแก้ไข',
      steps: [
        'ตรวจสอบรูปแบบเลขประจำตัวผู้เสียภาษี (13 หลัก)',
        'ตรวจสอบรูปแบบเบอร์โทรศัพท์ (10 หลัก)',
        'ตรวจสอบรูปแบบอีเมล (ถ้ามี)',
        'แก้ไขข้อมูลให้ถูกต้องแล้วลองใหม่'
      ],
      type: 'warning'
    };
  }
  
  // Default user-friendly message for unknown errors
  return {
    title: 'เกิดข้อผิดพลาด',
    description: 'ระบบไม่สามารถบันทึกข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
    steps: [
      'ตรวจสอบข้อมูลที่กรอกให้ครบถ้วน',
      'ลองบันทึกอีกครั้งในอีกสักครู่',
      'หากยังไม่ได้ กรุณาติดต่อฝ่าย IT พร้อมแจ้งรายละเอียดที่เกิดขึ้น'
    ],
    type: 'error'
  };
}

/**
 * Show user-friendly error dialog
 */
export function showUserFriendlyError(error: any): void {
  const userFriendlyMessage = getUserFriendlyErrorMessage(error);
  
  // Get icon and colors based on type
  const typeConfig = {
    error: {
      bgColor: 'bg-red-100',
      textColor: 'text-red-600',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path>`
    },
    warning: {
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-600',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path>`
    },
    info: {
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>`
    }
  };
  
  const config = typeConfig[userFriendlyMessage.type || 'error'];
  
  // Create and show error dialog
  const errorDialog = document.createElement('div');
  errorDialog.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50';
  errorDialog.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
      <div class="flex items-center mb-4">
        <div class="w-12 h-12 ${config.bgColor} rounded-full flex items-center justify-center mr-4">
          <svg class="w-6 h-6 ${config.textColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${config.icon}
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900">${userFriendlyMessage.title}</h3>
      </div>
      <div class="mb-6">
        <p class="text-gray-600 mb-4">${userFriendlyMessage.description}</p>
        ${userFriendlyMessage.steps ? `
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="font-medium text-blue-900 mb-2">วิธีแก้ไข:</h4>
            <ol class="list-decimal list-inside text-sm text-blue-800 space-y-1">
              ${userFriendlyMessage.steps.map(step => `<li>${step}</li>`).join('')}
            </ol>
          </div>
        ` : ''}
      </div>
      <div class="flex justify-end">
        <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" onclick="this.closest('.fixed').remove()">
          เข้าใจแล้ว
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(errorDialog);
  
  // Auto-remove after 30 seconds
  setTimeout(() => {
    if (errorDialog.parentNode) {
      errorDialog.remove();
    }
  }, 30000);
}