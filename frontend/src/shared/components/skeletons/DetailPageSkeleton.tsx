import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Skeleton width={200} height={32} className="mb-2" />
          <Skeleton width={150} height={20} />
        </div>
        <Skeleton width={120} height={40} />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={100} height={32} />
        ))}
      </div>

      {/* Content Sections */}
      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="border rounded-lg p-6">
          <Skeleton width={180} height={24} className="mb-4" />
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, fieldIndex) => (
              <div key={fieldIndex}>
                <Skeleton width={100} height={14} className="mb-2" />
                <Skeleton height={20} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
