import { createSession } from '@/domain/service/session-service';
import { WebResponse } from '@/interface/schema/base';

export async function POST(_: Request) {
  const session = await createSession();
  return Response.json(
    WebResponse.success({
      sessionId: session.id,
    }),
  );
}
