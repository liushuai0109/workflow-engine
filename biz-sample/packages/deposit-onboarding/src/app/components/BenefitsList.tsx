import { CheckCircle2 } from 'lucide-react';

interface BenefitsListProps {
  benefits: string[];
}

export function BenefitsList({ benefits }: BenefitsListProps) {
  return (
    <div className="space-y-2.5">
      {benefits.map((benefit, index) => (
        <div key={index} className="flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          <span className="text-gray-700 text-sm leading-relaxed">{benefit}</span>
        </div>
      ))}
    </div>
  );
}