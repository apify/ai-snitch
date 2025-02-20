import { Actor, log } from 'apify';
import { Emitter } from 'bee-agent-framework/emitter/emitter';
import { AnyToolSchemaLike } from 'bee-agent-framework/internals/helpers/schema';
import { JSONToolOutput, Tool, ToolEmitter, ToolInput } from 'bee-agent-framework/tools/base';
import { createMermaidRenderer } from 'mermaid-isomorphic';
import { z } from 'zod';

type InstagramScrapeToolOutput = {
    codeFilename: string,
    svgFilename: string,
}

const inputSchema = z.object({
    mermaidCode: z.string().describe('Diagram in mermaid format'),
    filenameBase: z.string().describe('Name of file to generate'),
});

export class SaveMermaidDiagram extends Tool<JSONToolOutput<InstagramScrapeToolOutput>> {
    override name: string = 'save-mermaid-diagram';

    override description: string = 'Tool that saves mermaid diagram to key value store';

    override inputSchema(): Promise<AnyToolSchemaLike> | AnyToolSchemaLike {
        return inputSchema;
    }

    public readonly emitter: ToolEmitter<ToolInput<this>, JSONToolOutput<InstagramScrapeToolOutput>> = Emitter.root.child({
        namespace: ['tool', 'save_mermaid_diagram'],
        creator: this,
    });

    protected async _run(input: ToolInput<this>): Promise<JSONToolOutput<InstagramScrapeToolOutput>> {
        log.info(`Generating image using mermaid`);
        const { mermaidCode, filenameBase }: z.infer<typeof inputSchema> = input;

        const codeFilename = `mermaid_diagram_${filenameBase}.mermaid.md`;
        const svgFilename = `mermaid_diagram_${filenameBase}.svg`;

        await Actor.setValue(codeFilename, mermaidCode, { contentType: 'text/plain' });

        const renderer = createMermaidRenderer();

        const [result] = await renderer([mermaidCode]);
        if (result.status !== 'fulfilled') {
            throw new Error('Failed to generate mermaid diagram');
        }

        await Actor.setValue(svgFilename, result.value.svg, { contentType: 'image/svg+xml' });

        return new JSONToolOutput({
            codeFilename,
            svgFilename,
        });
    }

    static {
        // Makes the class serializable
        this.register();
    }
}
