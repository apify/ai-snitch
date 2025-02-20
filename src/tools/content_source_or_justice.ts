import { Actor, log } from 'apify';
import { CheerioCrawler } from 'crawlee';
import { Emitter } from 'bee-agent-framework/emitter/emitter';
import { AnyToolSchemaLike } from 'bee-agent-framework/internals/helpers/schema';
import { JSONToolOutput, Tool, ToolEmitter, ToolInput } from 'bee-agent-framework/tools/base';
import { z } from 'zod';
import { pdfToText } from '../utils/pdfToText.js';

interface ContentSourceOrJusticeToolOutput {
    files: string[],
}

const inputSchema = z.object({
    search: z.string().describe('Name of company to search for.'),
});

export class ContentSourceOrJustice extends Tool<JSONToolOutput<ContentSourceOrJusticeToolOutput>> {
    override name: string = 'download-data-from-or-justice';

    override description: string = 'Tool for downloading data from OR Justice.';

    private filenameCounter: number = 0;

    override inputSchema(): Promise<AnyToolSchemaLike> | AnyToolSchemaLike {
        return inputSchema;
    }

    public readonly emitter: ToolEmitter<ToolInput<this>, JSONToolOutput<ContentSourceOrJusticeToolOutput>> = Emitter.root.child({
        namespace: ['tool', 'download_data_from_or_justice'],
        creator: this,
    });

    private getNextFilename(extension: string): string {
        return `file_${this.filenameCounter++}.${extension}`;
    }

    protected async _run(input: ToolInput<this>): Promise<JSONToolOutput<ContentSourceOrJusticeToolOutput>> {
        const { search } = input as z.infer<typeof inputSchema>;
        const proxyConfiguration = await Actor.createProxyConfiguration();

        const LABELS = {
            START: 'START',
            SBIRKA_LISTIN: 'SBIRKA_LISTIN',
            LISTINA: 'LISTINA',
        };

        const encodedFiles: string[] = [];

        const crawler = new CheerioCrawler({
            proxyConfiguration,
            maxRequestsPerCrawl: 100,
            requestHandler: async ({ enqueueLinks, request, $, sendRequest }) => {
                if (request.label === LABELS.START) {
                    log.info('Enqueuing urls from search page...');
                    await enqueueLinks({
                        selector: 'a[href^="./vypis-sl"]',
                        label: LABELS.SBIRKA_LISTIN,
                    });
                } else if (request.label === LABELS.SBIRKA_LISTIN) {
                    log.info('Enqueuing URLs from document list...');
                    await enqueueLinks({
                        selector: 'a[href^="./vypis-sl-detail"]',
                        label: LABELS.LISTINA,
                    });
                } else if (request.label === LABELS.LISTINA) {
                    for (const link of $('a[href^=/ias/content/download]').toArray()) {
                        log.info('Downloading document...');
                        const downloadUrl = `https://or.justice.cz${link.attribs.href}`;
                        const response = await sendRequest({ url: downloadUrl });
                        const contentType = response.rawHeaders[response.rawHeaders.findIndex((h) => h.toLowerCase() === 'content-type') + 1];
                        const extension = contentType.split('/').pop();
                        const filename = this.getNextFilename(extension as string);

                        await Actor.setValue(filename, response.rawBody, { contentType });
                        await Actor.pushData({ type: 'downloadedFile', url: request.loadedUrl, filename });
                        encodedFiles.push(response.rawBody.toString('base64'));
                    }
                }
            },
        });

        const startUrl = new URL('https://or.justice.cz/ias/ui/rejstrik-$firma');
        startUrl.searchParams.set('jenPlatne', 'PLATNE');
        startUrl.searchParams.set('polozek', '1');
        startUrl.searchParams.set('typHledani', 'STARTS_WITH');
        startUrl.searchParams.set('nazev', search);

        await crawler.run([
            { url: startUrl.toString(), label: LABELS.START },
        ]);

        const textContent = await Promise.allSettled(encodedFiles.map(pdfToText));

        return new JSONToolOutput({ files: textContent });
    }

    static {
        // Makes the class serializable
        this.register();
    }
}
