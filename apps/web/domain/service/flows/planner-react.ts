import type { JsonParser } from '@/domain/external/json-parser';
import type { LlmClient } from '@/domain/external/llm';
import type { Sandbox } from '@/domain/external/sandbox';
import type { AgentConfig } from '@/domain/model/app-config';
import {
  DoneEvent,
  type Event,
  MessageEvent,
  PlanEvent,
  PlanEventStatus,
  TitleEvent,
} from '@/domain/model/event';
import type { Message } from '@/domain/model/message';
import { ExecutionStatus, type Plan, type Step } from '@/domain/model/plan';
import { SessionStatus } from '@/domain/model/session';
import {
  getSessionRepository,
  type SessionRepository,
} from '@/domain/repository/session-repository';
import { logger } from '@/infrastructure/logger';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@/interface/exception';
import { PlannerAgent } from '../agents/planner';
import { ReActAgent } from '../agents/react';
import { FileToolCollection } from '../tools/file';
import { MessageToolCollection } from '../tools/message';
import { ShellToolCollection } from '../tools/shell';
import { type BaseFlow, FlowStatus } from './base';

export class PlannerReActFlow implements BaseFlow {
  readonly sessionId: string;
  readonly sessionRepository: SessionRepository;
  readonly plannerAgent: PlannerAgent;
  readonly reactAgent: ReActAgent;

  status: FlowStatus;
  plan: Plan | null;

  constructor(
    sessionId: string,
    sandbox: Sandbox,
    llm: LlmClient,
    agentConfig: AgentConfig,
    jsonParser: JsonParser,
  ) {
    this.sessionId = sessionId;
    this.sessionRepository = getSessionRepository();
    this.status = FlowStatus.IDLE;
    this.plan = null;

    const tools = [
      new FileToolCollection(sandbox),
      new ShellToolCollection(sandbox),
      new MessageToolCollection(),
    ];

    this.plannerAgent = new PlannerAgent({
      sessionId,
      agentConfig,
      llm,
      jsonParser,
      tools: [],
    });
    logger.info('Planner agent initialized, sessionId: {sessionId}', {
      sessionId,
    });

    this.reactAgent = new ReActAgent({
      sessionId,
      agentConfig,
      llm,
      jsonParser,
      tools,
    });
    logger.info('ReAct agent initialized, sessionId: {sessionId}', {
      sessionId,
    });
  }

