import { Actor, log } from 'apify';
import { Emitter } from 'bee-agent-framework/emitter/emitter';
import { AnyToolSchemaLike } from 'bee-agent-framework/internals/helpers/schema';
import { JSONToolOutput, Tool, ToolEmitter, ToolInput } from 'bee-agent-framework/tools/base';
import { z } from 'zod';

type PDFFile = {
    url: string,
    text: string,
    index: number,
}

interface InstagramScrapeToolOutput {
    pdfFiles: PDFFile[],
}

const ACTOR_NAME = 'jirimoravcik/pdf-text-extractor';

const inputSchema = z.object({
    urls: z.array(z.string().url()).min(1).describe('List of urls that contain PDF files that should be loaded.'),
}).required({ urls: true });

/**
 * This only works for PDFs with actual text. When OCR would be needed, this fails.
 */
export class PDFLoaderTool extends Tool<JSONToolOutput<InstagramScrapeToolOutput>> {
    override name: string = 'pdf-load-as-text';

    override description: string = 'Tool to load pdf files as text.';

    override inputSchema(): Promise<AnyToolSchemaLike> | AnyToolSchemaLike {
        return inputSchema;
    }

    public readonly emitter: ToolEmitter<ToolInput<this>, JSONToolOutput<InstagramScrapeToolOutput>> = Emitter.root.child({
        namespace: ['tool', 'load_pdf_as_text'],
        creator: this,
    });

    protected async _run(input: ToolInput<this>): Promise<JSONToolOutput<InstagramScrapeToolOutput>> {
        const { urls }: z.infer<typeof inputSchema> = input;

        log.info(`Reading PDFs using Actor ${ACTOR_NAME}...`);
        const run = await Actor.apifyClient.actor(ACTOR_NAME).call({
            urls,
            performChunking: false,
        });
        if (!run) {
            throw new Error(`Failed to start the Actor ${ACTOR_NAME}`);
        }

        const datasetItems = await Actor.apifyClient.dataset(run.defaultDatasetId).listItems();
        const files: PDFFile[] = [];

        for (const item of datasetItems.items) {
            const file = {
                url: item.url as string,
                text: item.text as string,
                index: item.index as number,
            };

            // Only include posts with all required fields
            if (!file.url || !file.text) {
                log.warning('Skipping file with missing fields:', item);
                continue;
            }

            files.push(file);
        }

        return new JSONToolOutput({ pdfFiles: files });
    }

    static {
        // Makes the class serializable
        this.register();
    }
}
