import { ErrorEvent } from '@/domain/model/event';
import { chat } from '@/domain/service/agent-service';
import { handleRouteError } from '@/interface/schema/base';
import { sessionChatRequestSchema } from '@/interface/schema/session';
import { encodeSseDataJson } from '@/interface/sse/encode';

type Params = {
  params: Promise<{
    sessionId: string;
  }>;
};

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: Params) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const req = sessionChatRequestSchema.parse(body);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of chat(
            sessionId,
            req.message ?? '',
            req.attachments ?? [],
          )) {
            controller.enqueue(encodeSseDataJson(event));
          }
        } catch (error) {
          const errEvent = new ErrorEvent({
            error: error instanceof Error ? error.message : String(error),
          });
          controller.enqueue(encodeSseDataJson(errEvent));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
