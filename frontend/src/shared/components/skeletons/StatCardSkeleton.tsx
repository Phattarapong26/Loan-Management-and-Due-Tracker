import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface StatCardSkeletonProps {
  count?: number;
}

export function StatCardSkeleton({ count = 4 }: StatCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <Skeleton width={100} height={16} />
            <Skeleton circle width={24} height={24} />
          </div>
          <Skeleton width={120} height={32} className="mb-2" />
          <Skeleton width={80} height={14} />
        </div>
      ))}
    </>
  );
}
