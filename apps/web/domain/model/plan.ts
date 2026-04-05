import { randomUUID } from 'node:crypto';

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class Step {
  id: string;
  description: string;
  status: ExecutionStatus;
  result: string | null;
  error: string | null;
  success: boolean;
  attachments: string[];

  constructor(overrides?: Partial<Step>) {
    this.id = overrides?.id ?? randomUUID();
    this.description = overrides?.description ?? '';
    this.status = overrides?.status ?? ExecutionStatus.PENDING;
    this.result = overrides?.result ?? null;
    this.error = overrides?.error ?? null;
    this.success = overrides?.success ?? false;
    this.attachments = overrides?.attachments ?? [];
  }

  isDone(): boolean {
    return (
      this.status === ExecutionStatus.COMPLETED ||
      this.status === ExecutionStatus.FAILED
    );
  }
}

export class Plan {
  id: string;
  title: string;
  goal: string;
  language: string;
  steps: Step[];
  message: string;
  status: ExecutionStatus;
  error: string | null;

  constructor(overrides?: Partial<Plan>) {
    this.id = overrides?.id ?? randomUUID();
    this.title = overrides?.title ?? '';
    this.goal = overrides?.goal ?? '';
    this.language = overrides?.language ?? '';
    this.steps = overrides?.steps ?? [];
    this.message = overrides?.message ?? '';
    this.status = overrides?.status ?? ExecutionStatus.PENDING;
    this.error = overrides?.error ?? null;
  }

  isDone(): boolean {
    return (
      this.status === ExecutionStatus.COMPLETED ||
      this.status === ExecutionStatus.FAILED
    );
  }

  getNextStep(): Step | undefined {
    return this.steps.find((step) => !step.isDone());
  }
}
