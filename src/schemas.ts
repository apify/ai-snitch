import { z } from 'zod';

export const entitySchema = z.object({
    identifier: z.string().describe('String identifier of entity. Eg. person-001 or organization-123'),
    businessId: z.string().nullable().optional().describe('Business ID of the entity if assigned.'),
    type: z.enum(['person', 'organization']),
    description: z.string(),
});

export const relationSchema = z.object({
    sourceEntityId: z.string().nullable().describe('Identifier of the source entity'),
    targetEntityId: z.string().nullable().describe('Identifier of the target entity'),
    relationType: z.string().nullable().describe('The type of relation between the two entities.'),
    description: z.string().nullable().describe('Brief description of the relationship between the two entities.'),
    startedAt: z.string().nullable().describe('Date when the relation has started.'),
    endedAt: z.string().nullable().describe('Date when the relation has ended.'),
}).required({}).describe('Relation between source and target entity');
