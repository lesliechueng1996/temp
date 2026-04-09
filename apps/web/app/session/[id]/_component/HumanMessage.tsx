import { formatFileSize } from '@/lib/utils';
import { FileIcon } from 'lucide-react';

type Props = {
  message: string;
  attachments: Array<{
    id: string;
    name: string;
    size: number;
  }>;
};

const HumanMessage = ({ message, attachments }: Props) => {
  return (
    <>
      <div className="w-full flex justify-end">
        <div className="bg-background p-3 rounded-lg">{message}</div>
      </div>

      <div className="w-full flex flex-wrap justify-end gap-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center gap-2 py-2 px-3 rounded-lg bg-background max-w-48 min-w-0"
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
          </div>
        ))}
      </div>
    </>
  );
};

export default HumanMessage;
