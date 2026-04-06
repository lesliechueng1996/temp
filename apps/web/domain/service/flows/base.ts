import type { Event } from '@/domain/model/event';
import type { Message } from '@/domain/model/message';

export enum FlowStatus {
  IDLE = 'idle',
  PLANNING = 'planning',
  EXECUTING = 'executing',
  SUMMARIZING = 'summarizing',
  UPDATING = 'updating',
  COMPLETED = 'completed',
}

export interface BaseFlow {
  invoke(message: Message): AsyncGenerator<Event>;
  done(): Promise<boolean>;
}
