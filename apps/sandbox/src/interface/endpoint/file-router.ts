import { Hono } from 'hono';
import {
  deleteFile,
  ensureFile,
  findFiles,
  readFile,
  readFileForDownload,
  replaceInFile,
  searchInFile,
  uploadFile,
  writeFile,
} from '../../service/file-service.js';
import { zValidator } from '../../util/validator-wrapper.js';
import { createSuccessResponse } from '../schema/base.js';
import {
  checkFileExistsRequestSchema,
  deleteFileRequestSchema,
  downloadFileRequestSchema,
  findFileRequestSchema,
  readFileRequestSchema,
  replaceInFileRequestSchema,
  searchInFileRequestSchema,
  writeFileRequestSchema,
} from '../schema/file.js';

const fileRouter = new Hono();

fileRouter.post(
  '/read-file',
  zValidator('json', readFileRequestSchema),
  async (c) => {
    const { filepath, startLine, endLine, sudo, maxLength } =
      c.req.valid('json');
    const result = await readFile(
      filepath,
      startLine,
      endLine,
      sudo,
      maxLength,
    );
    return c.json(createSuccessResponse(result));
  },
);

fileRouter.post(
  '/write-file',
  zValidator('json', writeFileRequestSchema),
  async (c) => {
    const { filepath, content, append, leadingNewline, trailingNewline, sudo } =
      c.req.valid('json');
    const result = await writeFile(
      filepath,
      content,
      append,
      leadingNewline,
      trailingNewline,
      sudo,
    );
    return c.json(createSuccessResponse(result));
  },
);

fileRouter.post(
  '/replace-in-file',
  zValidator('json', replaceInFileRequestSchema),
  async (c) => {
    const { filepath, oldStr, newStr, sudo } = c.req.valid('json');
    const result = await replaceInFile(filepath, oldStr, newStr, sudo);
    return c.json(createSuccessResponse(result));
  },
);

fileRouter.post(
  '/search-in-file',
  zValidator('json', searchInFileRequestSchema),
  async (c) => {
    const { filepath, regex, sudo } = c.req.valid('json');
    const result = await searchInFile(filepath, regex, sudo);
    return c.json(createSuccessResponse(result));
  },
);

fileRouter.post(
  '/find-files',
  zValidator('json', findFileRequestSchema),
  async (c) => {
    const { dirPath, globPattern } = c.req.valid('json');
    const result = await findFiles(dirPath, globPattern);
    return c.json(createSuccessResponse(result));
  },
);

fileRouter.post('/upload-file', async (c) => {
  const body = await c.req.parseBody();
  const file = body.file as File;
  const filepath = body.filepath as string;
  const result = await uploadFile(file, filepath);
  return c.json(createSuccessResponse(result));
});

fileRouter.post(
  '/download-file',
  zValidator('json', downloadFileRequestSchema),
  async (c) => {
    const { filepath } = c.req.valid('json');
    const { data, filename } = await readFileForDownload(filepath);
    return c.body(data, 200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    });
  },
);

fileRouter.post(
  '/check-file-exists',
  zValidator('json', checkFileExistsRequestSchema),
  async (c) => {
    const { filepath } = c.req.valid('json');
    try {
      ensureFile(filepath);
      return c.json(
        createSuccessResponse({
          filepath,
          exists: true,
        }),
      );
    } catch {
      return c.json(
        createSuccessResponse({
          filepath,
          exists: false,
        }),
      );
    }
  },
);

fileRouter.post(
  '/delete-file',
  zValidator('json', deleteFileRequestSchema),
  async (c) => {
    const { filepath } = c.req.valid('json');
    const result = await deleteFile(filepath);
    return c.json(createSuccessResponse(result));
  },
);

export default fileRouter;
