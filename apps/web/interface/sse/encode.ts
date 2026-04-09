import type { Event } from '@/domain/model/event';
import { toSSEEvent } from '@/interface/schema/event';

export function encodeSseDataJson(payload: Event): Uint8Array {
  const sseEvent = toSSEEvent(payload);
  if (!sseEvent) {
    throw new Error('Unknown event type');
  }
  const text = JSON.stringify(sseEvent.data);
  const eventType = sseEvent.event;
  return new TextEncoder().encode(`event: ${eventType}\ndata: ${text}\n\n`);
}
