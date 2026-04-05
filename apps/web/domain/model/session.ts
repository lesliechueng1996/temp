import { randomUUID } from 'node:crypto';
import { PlanEvent, type Event } from './event';
import type { File } from './file';
import type { Memory } from './memory';
import type { Plan } from './plan';

export enum SessionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  WAITING = 'waiting',
  COMPLETED = 'completed',
}

export class Session {
  id: string;
  sandboxId?: string;
  taskId?: string;
  title: string;
  events: Event[];
  files: File[];
  memories: Record<string, Memory>;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;

  constructor(overrides?: Partial<Session>) {
    this.id = overrides?.id ?? randomUUID();
    this.sandboxId = overrides?.sandboxId ?? undefined;
    this.taskId = overrides?.taskId ?? undefined;
    this.title = overrides?.title ?? '';
    this.events = overrides?.events ?? [];
    this.files = overrides?.files ?? [];
    this.memories = overrides?.memories ?? {};
    this.status = overrides?.status ?? SessionStatus.PENDING;
    this.createdAt = overrides?.createdAt ?? new Date();
    this.updatedAt = overrides?.updatedAt ?? new Date();
  }

  getLastPlan(): Plan | undefined {
    return this.events.toReversed().find((event) => event instanceof PlanEvent)
      ?.plan;
  }
}
