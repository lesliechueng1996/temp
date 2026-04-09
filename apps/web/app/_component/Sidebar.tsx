import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PlusIcon } from 'lucide-react';

type Props = {
  className?: string;
};

const Sidebar = ({ className }: Props) => {
  return (
    <aside
      className={cn(className, 'w-64 h-full bg-sidebar pt-6 px-4 space-y-6')}
    >
      <h1 className="font-bold text-xl">Sandbox</h1>

      <Button className="w-full">
        <PlusIcon className="size-4" />
        New Session
      </Button>

      <div>
        <div className="bg-background px-2 py-3 rounded-md shadow-sm">
          <p className="text-sm font-medium">123</p>
          <p className="text-xs font-normal text-muted-foreground">456</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
