import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

interface CardSkeletonProps {
  count?: number;
}

export function CardSkeleton({ count = 1 }: CardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border rounded-lg p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton width={120} height={24} />
            <Skeleton width={80} height={20} />
          </div>
          <div className="space-y-3">
            <Skeleton height={16} />
            <Skeleton height={16} width="80%" />
            <Skeleton height={16} width="60%" />
          </div>
        </div>
      ))}
    </>
  );
}
