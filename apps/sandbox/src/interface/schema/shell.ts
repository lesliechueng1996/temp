import { z } from 'zod';

export const execCommandRequestSchema = z.object({
  sessionId: z
    .string()
    .nullable()
    .optional()
    .default(null)
    .describe('Unique identifier for the target shell session'),
  execDir: z
    .string()
    .nullable()
    .optional()
    .default(null)
    .describe(
      'Working directory for command execution (must be an absolute path)',
    ),
  command: z.string().describe('The shell command to execute'),
});

export const viewShellRequestSchema = z.object({
  sessionId: z
    .string()
    .min(1)
    .describe('Unique identifier for the target shell session'),
  console: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to include console records'),
});

export const waitForProcessRequestSchema = z.object({
  sessionId: z
    .string()
    .min(1)
    .describe('Unique identifier for the target shell session'),
  seconds: z
    .int()
    .min(1)
    .optional()
    .default(60)
    .describe('The duration to wait for the process to finish'),
});

export const writeToProcessRequestSchema = z.object({
  sessionId: z
    .string()
    .min(1)
    .describe('Unique identifier for the target shell session'),
  inputText: z
    .string()
    .min(1)
    .describe('The input text to write to the process'),
  pressEnter: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to press the Enter key after input'),
});

export const shellKillRequestSchema = z.object({
  sessionId: z
    .string()
    .min(1)
    .describe('Unique identifier for the target shell session'),
});
