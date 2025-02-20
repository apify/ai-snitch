import { z } from 'zod';

export const entitySchema = z.object({
    identifier: z.string(),
    type: z.enum(['person', 'organization']),
    description: z.string(),
});

export const relationSchema = z.object({
    sourceEntityId: z.string(),
    targetEntityId: z.string(),
    relationType: z.string(),
    description: z.string(),
});
