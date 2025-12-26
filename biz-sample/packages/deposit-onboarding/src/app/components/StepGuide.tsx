interface Step {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface StepGuideProps {
  steps: Step[];
}

export function StepGuide({ steps }: StepGuideProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={step.number} className="relative flex gap-3 items-start">
          <div className="flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              {step.icon}
            </div>
          </div>
          
          <div className="flex-1 pt-0.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs">
                {step.number}
              </span>
              <h4 className="text-sm">{step.title}</h4>
            </div>
            <p className="text-gray-600 text-xs leading-relaxed">{step.description}</p>
          </div>
          
          {index < steps.length - 1 && (
            <div className="absolute left-4 top-9 w-0.5 h-full bg-gray-200" style={{ height: '2.5rem' }} />
          )}
        </div>
      ))}
    </div>
  );
}