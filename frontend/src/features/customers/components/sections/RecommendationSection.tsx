
import { MessageSquare, TrendingUp, TrendingDown, Lightbulb, User, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Textarea } from '@/shared/components/ui/textarea';
import { EditableSection } from '../EditableSection';
import { useEditableData } from '../../hooks/useEditableData';
import { customersApi } from '@/shared/lib/api-endpoints';

type RecommendationData = {
  strengths: string;
  weaknesses: string;
  recommendation: string;
} & Record<string, unknown>;

interface RecommendationSectionProps {
  aiData?: {
    recommendation?: Partial<RecommendationData> | string;
    approvalComments?: {
      marketingOfficer?: { name: string; comments: string; date: string; };
      creditOfficer?: { name: string; riskAssessment: string; comments: string; recommendation: string; date: string; };
      branchManager?: { name: string; comments: string; recommendation: string; date: string; };
      approver?: { name: string; position: string; decision: string; approvedAmount: number; specialConditions: string; approvalDate: string; };
    };
  } | null;
  hasAIData: boolean;
  customerId: string;
}

export function RecommendationSection({ aiData, hasAIData, customerId }: RecommendationSectionProps) {
  const initialData: RecommendationData = {
    strengths: typeof aiData?.recommendation === 'object' ? aiData.recommendation?.strengths || '' : '',
    weaknesses: typeof aiData?.recommendation === 'object' ? aiData.recommendation?.weaknesses || '' : '',
    recommendation: typeof aiData?.recommendation === 'object' 
      ? aiData.recommendation?.recommendation || '' 
      : (typeof aiData?.recommendation === 'string' ? aiData.recommendation : ''),
  };

  const {
    isEditing,
    editedData,
    isSaving,
    handleEdit,
    handleSave,
    handleCancel,
    updateField,
  } = useEditableData<RecommendationData>({
    initialData,
    updateFn: (data) => customersApi.updateWithAIData(customerId, { recommendation: data }, 100, []),
    queryKey: ['customer', customerId],
  });

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('th-TH');
    } catch {
      return dateStr;
    }
  };

  const getStatusIcon = (decision?: string) => {
    if (decision?.includes('อนุมัติ')) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Approval Comments Section */}
      {aiData?.approvalComments && hasAIData && (
        <Card className="overflow-hidden border-none shadow-premium bg-white/80 backdrop-blur-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <MessageSquare className="h-5 w-5" />
              ความเห็นการอนุมัติ
            </CardTitle>
            <CardDescription>
              ความเห็นจากเจ้าหน้าที่และผู้อนุมัติในกระบวนการพิจารณาสินเชื่อ
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Marketing Officer */}
              {aiData.approvalComments.marketingOfficer && (
                <div className="border rounded-xl p-4 bg-blue-50/50 border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900">เจ้าหน้าที่การตลาด</h4>
                      <p className="text-sm text-blue-700">{aiData.approvalComments.marketingOfficer.name}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <Calendar className="w-3 h-3" />
                      {formatDate(aiData.approvalComments.marketingOfficer.date)}
                    </div>
                  </div>
                  <div className="bg-white/70 rounded-lg p-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {aiData.approvalComments.marketingOfficer.comments}
                    </p>
                  </div>
                </div>
              )}

              {/* Credit Officer */}
              {aiData.approvalComments.creditOfficer && (
                <div className="border rounded-xl p-4 bg-purple-50/50 border-purple-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900">เจ้าหน้าที่สินเชื่อ</h4>
                      <p className="text-sm text-purple-700">{aiData.approvalComments.creditOfficer.name}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-purple-600">
                      <Calendar className="w-3 h-3" />
                      {formatDate(aiData.approvalComments.creditOfficer.date)}
                    </div>
                  </div>
                  
                  {aiData.approvalComments.creditOfficer.riskAssessment && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-purple-800 mb-1">การประเมินความเสี่ยง:</h5>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-gray-700">{aiData.approvalComments.creditOfficer.riskAssessment}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-purple-800 mb-1">ความเห็น:</h5>
                    <div className="bg-white/70 rounded-lg p-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {aiData.approvalComments.creditOfficer.comments}
                      </p>
                    </div>
                  </div>
                  
                  {aiData.approvalComments.creditOfficer.recommendation && (
                    <div>
                      <h5 className="text-sm font-medium text-purple-800 mb-1">คำแนะนำ:</h5>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-gray-700">{aiData.approvalComments.creditOfficer.recommendation}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Branch Manager */}
              {aiData.approvalComments.branchManager && (
                <div className="border rounded-xl p-4 bg-orange-50/50 border-orange-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-orange-900">ผู้จัดการสาขา</h4>
                      <p className="text-sm text-orange-700">{aiData.approvalComments.branchManager.name}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <Calendar className="w-3 h-3" />
                      {formatDate(aiData.approvalComments.branchManager.date)}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-orange-800 mb-1">ความเห็น:</h5>
                    <div className="bg-white/70 rounded-lg p-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {aiData.approvalComments.branchManager.comments}
                      </p>
                    </div>
                  </div>
                  
                  {aiData.approvalComments.branchManager.recommendation && (
                    <div>
                      <h5 className="text-sm font-medium text-orange-800 mb-1">คำแนะนำ:</h5>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-gray-700">{aiData.approvalComments.branchManager.recommendation}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Approver */}
              {aiData.approvalComments.approver && (
                <div className="border rounded-xl p-4 bg-green-50/50 border-green-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      {getStatusIcon(aiData.approvalComments.approver.decision)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-900">ผู้อนุมัติ</h4>
                      <p className="text-sm text-green-700">{aiData.approvalComments.approver.name}</p>
                      <p className="text-xs text-green-600">{aiData.approvalComments.approver.position}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <Calendar className="w-3 h-3" />
                      {formatDate(aiData.approvalComments.approver.approvalDate)}
                    </div>
                  </div>
                  
                  {aiData.approvalComments.approver.decision && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-green-800 mb-1">การตัดสินใจ:</h5>
                      <div className="bg-white/70 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(aiData.approvalComments.approver.decision)}
                          <span className="font-medium text-green-800">{aiData.approvalComments.approver.decision}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {aiData.approvalComments.approver.approvedAmount && aiData.approvalComments.approver.approvedAmount > 0 && (
                    <div className="mb-3">
                      <h5 className="text-sm font-medium text-green-800 mb-1">วงเงินที่อนุมัติ:</h5>
                      <div className="bg-white/70 rounded-lg p-3">
                        <p className="text-lg font-bold text-green-700">
                          {formatCurrency(aiData.approvalComments.approver.approvedAmount)} บาท
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {aiData.approvalComments.approver.specialConditions && (
                    <div>
                      <h5 className="text-sm font-medium text-green-800 mb-1">เงื่อนไขพิเศษ:</h5>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {aiData.approvalComments.approver.specialConditions}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendation Section */}
      <Card className="overflow-hidden border-none shadow-premium bg-white/80 backdrop-blur-md">
        <CardContent className="p-4">
          <EditableSection
            title="ความเห็นประกอบการพิจารณา"
            icon={<MessageSquare className="h-5 w-5" />}
            isEditing={isEditing}
            isSaving={isSaving}
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
          >
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-600 uppercase flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> จุดเด่นของธุรกิจ
                  </label>
                  {isEditing ? (
                    <Textarea 
                      value={editedData.strengths} 
                      onChange={(e) => updateField('strengths', e.target.value)}
                      className="min-h-[120px] text-sm leading-relaxed border-emerald-100 focus:border-emerald-500 focus:ring-emerald-500/20"
                    />
                  ) : (
                    <p className="text-sm leading-relaxed text-foreground/80 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
                      {editedData.strengths || 'ยังไม่มีข้อมูลจุดเด่น'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-rose-600 uppercase flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" /> ข้อควรระวัง/ความเสี่ยง
                  </label>
                  {isEditing ? (
                    <Textarea 
                      value={editedData.weaknesses} 
                      onChange={(e) => updateField('weaknesses', e.target.value)}
                      className="min-h-[120px] text-sm leading-relaxed border-rose-100 focus:border-rose-500 focus:ring-rose-500/20"
                    />
                  ) : (
                    <p className="text-sm leading-relaxed text-foreground/80 bg-rose-50/30 p-4 rounded-xl border border-rose-100">
                      {editedData.weaknesses || 'ยังไม่มีข้อมูลข้อควรระวัง'}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-primary uppercase flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" /> ความเห็นและข้อเสนอแนะ
                </label>
                {isEditing ? (
                  <Textarea 
                    value={editedData.recommendation} 
                    onChange={(e) => updateField('recommendation', e.target.value)}
                    className="min-h-[150px] text-sm leading-relaxed"
                  />
                ) : (
                  <p className="text-sm leading-relaxed text-foreground/80 bg-primary/5 p-6 rounded-xl border border-primary/10 font-medium">
                    {editedData.recommendation || 'ยังไม่มีความเห็นและข้อเสนอแนะ'}
                  </p>
                )}
              </div>
            </div>
          </EditableSection>
        </CardContent>
      </Card>
    </div>
  );
}
