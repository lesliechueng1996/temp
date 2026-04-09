import {
  MessageEvent,
  PlanEvent,
  StepEvent,
  TitleEvent,
  type ToolContent,
  ToolEvent,
  ErrorEvent,
  ToolEventStatus,
  DoneEvent,
  type Event,
} from '@/domain/model/event';
import type { File } from '@/domain/model/file';
import { ExecutionStatus } from '@/domain/model/plan';

class BaseEventData {
  eventId: string;
  createdAt: number;

  constructor(
    overrides: Partial<BaseEventData> & Pick<BaseEventData, 'eventId'>,
  ) {
    this.eventId = overrides.eventId;
    this.createdAt = overrides?.createdAt ?? Date.now();
  }
}

export class MessageEventData extends BaseEventData {
  role: 'user' | 'assistant';
  message: string;
  attachments: File[];

  constructor(
    overrides: Partial<MessageEventData> & Pick<MessageEventData, 'eventId'>,
  ) {
    super(overrides);
    this.role = overrides.role ?? 'assistant';
    this.message = overrides.message ?? '';
    this.attachments = overrides.attachments ?? [];
  }

  static fromEvent(event: MessageEvent) {
    return new MessageEventData({
      role: event.role,
      message: event.message,
      attachments: event.attachments,
      eventId: event.id,
      createdAt: event.createdAt.getTime(),
    });
  }
}

class MessageSSEEvent {
  event = 'message';
  data: MessageEventData;

  constructor(data: MessageEventData) {
    this.data = data;
  }

  static fromEvent(event: MessageEvent) {
    return new MessageSSEEvent(MessageEventData.fromEvent(event));
  }
}

export class TitleEventData extends BaseEventData {
  title: string;

  constructor(
    overrides: Partial<TitleEventData> & Pick<TitleEventData, 'eventId'>,
  ) {
    super(overrides);
    this.title = overrides.title ?? '';
  }

  static fromEvent(event: TitleEvent) {
    return new TitleEventData({
      title: event.title,
      eventId: event.id,
      createdAt: event.createdAt.getTime(),
    });
  }
}

class TitleSSEEvent {
  event = 'title';
  data: TitleEventData;

  constructor(data: TitleEventData) {
    this.data = data;
  }

  static fromEvent(event: TitleEvent) {
    return new TitleSSEEvent(TitleEventData.fromEvent(event));
  }
}

export class StepEventData extends BaseEventData {
  id: string;
  status: ExecutionStatus;
  description: string;

  constructor(
    overrides: Partial<StepEventData> & Pick<StepEventData, 'eventId'>,
  ) {
    super(overrides);
    this.id = overrides.id ?? '';
    this.status = overrides.status ?? ExecutionStatus.PENDING;
    this.description = overrides.description ?? '';
  }

  static fromEvent(event: StepEvent) {
    return new StepEventData({
      id: event.step.id,
      status: event.step.status,
      description: event.step.description,
      eventId: event.id,
      createdAt: event.createdAt.getTime(),
    });
  }
}

class StepSSEEvent {
  event = 'step';
  data: StepEventData;

  constructor(data: StepEventData) {
    this.data = data;
  }

  static fromEvent(event: StepEvent) {
    return new StepSSEEvent(StepEventData.fromEvent(event));
  }
}

export class PlanEventData extends BaseEventData {
  steps: StepEventData[];

  constructor(
    overrides: Partial<PlanEventData> & Pick<PlanEventData, 'eventId'>,
  ) {
    super(overrides);
    this.steps = overrides.steps ?? [];
  }

  static fromEvent(event: PlanEvent) {
    return new PlanEventData({
      steps: event.plan.steps.map((step) =>
        StepEventData.fromEvent(new StepEvent({ step })),
      ),
      eventId: event.id,
      createdAt: event.createdAt.getTime(),
    });
  }
}

class PlanSSEEvent {
  event = 'plan';
  data: PlanEventData;

  constructor(data: PlanEventData) {
    this.data = data;
  }

  static fromEvent(event: PlanEvent) {
    return new PlanSSEEvent(PlanEventData.fromEvent(event));
  }
}

export class ToolEventData extends BaseEventData {
  toolCallId: string;
  name: string;
  status: ToolEventStatus;
  function: string;
  args: Record<string, unknown>;
  content: ToolContent | null;

  constructor(
    overrides: Partial<ToolEventData> & Pick<ToolEventData, 'eventId'>,
  ) {
    super(overrides);
    this.toolCallId = overrides.toolCallId ?? '';
    this.name = overrides.name ?? '';
    this.status = overrides.status ?? ToolEventStatus.CALLING;
    this.function = overrides.function ?? '';
    this.args = overrides.args ?? {};
    this.content = overrides.content ?? null;
  }

  static fromEvent(event: ToolEvent) {
    return new ToolEventData({
      toolCallId: event.toolCallId,
      name: event.toolName,
      status: event.status,
      function: event.functionName,
      args: event.functionArguments,
      content: event.toolContent,
      eventId: event.id,
      createdAt: event.createdAt.getTime(),
    });
  }
}

class ToolSSEEvent {
  event = 'tool';
  data: ToolEventData;

  constructor(data: ToolEventData) {
    this.data = data;
  }

  static fromEvent(event: ToolEvent) {
    return new ToolSSEEvent(ToolEventData.fromEvent(event));
  }
}

export class ErrorEventData extends BaseEventData {
  error: string;

  constructor(
    overrides: Partial<ErrorEventData> & Pick<ErrorEventData, 'eventId'>,
  ) {
    super(overrides);
    this.error = overrides.error ?? '';
  }

  static fromEvent(event: ErrorEvent) {
    return new ErrorEventData({
      error: event.error,
      eventId: event.id,
      createdAt: event.createdAt.getTime(),
    });
  }
}

class ErrorSSEEvent {
  event = 'error';
  data: ErrorEventData;

  constructor(data: ErrorEventData) {
    this.data = data;
  }

  static fromEvent(event: ErrorEvent) {
    return new ErrorSSEEvent(ErrorEventData.fromEvent(event));
  }
}

export class DoneSSEEvent {
  event = 'done';
  data: BaseEventData;

  constructor(data: BaseEventData) {
    this.data = data;
  }

  static fromEvent(event: DoneEvent) {
    return new DoneSSEEvent(
      new BaseEventData({
        eventId: event.id,
        createdAt: event.createdAt.getTime(),
      }),
    );
  }
}

type SSEEvent =
  | MessageSSEEvent
  | TitleSSEEvent
  | StepSSEEvent
  | PlanSSEEvent
  | ToolSSEEvent
  | ErrorSSEEvent
  | DoneSSEEvent;

export const toSSEEvent = (event: Event): SSEEvent | null => {
  if (event instanceof MessageEvent) {
    return MessageSSEEvent.fromEvent(event);
  } else if (event instanceof TitleEvent) {
    return TitleSSEEvent.fromEvent(event);
  } else if (event instanceof StepEvent) {
    return StepSSEEvent.fromEvent(event);
  } else if (event instanceof PlanEvent) {
    return PlanSSEEvent.fromEvent(event);
  } else if (event instanceof ToolEvent) {
    return ToolSSEEvent.fromEvent(event);
  } else if (event instanceof ErrorEvent) {
    return ErrorSSEEvent.fromEvent(event);
  } else if (event instanceof DoneEvent) {
    return DoneSSEEvent.fromEvent(event);
  }

  return null;
};
