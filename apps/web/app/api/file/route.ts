import { uploadFile } from '@/domain/service/file-service';
import { BadRequestException } from '@/interface/exception';
import { handleRouteError, WebResponse } from '@/interface/schema/base';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      throw new BadRequestException('Missing or invalid "file" field');
    }

    const record = await uploadFile(file);

    return Response.json(
      WebResponse.success({
        id: record.id,
        filename: record.filename,
        key: record.key,
        extension: record.extension,
        mimeType: record.mimeType,
        size: record.size,
      }),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
