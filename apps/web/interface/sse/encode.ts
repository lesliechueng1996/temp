import type { Event } from '@/domain/model/event';

export function encodeSseDataJson(payload: Event): Uint8Array {
  const text = JSON.stringify(payload);
  const eventType = payload.type;
  return new TextEncoder().encode(`event: ${eventType}\ndata: ${text}\n\n`);
}
