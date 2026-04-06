import { type Event, PlanEvent, PlanEventStatus } from '@/domain/model/event';
import type { Message } from '@/domain/model/message';
import { Plan, Step } from '@/domain/model/plan';
import { logger } from '@/infrastructure/logger';
import {
  formatCreatePlanPrompt,
  formatUpdatePlanPrompt,
  plannerSystemPrompt,
} from '../prompts/planner';
import { systemPrompt } from '../prompts/system';
import { BaseAgent } from './base';

const plannerAgentSystemPrompt = systemPrompt + plannerSystemPrompt;

export class PlannerAgent extends BaseAgent {
  protected readonly name: string = 'planner';
  protected readonly systemPrompt: string = plannerAgentSystemPrompt;
  protected readonly format: string = 'json_object';
  protected readonly toolChoice: string = 'none';

  async *createPlan(message: Message): AsyncGenerator<Event> {
    const query = formatCreatePlanPrompt(
      message.message,
      message.attachments.join('\n'),
    );

    for await (const event of this.invoke(query)) {
      if (event.type === 'message') {
        logger.info(`Planner agent generated plan, message: {data}`, {
          data: event.message,
        });

        const parsedJson = this.jsonParser.parse(
          event.message,
        ) as Partial<Plan>;
        const plan = new Plan(parsedJson);

        yield new PlanEvent({
          plan,
          status: PlanEventStatus.CREATED,
        });
      } else {
        yield event;
      }
    }
  }

  async *updatePlan(plan: Plan, step: Step): AsyncGenerator<Event> {
    const query = formatUpdatePlanPrompt(
      JSON.stringify(plan),
      JSON.stringify(step),
    );

    for await (const event of this.invoke(query)) {
      if (event.type === 'message') {
        logger.info(`Planner agent updated plan, message: ${event.message}`);

        const parsedJson = this.jsonParser.parse(
          event.message,
        ) as Partial<Plan>;
        const updatePlan = new Plan(parsedJson);

        const newSteps = updatePlan.steps.map((step) => new Step(step));

        const firstUnfinishedIndex = plan.steps.findIndex(
          (step) => !step.isDone(),
        );

        if (firstUnfinishedIndex >= 0) {
          const updatedSteps = plan.steps
            .slice(0, firstUnfinishedIndex)
            .concat(newSteps);
          plan.steps = updatedSteps;
        }

        yield new PlanEvent({
          plan,
          status: PlanEventStatus.UPDATED,
        });
      } else {
        yield event;
      }
    }
  }
}
