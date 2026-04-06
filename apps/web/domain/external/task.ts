import type { MessageQueue } from './message-queue';

export interface Task {
  invoke: () => void;
  cancel: () => void;
  inputStream: MessageQueue;
  outputStream: MessageQueue;
  id: string;
  done: boolean;
  taskRunner: TaskRunner;
}

export interface TaskRunner {
  invoke: (task: Task) => Promise<void>;
  destroy: () => Promise<void>;
  onDone: (task: Task) => Promise<void>;
}
