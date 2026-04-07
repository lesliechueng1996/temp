import { randomUUID } from 'node:crypto';
import type { File } from './file';
import { Plan, Step } from './plan';
import type { ToolResult } from './tool-result';

export enum PlanEventStatus {
  CREATED = 'created',
  UPDATED = 'updated',
  COMPLETED = 'completed',
}

export class BaseEvent {
  id: string;
  type: string;
  createdAt: Date;

  constructor(overrides?: Partial<BaseEvent>) {
    this.id = overrides?.id ?? randomUUID();
    this.type = overrides?.type ?? '';
    this.createdAt = overrides?.createdAt ?? new Date();
  }
}

export class PlanEvent extends BaseEvent {
  type: 'plan';
  plan: Plan;
  status: PlanEventStatus;

  constructor(overrides?: Partial<Omit<PlanEvent, 'type'>>) {
    super(overrides);
    this.type = 'plan';
    this.plan = overrides?.plan ?? new Plan();
    this.status = overrides?.status ?? PlanEventStatus.CREATED;
  }
}

export class TitleEvent extends BaseEvent {
  type: 'title';
  title: string;

  constructor(overrides?: Partial<Omit<TitleEvent, 'type'>>) {
    super(overrides);
    this.type = 'title';
    this.title = overrides?.title ?? '';
  }
}

export enum StepEventStatus {
  STARTED = 'started',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class StepEvent extends BaseEvent {
  type: 'step';
  step: Step;
  status: StepEventStatus;

  constructor(overrides?: Partial<Omit<StepEvent, 'type'>>) {
    super(overrides);
    this.type = 'step';
    this.step = overrides?.step ?? new Step();
    this.status = overrides?.status ?? StepEventStatus.STARTED;
  }
}

export class MessageEvent extends BaseEvent {
  type: 'message';
  role: 'user' | 'assistant';
  message: string;
  attachments: File[];

  constructor(overrides?: Partial<Omit<MessageEvent, 'type'>>) {
    super(overrides);
    this.type = 'message';
    this.role = overrides?.role ?? 'assistant';
    this.message = overrides?.message ?? '';
    this.attachments = overrides?.attachments ?? [];
  }
}

export class ShellToolContent {
  constructor(readonly console: unknown) {}
}

export class FileToolContent {
  constructor(readonly content: string) {}
}

type ToolContent = ShellToolContent | FileToolContent;

export enum ToolEventStatus {
  CALLING = 'calling',
  CALLED = 'called',
}

export class ToolEvent extends BaseEvent {
  type: 'tool';
  toolCallId: string;
  toolName: string;
  toolContent: ToolContent | null;
  functionName: string;
  functionArguments: Record<string, unknown>;
  functionResult: ToolResult<unknown> | null;
  status: ToolEventStatus;

  constructor(
    overrides: Partial<Omit<ToolEvent, 'type'>> &
      Pick<
        ToolEvent,
        'toolCallId' | 'toolName' | 'functionName' | 'functionArguments'
      >,
  ) {
    super(overrides);
    this.type = 'tool';
    this.toolCallId = overrides.toolCallId;
    this.toolName = overrides.toolName;
    this.toolContent = overrides.toolContent ?? null;
    this.functionName = overrides.functionName;
    this.functionArguments = overrides.functionArguments;
    this.functionResult = overrides.functionResult ?? null;
    this.status = overrides.status ?? ToolEventStatus.CALLING;
  }
}

export class WaitEvent extends BaseEvent {
  type: 'wait';

  constructor() {
    super();
    this.type = 'wait';
  }
}

export class ErrorEvent extends BaseEvent {
  type: 'error';
  error: string;

  constructor(overrides?: Partial<Omit<ErrorEvent, 'type'>>) {
    super(overrides);
    this.type = 'error';
    this.error = overrides?.error ?? '';
  }
}

export class DoneEvent extends BaseEvent {
  type: 'done';

  constructor() {
    super();
    this.type = 'done';
  }
}

export type Event =
  | PlanEvent
  | TitleEvent
  | StepEvent
  | MessageEvent
  | ToolEvent
  | WaitEvent
  | ErrorEvent
  | DoneEvent;
