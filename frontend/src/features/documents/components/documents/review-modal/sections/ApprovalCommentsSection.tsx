import React from 'react';
import { MessageSquare, User, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { ParsedBusinessProfile } from "../../../../utils/parsers/excel-parser";
import { SectionTitle } from '../shared';

interface ApprovalCommentsSectionProps {
  data: ParsedBusinessProfile['approvalComments'];
  onUpdate: (newData: ParsedBusinessProfile['approvalComments']) => void;
}

export function ApprovalCommentsSection({ data }: ApprovalCommentsSectionProps) {
  if (!data) {
    return (
      <div className="space-y-6">
        <SectionTitle icon={MessageSquare} title="ความเห็นการอนุมัติ" />
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/5">
          ไม่พบข้อมูลความเห็นการอนุมัติ
        </div>
      </div>
    );
  }

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
      <SectionTitle icon={MessageSquare} title="ความเห็นการอนุมัติ" />

      <div className="space-y-4">
        {/* Marketing Officer */}
        {data.marketingOfficer && (
          <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">เจ้าหน้าที่การตลาด</h3>
                <p className="text-sm text-blue-700">{data.marketingOfficer.name}</p>
              </div>
              <div className="ml-auto flex items-center gap-1 text-xs text-blue-600">
                <Calendar className="w-3 h-3" />
                {formatDate(data.marketingOfficer.date)}
              </div>
            </div>
            <div className="bg-white/70 rounded-lg p-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {data.marketingOfficer.comments}
              </p>
            </div>
          </div>
        )}

        {/* Credit Officer */}
        {data.creditOfficer && (
          <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-purple-900">เจ้าหน้าที่สินเชื่อ</h3>
                <p className="text-sm text-purple-700">{data.creditOfficer.name}</p>
              </div>
              <div className="ml-auto flex items-center gap-1 text-xs text-purple-600">
                <Calendar className="w-3 h-3" />
                {formatDate(data.creditOfficer.date)}
              </div>
            </div>
            
            {data.creditOfficer.riskAssessment && (
              <div className="mb-3">
                <h4 className="text-sm font-medium text-purple-800 mb-1">การประเมินความเสี่ยง:</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-gray-700">{data.creditOfficer.riskAssessment}</p>
                </div>
              </div>
            )}
            
            <div className="mb-3">
              <h4 className="text-sm font-medium text-purple-800 mb-1">ความเห็น:</h4>
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {data.creditOfficer.comments}
                </p>
              </div>
            </div>
            
            {data.creditOfficer.recommendation && (
              <div>
                <h4 className="text-sm font-medium text-purple-800 mb-1">คำแนะนำ:</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-gray-700">{data.creditOfficer.recommendation}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Branch Manager */}
        {data.branchManager && (
          <div className="bg-orange-50/50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-900">ผู้จัดการสาขา</h3>
                <p className="text-sm text-orange-700">{data.branchManager.name}</p>
              </div>
              <div className="ml-auto flex items-center gap-1 text-xs text-orange-600">
                <Calendar className="w-3 h-3" />
                {formatDate(data.branchManager.date)}
              </div>
            </div>
            
            <div className="mb-3">
              <h4 className="text-sm font-medium text-orange-800 mb-1">ความเห็น:</h4>
              <div className="bg-white/70 rounded-lg p-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {data.branchManager.comments}
                </p>
              </div>
            </div>
            
            {data.branchManager.recommendation && (
              <div>
                <h4 className="text-sm font-medium text-orange-800 mb-1">คำแนะนำ:</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-gray-700">{data.branchManager.recommendation}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Approver */}
        {data.approver && (
          <div className="bg-green-50/50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                {getStatusIcon(data.approver.decision)}
              </div>
              <div>
                <h3 className="font-semibold text-green-900">ผู้อนุมัติ</h3>
                <p className="text-sm text-green-700">{data.approver.name}</p>
                <p className="text-xs text-green-600">{data.approver.position}</p>
              </div>
              <div className="ml-auto flex items-center gap-1 text-xs text-green-600">
                <Calendar className="w-3 h-3" />
                {formatDate(data.approver.approvalDate)}
              </div>
            </div>
            
            {data.approver.decision && (
              <div className="mb-3">
                <h4 className="text-sm font-medium text-green-800 mb-1">การตัดสินใจ:</h4>
                <div className="bg-white/70 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(data.approver.decision)}
                    <span className="font-medium text-green-800">{data.approver.decision}</span>
                  </div>
                </div>
              </div>
            )}
            
            {data.approver.approvedAmount && data.approver.approvedAmount > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-medium text-green-800 mb-1">วงเงินที่อนุมัติ:</h4>
                <div className="bg-white/70 rounded-lg p-3">
                  <p className="text-lg font-bold text-green-700">
                    {formatCurrency(data.approver.approvedAmount)} บาท
                  </p>
                </div>
              </div>
            )}
            
            {data.approver.specialConditions && (
              <div>
                <h4 className="text-sm font-medium text-green-800 mb-1">เงื่อนไขพิเศษ:</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {data.approver.specialConditions}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}