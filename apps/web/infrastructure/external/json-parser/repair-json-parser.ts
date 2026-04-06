import { jsonrepair } from 'jsonrepair';
import type { JsonParser } from '@/domain/external/json-parser';
import { logger } from '@/infrastructure/logger';

export class RepairJsonParser implements JsonParser {
  parse(
    json: string,
    defaultValue?: unknown,
  ):
    | Record<string, unknown>
    | Array<Record<string, unknown>>
    | unknown {
    logger.info('Repairing JSON: {data}', { data: json });
    if (!json || json.trim() === '') {
      if (defaultValue) {
        return defaultValue;
      }
      throw new Error('JSON is empty and no default value provided');
    }
    try {
      const result = JSON.parse(jsonrepair(json));
      logger.info('Repaired JSON: {data}', { data: result });
      return result;
    } catch (error) {
      logger.error('Failed to repair JSON: {error}', { error });
      throw error;
    }
  }
}
