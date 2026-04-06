import { handleRouteError } from '@/interface/schema/base';
import { sessionChatRequestSchema } from '@/interface/schema/session';

type Params = {
  params: Promise<{
    sessionId: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const req = sessionChatRequestSchema.parse(body);
  } catch (error) {
    return handleRouteError(error);
  }
}
