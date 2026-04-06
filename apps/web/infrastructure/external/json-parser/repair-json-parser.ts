import { jsonrepair } from 'jsonrepair';
import type { JsonParser } from '@/domain/external/json-parser';
import { logger } from '@/infrastructure/logger';

export class RepairJsonParser implements JsonParser {
  async parse(
    json: string,
    defaultValue?: unknown,
  ): Promise<
    Record<string, unknown> | Array<Record<string, unknown>> | unknown
  > {
    logger.info(`Repairing JSON: ${json}`);
    if (!json || json.trim() === '') {
      if (defaultValue) {
        return defaultValue;
      }
      throw new Error('JSON is empty and no default value provided');
    }
    return JSON.parse(jsonrepair(json));
  }
}
