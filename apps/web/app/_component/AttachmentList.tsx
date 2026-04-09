import { cn } from '@/lib/utils';
import { FileIcon } from 'lucide-react';

export type FileInfo = {
  id: string;
  file: File;
  isUploading: boolean;
  isSuccess: boolean;
};

type Props = {
  className?: string;
  attachments: Array<FileInfo>;
};

const formatFileSize = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

const AttachmentList = ({ className, attachments }: Props) => {
  return (
    <div className={cn(className, 'w-full flex gap-2 overflow-x-auto flex-nowrap')}>
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className={cn(
            'flex items-center gap-2 py-2 px-3 rounded-lg bg-muted max-w-48 min-w-0',
            !attachment.isUploading &&
              attachment.isSuccess &&
              'border border-green-700',
            !attachment.isUploading &&
              !attachment.isSuccess &&
              'border border-red-700',
          )}
        >
          <FileIcon className="size-4 shrink-0" />
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-sm font-medium truncate">
              {attachment.file.name}
            </span>
            <span className="text-sm text-muted-foreground">
              {formatFileSize(attachment.file.size)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AttachmentList;
