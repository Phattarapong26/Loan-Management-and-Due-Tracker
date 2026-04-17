/**
 * Section Title Component
 */

interface SectionTitleProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}

export function SectionTitle({ icon: Icon, title }: SectionTitleProps) {
  return (
    <div className="section-header mb-6">
      <Icon className="w-5 h-5 text-primary" />
      <h3>{title}</h3>
    </div>
  );
}
