'use client';

import { formatFileSize } from '@/lib/utils';
import { BotIcon, FileIcon } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  message: string;
  attachments: Array<{
    id: string;
    name: string;
    size: number;
  }>;
};

async function downloadFileById(fileId: string, filename: string) {
  const res = await fetch(`/api/file/${fileId}/download`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Download failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const AIMessage = ({ message, attachments }: Props) => {
  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BotIcon className="size-6" /> AI
        </div>
        <div>{message}</div>
      </div>

      <div className="w-full flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <button
            key={attachment.id}
            type="button"
            className="flex items-center gap-2 py-2 px-3 rounded-lg bg-background max-w-48 min-w-0 text-left border border-transparent hover:bg-muted/60 hover:border-border transition-colors cursor-pointer"
            onClick={() => {
              void downloadFileById(attachment.id, attachment.name).catch(
                (err: unknown) => {
                  toast.error(
                    err instanceof Error ? err.message : 'Download failed',
                  );
                },
              );
            }}
            aria-label={`Download ${attachment.name}`}
          >
            <FileIcon className="size-4 shrink-0" />
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <span className="text-sm font-medium truncate">
                {attachment.name}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatFileSize(attachment.size)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </>
  );
};

export default AIMessage;
