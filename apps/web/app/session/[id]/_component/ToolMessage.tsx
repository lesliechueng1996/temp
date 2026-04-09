import { BoltIcon } from 'lucide-react';

export type ToolMessageData = {
  isExpanded: boolean;
  id: string;
  function: string;
  status: string;
  args: Record<string, unknown>;
  content: unknown;
};

type Props = {
  toolData: ToolMessageData;
};

const ToolMessage = ({ toolData }: Props) => {
  const functionName = toolData.function;
  const args = toolData.args;

  let finalFunctionName = toolData.function;
  let finalArgs = '';

  if (functionName === 'message_notify_user') {
    return <div>{args.text as string}</div>;
  }

  if (functionName === 'shell_execute') {
    finalFunctionName = 'Execute Shell Command';
    finalArgs = args.command as string;
  }

  if (functionName === 'shell_read_output') {
    finalFunctionName = 'Read Shell Output';
    finalArgs = '';
  }

  if (functionName === 'shell_wait_process') {
    finalFunctionName = 'Wait for Shell Process';
    finalArgs = '';
  }

  if (functionName === 'shell_write_input') {
    finalFunctionName = 'Write Input to Shell Process';
    finalArgs = args.inputText as string;
  }

  if (functionName === 'shell_kill_process') {
    finalFunctionName = 'Kill Shell Process';
    finalArgs = '';
  }

  if (functionName === 'file_read') {
    finalFunctionName = 'Read File';
    finalArgs = args.filepath as string;
  }

  if (functionName === 'file_write') {
    finalFunctionName = 'Write File';
    finalArgs = args.filepath as string;
  }

  if (functionName === 'file_str_replace') {
    finalFunctionName = 'Replace String in File';
    finalArgs = args.filepath as string;
  }

  if (functionName === 'file_find_in_content') {
    finalFunctionName = 'Find in File Content';
    finalArgs = args.filepath as string;
  }

  if (functionName === 'file_find_by_name') {
    finalFunctionName = 'Find File by Name';
    finalArgs = args.dirPath as string;
  }

  if (functionName === 'file_list') {
    finalFunctionName = 'List Files';
    finalArgs = args.dirPath as string;
  }

  return (
    <div className="flex items-center gap-2 py-1 px-3 bg-gray-200/50 rounded-lg">
      <BoltIcon className="size-4 shrink-0" />
      <span className="text-sm font-medium shrink-0">{finalFunctionName}</span>
      <span className="text-sm text-muted-foreground truncate max-w-full">
        {finalArgs}
      </span>
    </div>
  );
};

export default ToolMessage;
