import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/shared/components/ui/button";
import { Home, Search } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* 404 Number */}
        <div className="relative">
          <h1 className="text-9xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            404
          </h1>
          <div className="absolute -top-4 -right-4 animate-bounce">
            <Search className="h-12 w-12 text-blue-400 opacity-50" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-gray-800">
            หน้าที่คุณค้นหาไม่พบ
          </h2>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            ขออภัย แต่เราไม่พบหน้าที่คุณกำลังมองหา
            อาจจะถูกย้าย ลบ หรือคุณอาจกรอก URL ไม่ถูกต้อง
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            onClick={() => navigate("/")}
            className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <Home className="mr-2 h-5 w-5" />
            กลับหน้าหลัก
          </Button>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="h-12 px-8 border-2 border-gray-200 hover:border-gray-300 rounded-xl"
          >
            ย้อนกลับ
          </Button>
        </div>

        {/* Helpful Links */}
        <div className="pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">คุณอาจกำลังมองหา:</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {[
              { label: "หน้าหลัก", path: "/login" },
              { label: "ลูกค้า", path: "/customers" },
              { label: "สินเชื่อ", path: "/loans" },
              { label: "ชำระเงิน", path: "/payments" },
            ].map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="px-4 py-2 text-sm text-gray-600 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-all"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400">
          หากคุณคิดว่านี่คือข้อผิดพลาดของระบบ โปรดติดต่อผู้ดูแลระบบ
        </p>
      </div>
    </div>
  );
};

export default NotFound;
