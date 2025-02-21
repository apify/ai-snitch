import { Actor, log } from 'apify';
import { Emitter } from 'bee-agent-framework/emitter/emitter';
import { AnyToolSchemaLike } from 'bee-agent-framework/internals/helpers/schema';
import { JSONToolOutput, Tool, ToolEmitter, ToolInput } from 'bee-agent-framework/tools/base';
import { createMermaidRenderer } from 'mermaid-isomorphic';
import { z } from 'zod';
import crypto from 'crypto';
import { entitySchema, relationSchema } from '../schemas.js';

interface DataSaverToolOutput { }

const inputSchema = z.object({
    mermaidCode: z.string().describe('Diagram of entities and their relations in mermaid format.'),
    entities: z.array(entitySchema).describe('Found entities.'),
    relations: z.array(relationSchema).describe('Relations of the found entities.'),
});

export class DataSaver extends Tool<JSONToolOutput<DataSaverToolOutput>> {
    override name: string = 'save-entities-and-relations';

    override description: string = 'Tool that saves found entities and their relations. It saves the raw data and also the generated mermaid diagram.';

    override inputSchema(): Promise<AnyToolSchemaLike> | AnyToolSchemaLike {
        return inputSchema;
    }

    public readonly emitter: ToolEmitter<ToolInput<this>, JSONToolOutput<DataSaverToolOutput>> = Emitter.root.child({
        namespace: ['tool', 'save_entities_and_relations'],
        creator: this,
    });

    protected async _run(input: ToolInput<this>): Promise<JSONToolOutput<DataSaverToolOutput>> {
        log.info(`Saving data to key value store`);
        const { mermaidCode }: z.infer<typeof inputSchema> = input;

        const hash = crypto.createHash('md5').update(mermaidCode).digest('hex');

        const codeFilename = `mermaid_diagram_${hash}.mermaid.md`;
        const svgFilename = `mermaid_diagram_${hash}.svg`;
        const dataFilename = `entities_relations_${hash}`;

        await Actor.setValue(dataFilename, input);
        await Actor.setValue(codeFilename, mermaidCode, { contentType: 'text/plain' });

        const renderer = createMermaidRenderer();

        log.info(`Generating mermaid code`);
        const [result] = await renderer([mermaidCode]);
        if (result.status !== 'fulfilled') {
            log.error('Failed to generate mermaid diagram');
        } else {
            await Actor.setValue(svgFilename, result.value.svg, { contentType: 'image/svg+xml' });
        }

        return new JSONToolOutput({});
    }

    static {
        // Makes the class serializable
        this.register();
    }
}