  async *invoke(message: Message): AsyncGenerator<Event> {
    const session = await this.sessionRepository.getById(this.sessionId);
    if (!session) {
      throw new NotFoundException(`Session not found: ${this.sessionId}`);
    }

    if (session.status !== SessionStatus.PENDING) {
      logger.info('Session is not pending, rollback memory', {
        sessionId: this.sessionId,
      });
      await this.plannerAgent.rollBack(message);
      await this.reactAgent.rollBack(message);
    }

    if (session.status === SessionStatus.RUNNING) {
      logger.info('Session is running, and receive new message', {
        sessionId: this.sessionId,
      });
      this.status = FlowStatus.PLANNING;
    }

    if (session.status === SessionStatus.WAITING) {
      logger.info('Session is waiting, and receive new message', {
        sessionId: this.sessionId,
      });
      this.status = FlowStatus.EXECUTING;
    }

    await this.sessionRepository.updateStatus(
      this.sessionId,
      SessionStatus.RUNNING,
    );

    this.plan = session.getLatestPlan();
    logger.info('PlannerReAct receive new message', {
      sessionId: this.sessionId,
      message: message.message.substring(0, 50),
    });

    let step: Step | null = null;
    while (true) {
      if (this.status === FlowStatus.IDLE) {
        logger.info('PlannerReAct flow IDLE -> PLANNING', {
          sessionId: this.sessionId,
        });
        this.status = FlowStatus.PLANNING;
      } else if (this.status === FlowStatus.PLANNING) {
        logger.info('PlannerReAct flow start to create plan', {
          sessionId: this.sessionId,
        });
        for await (const event of this.plannerAgent.createPlan(message)) {
          if (
            event instanceof PlanEvent &&
            event.status === PlanEventStatus.CREATED
          ) {
            logger.info(
              'PlannerReAct flow plan created, total steps: {stepsLength}',
              {
                stepsLength: event.plan.steps.length,
                sessionId: this.sessionId,
                planId: event.plan.id,
                planTitle: event.plan.title,
                planGoal: event.plan.goal,
                planMessage: event.plan.message.substring(0, 50),
              },
            );
            this.plan = event.plan;

            yield new TitleEvent({ title: event.plan.title });
            yield new MessageEvent({
              role: 'assistant',
              message: event.plan.message,
            });
          }
          yield event;
        }
        logger.info('PlannerReAct flow RUNNING -> EXECUTING {sessionId}', {
          sessionId: this.sessionId,
        });
        this.status = FlowStatus.EXECUTING;

        if (this.plan?.steps.length === 0) {
          logger.info('PlannerReAct no steps in plan');
          this.status = FlowStatus.COMPLETED;
        }
      } else if (this.status === FlowStatus.EXECUTING) {
        if (!this.plan) {
          logger.error('PlannerReAct no plan found, {sessionId}', {
            sessionId: this.sessionId,
          });
          throw new InternalServerErrorException('No plan found');
        }

        this.plan.status = ExecutionStatus.RUNNING;
        step = this.plan.getNextStep();
        if (!step) {
          logger.info('PlannerReAct no next step found, {sessionId}', {
            sessionId: this.sessionId,
          });
          logger.info(
            'PlannerReAct flow EXECUTING -> SUMMARIZING, {sessionId}',
            {
              sessionId: this.sessionId,
            },
          );
          this.status = FlowStatus.SUMMARIZING;
          continue;
        }

        logger.info(
          'PlannerReAct start to execute step, {sessionId}, {stepId}, {stepDescription}',
          {
            sessionId: this.sessionId,
            stepId: step.id,
            stepDescription: step.description.substring(0, 50),
          },
        );
        for await (const event of this.reactAgent.executeStep(
          this.plan,
          step,
          message,
        )) {
          yield event;
        }
        logger.info('PlannerReAct flow EXECUTING -> UPDATING, {sessionId}', {
          sessionId: this.sessionId,
        });
        this.status = FlowStatus.UPDATING;
      } else if (this.status === FlowStatus.UPDATING) {
        logger.info('PlannerReAct start to update plan', {
          sessionId: this.sessionId,
        });
        if (!this.plan) {
          logger.error('PlannerReAct no plan found', {
            sessionId: this.sessionId,
          });
          throw new InternalServerErrorException('No plan found');
        }
        if (!step) {
          logger.error('PlannerReAct no step found', {
            sessionId: this.sessionId,
          });
          throw new InternalServerErrorException('No next step found');
        }

        for await (const event of this.plannerAgent.updatePlan(
          this.plan,
          step,
        )) {
          yield event;
        }

        logger.info('PlannerReAct flow UPDATING -> EXECUTING', {
          sessionId: this.sessionId,
        });
        this.status = FlowStatus.EXECUTING;
      } else if (this.status === FlowStatus.SUMMARIZING) {
        logger.info('PlannerReAct start to summarize', {
          sessionId: this.sessionId,
        });
        for await (const event of this.reactAgent.summarize()) {
          yield event;
        }
        logger.info('PlannerReAct flow SUMMARIZING -> COMPLETED', {
          sessionId: this.sessionId,
        });
        this.status = FlowStatus.COMPLETED;
      } else if (this.status === FlowStatus.COMPLETED) {
        logger.info('PlannerReAct flow COMPLETED', {
          sessionId: this.sessionId,
        });
        if (!this.plan) {
          logger.error('PlannerReAct no plan found', {
            sessionId: this.sessionId,
          });
          throw new InternalServerErrorException('No plan found');
        }

        this.plan.status = ExecutionStatus.COMPLETED;
        this.status = FlowStatus.IDLE;
        yield new PlanEvent({
          status: PlanEventStatus.COMPLETED,
          plan: this.plan,
        });
        break;
      }
    }

    yield new DoneEvent();
    logger.info('PlannerReAct flow completed', { sessionId: this.sessionId });
  }

  done(): boolean {
    return this.status === FlowStatus.IDLE;
  }
}
