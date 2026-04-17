import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { TrendingUp, TrendingDown, RefreshCw, ExternalLink } from 'lucide-react';
import { apiClient } from '@/shared/lib/api-client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface InterestRate {
  mlr: number;
  mrr: number;
  lastUpdated: string;
  updatedBy?: {
    id: string;
    name: string;
    role: string;
  };
}

export function InterestRateWidget() {
  const [rates, setRates] = useState<InterestRate | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadRates = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<InterestRate>('/api/interest-rates');
      if (response.data) {
        setRates(response.data);
      }
    } catch (error: any) {
      toast.error('ไม่สามารถโหลดอัตราดอกเบี้ยได้', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  const handleManageRates = () => {
    navigate('/settings?tab=interest');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">อัตราดอกเบี้ยอ้างอิง</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rates) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            อัตราดอกเบี้ยอ้างอิง
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadRates}
            disabled={loading}
            className="h-7 w-7 p-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* MLR */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-blue-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">MLR</p>
              <p className="text-sm font-medium">Minimum Loan Rate</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-lg font-bold px-3 py-1">
            {rates.mlr.toFixed(3)}%
          </Badge>
        </div>

        {/* MRR */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-green-100">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">MRR</p>
              <p className="text-sm font-medium">Minimum Retail Rate</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-lg font-bold px-3 py-1">
            {rates.mrr.toFixed(3)}%
          </Badge>
        </div>

        {/* Last Updated */}
        <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>อัปเดตล่าสุด:</span>
            <span className="font-medium">
              {new Date(rates.lastUpdated).toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          {rates.updatedBy && (
            <div className="flex justify-between">
              <span>โดย:</span>
              <span className="font-medium">{rates.updatedBy.name}</span>
            </div>
          )}
        </div>

        {/* Manage Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleManageRates}
          className="w-full mt-2"
        >
          <ExternalLink className="h-3.5 w-3.5 mr-2" />
          จัดการอัตราดอกเบี้ย
        </Button>
      </CardContent>
    </Card>
  );
}
