import { RepairJsonParser } from '@/infrastructure/external/json-parser/repair-json-parser';

export interface JsonParser {
  parse(
    json: string,
    defaultValue?: unknown,
  ): Record<string, unknown> | Array<Record<string, unknown>> | unknown;
}

export const getJsonParser = async (): Promise<JsonParser> => {
  return new RepairJsonParser();
};
