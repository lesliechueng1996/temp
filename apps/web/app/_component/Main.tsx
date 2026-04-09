import { cn } from '@/lib/utils';
import InputBox from './InputBox';

type Props = {
  className?: string;
};

const Main = ({ className }: Props) => {
  return (
    <div
      className={cn(
        className,
        'flex items-center justify-center w-full bg-muted',
      )}
    >
      <div className="w-3xl space-y-4">
        <h1 className="text-2xl w-full">Hello Team</h1>
        <InputBox isRunning={false} onSendMessage={() => {}} />
      </div>
    </div>
  );
};

export default Main;
