import { downloadFile } from '@/domain/service/file-service';
import { handleRouteError } from '@/interface/schema/base';

type Params = {
  params: Promise<{
    fileId: string;
  }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { fileId } = await params;
    const { file, data } = await downloadFile(fileId);

    const filenameStar = encodeURIComponent(file.filename).replace(/'/g, '%27');

    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${filenameStar}`,
        'Content-Length': String(data.length),
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
