import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <Skeleton width={250} height={36} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Skeleton width={100} height={16} />
              <Skeleton circle width={24} height={24} />
            </div>
            <Skeleton width={120} height={32} className="mb-2" />
            <Skeleton width={80} height={14} />
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6">
          <Skeleton width={180} height={24} className="mb-4" />
          <Skeleton height={300} />
        </div>
        <div className="border rounded-lg p-6">
          <Skeleton width={180} height={24} className="mb-4" />
          <Skeleton height={300} />
        </div>
      </div>

      {/* Table Section */}
      <div className="border rounded-lg p-6">
        <Skeleton width={200} height={24} className="mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex-1">
                  <Skeleton height={16} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
