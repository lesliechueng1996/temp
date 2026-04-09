'use client';

import { useState } from 'react';
import {
  CheckIcon,
  ChevronDownIcon,
  LoaderIcon,
  ChevronUpIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type Plan = {
  steps: Array<{
    id: string;
    status: string;
    description: string;
  }>;
};

type Props = {
  plan: Plan | null;
};

const PlanPannel = ({ plan }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!plan) return null;

  const isPlanCompleted = plan.steps.every(
    (step) => step.status === 'completed',
  );
  const completedStepsCount = plan.steps.filter(
    (step) => step.status === 'completed',
  ).length;

  return (
    <div className="shadow-sm rounded-2xl bg-background px-4 py-2 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isPlanCompleted ? (
            <>
              <CheckIcon className="size-4 text-green-500" />
              <p className="font-medium">Plan completed</p>
            </>
          ) : (
            <>
              <LoaderIcon className="size-4 text-yellow-500 animate-spin" />
              <p className="font-medium">Plan running</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {completedStepsCount}/{plan.steps.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDownIcon className="size-4" />
            ) : (
              <ChevronUpIcon className="size-4" />
            )}
          </Button>
        </div>
      </div>
      {isExpanded ? (
        <>
          <Separator />
          <div className="space-y-2">
            {plan.steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                {step.status === 'completed' ? (
                  <CheckIcon className="size-4 text-green-500 shrink-0" />
                ) : (
                  <LoaderIcon className="size-4 text-yellow-500 animate-spin shrink-0" />
                )}
                <p className="text-sm font-medium flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default PlanPannel;
