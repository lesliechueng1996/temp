'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PlusIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Props = {
  className?: string;
};

const Sidebar = ({ className }: Props) => {
  const router = useRouter();

  const handleNewSessionClick = async () => {
    const res = await fetch('/api/session', {
      method: 'POST',
    });
    if (!res.ok) {
      toast.error('Failed to create session');
      return;
    }

    const data = await res.json();
    router.push(`/session/${data.data.sessionId}`);
  };

  return (
    <aside
      className={cn(className, 'w-64 h-full bg-sidebar pt-6 px-4 space-y-6')}
    >
      <h1 className="font-bold text-xl">Sandbox</h1>

      <Button className="w-full" onClick={handleNewSessionClick}>
        <PlusIcon className="size-4" />
        New Session
      </Button>

      {/* <div>
        <div className="bg-background px-2 py-3 rounded-md shadow-sm">
          <p className="text-sm font-medium">123</p>
          <p className="text-xs font-normal text-muted-foreground">456</p>
        </div>
      </div> */}
    </aside>
  );
};

export default Sidebar;
