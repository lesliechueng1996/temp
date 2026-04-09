'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PaperclipIcon, MoveUpIcon } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import AttachmentList, { type FileInfo } from './AttachmentList';

type UploadFileResponse = {
  code: number;
  msg: string;
  data: {
    id: string;
  } | null;
};

const InputBox = () => {
  const [attachments, setAttachments] = useState<FileInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAttachment = async (attachment: FileInfo) => {
    setAttachments((prev) =>
      prev.map((item) =>
        item.id === attachment.id ? { ...item, isUploading: true } : item,
      ),
    );

    try {
      const formData = new FormData();
      formData.append('file', attachment.file);

      const response = await fetch('/api/file', {
        method: 'POST',
        body: formData,
      });

      const result = (await response.json()) as UploadFileResponse;

      if (!response.ok || result.code !== 200 || !result.data?.id) {
        throw new Error(result.msg || 'Upload file failed');
      }

      setAttachments((prev) =>
        prev.map((item) =>
          item.id === attachment.id
            ? {
                ...item,
                id: result.data?.id ?? item.id,
                isUploading: false,
                isSuccess: true,
              }
            : item,
        ),
      );
    } catch (error) {
      setAttachments((prev) =>
        prev.map((item) =>
          item.id === attachment.id
            ? { ...item, isUploading: false, isSuccess: false }
            : item,
        ),
      );
      console.error('Upload attachment failed', error);
    }
  };

  const handlePickFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    const newAttachments = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      isUploading: false,
      isSuccess: false,
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);

    for (const attachment of newAttachments) {
      await uploadAttachment(attachment);
    }

    event.target.value = '';
  };

  return (
    <div className="w-full min-h-36 max-h-96 shadow-sm rounded-2xl bg-background p-4 flex flex-col">
      {attachments.length > 0 && <AttachmentList attachments={attachments} />}

      <Textarea
        className="border-none resize-none flex-1 placeholder:text-chart-2 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder="Please ask question ..."
      />

      <div className="flex items-center justify-between shrink-0">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={handlePickFiles}
        >
          <PaperclipIcon className="size-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <Button variant="outline" size="icon" className="rounded-full">
          <MoveUpIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
};

export default InputBox;
