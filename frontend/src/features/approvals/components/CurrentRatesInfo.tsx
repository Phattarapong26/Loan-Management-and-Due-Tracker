import { useEffect, useState } from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { Info, RefreshCw } from 'lucide-react';
import { apiClient } from '@/shared/lib/api-client';
import { Button } from '@/shared/components/ui/button';

interface InterestRate {
  mlr: number;
  mrr: number;
  lastUpdated: string;
}

export function CurrentRatesInfo() {
  const [rates, setRates] = useState<InterestRate | null>(null);
  const [loading, setLoading] = useState(false);

  const loadRates = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<InterestRate>('/api/interest-rates');
      if (response.data) {
        setRates(response.data);
      }
    } catch (error) {
      console.error('Failed to load interest rates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  if (!rates) {
    return null;
  }

  return (
    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <p className="font-medium text-blue-900">อัตราดอกเบี้ยอ้างอิงปัจจุบัน</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-white">
            MLR: {rates.mlr.toFixed(3)}%
          </Badge>
          <Badge variant="outline" className="bg-white">
            MRR: {rates.mrr.toFixed(3)}%
          </Badge>
        </div>
        <p className="text-xs text-blue-700">
          ตัวอย่าง: "MLR + 1.5%" = {(rates.mlr + 1.5).toFixed(3)}%
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={loadRates}
        disabled={loading}
        className="h-7 w-7 p-0 flex-shrink-0"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );
}
