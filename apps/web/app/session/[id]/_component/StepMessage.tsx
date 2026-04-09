import {
  CheckCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  LoaderIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ToolMessageData } from './ToolMessage';
import ToolMessage from './ToolMessage';

export type StepMessageData = {
  id: string;
  status: string;
  description: string;
  isExpanded: boolean;
  tools: ToolMessageData[];
};

type Props = {
  stepData: StepMessageData;
  onExpand: (isExpanded: boolean) => void;
};

const StepMessage = ({ stepData, onExpand }: Props) => {
  return (
    <div>
      <div className="flex items-center gap-2">
        {stepData.status === 'completed' ? (
          <CheckCircleIcon className="size-4 text-gray-500" />
        ) : (
          <LoaderIcon className="size-4 text-yellow-500 animate-spin" />
        )}
        <span>{stepData.description}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            onExpand(!stepData.isExpanded);
          }}
        >
          {stepData.isExpanded ? (
            <ChevronUpIcon className="size-4" />
          ) : (
            <ChevronDownIcon className="size-4" />
          )}
        </Button>
      </div>
      {stepData.isExpanded && (
        <div className="pl-4 space-y-3 pt-3">
          {stepData.tools.map((tool) => (
            <ToolMessage key={tool.id} toolData={tool} />
          ))}
        </div>
      )}
    </div>
  );
};

export default StepMessage;
