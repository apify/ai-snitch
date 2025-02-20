import { Actor, log } from 'apify';
import { CheerioCrawler } from 'crawlee';
import { Emitter } from 'bee-agent-framework/emitter/emitter';
import { AnyToolSchemaLike } from 'bee-agent-framework/internals/helpers/schema';
import { JSONToolOutput, Tool, ToolEmitter, ToolInput } from 'bee-agent-framework/tools/base';
import { z } from 'zod';
import { pdfToText } from '../utils/pdfToText.js';

const getHeaderValue = (rawHeaders: string[], name: string): string | null | undefined => {
    return rawHeaders[rawHeaders.findIndex((h) => h.toLowerCase() === name) + 1];
};

// TODO: File counter + search prefix + search normalization
const getFileMetadata = (rawHeaders: string[]) => {
    const contentType = getHeaderValue(rawHeaders, 'content-type') ?? 'text/plain';
    const filename = getHeaderValue(rawHeaders, 'content-disposition')?.match(/filename="(.*)"/)?.[1] || 'unknown';

    return {
        contentType,
        filename: filename.replace(/[^a-zA-Z0-9_.-]/g, '-'),
    };
};

interface ContentSourceOrJusticeToolOutput {
    files: string[],
}

const inputSchema = z.object({
    companyName: z.string().describe('Name of company to search for.'),
});

export class ContentSourceOrJustice extends Tool<JSONToolOutput<ContentSourceOrJusticeToolOutput>> {
    override name: string = 'download-data-from-or-justice';

    override description: string = 'Tool for downloading data from Czech company listing "Obchodní rejstřík" Justice (OR Justice).';

    private filenameCounter: number = 0;

    override inputSchema(): Promise<AnyToolSchemaLike> | AnyToolSchemaLike {
        return inputSchema;
    }

    public readonly emitter: ToolEmitter<ToolInput<this>, JSONToolOutput<ContentSourceOrJusticeToolOutput>> = Emitter.root.child({
        namespace: ['tool', 'download_data_from_or_justice'],
        creator: this,
    });

    private async getRecords(companyName: string): Promise<string[]> {
        // This might bring issues for companies with similar names, but let's ignore that for now.
        // TODO: Normalization should be by calling rejstrik!
        const companyNameNormalized = companyName.replace(/[^a-zA-Z0-9_.-]/g, '-').toLowerCase();
        const stateKey = `content-source-or-justice-download-state-${companyNameNormalized}`;
        const state: { finished: boolean, files: string[] } = (await Actor.getValue(stateKey)) || {
            finished: false,
            files: [],
        };
        if (state.finished) {
            return state.files;
        }

        const LABELS = {
            START: 'START',
            SBIRKA_LISTIN: 'SBIRKA_LISTIN',
            LISTINA: 'LISTINA',
        } as const;

        const crawler = new CheerioCrawler({
            proxyConfiguration: await Actor.createProxyConfiguration(),
            maxRequestsPerCrawl: 100,
            maxConcurrency: 4,
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
                        // TODO: This limit might be too low - but the context length needs to be respected!!!
                        limit: 5,
                        selector: 'a[href^="./vypis-sl-detail"]',
                        label: LABELS.LISTINA,
                    });
                } else if (request.label === LABELS.LISTINA) {
                    for (const link of $('a[href^=/ias/content/download]').toArray()) {
                        log.info('Downloading document...');
                        const downloadUrl = `https://or.justice.cz${link.attribs.href}`;
                        const response = await sendRequest({ url: downloadUrl });
                        // For some reason, we can only access raw headers
                        const { contentType, filename } = getFileMetadata(response.rawHeaders);
                        await Actor.setValue(filename, response.rawBody, { contentType });
                        // Update and persist state
                        state.files.push(filename);
                        await Actor.setValue(stateKey, state);
                    }
                }
            },
        });

        const startUrl = new URL('https://or.justice.cz/ias/ui/rejstrik-$firma');
        startUrl.searchParams.set('jenPlatne', 'PLATNE');
        startUrl.searchParams.set('polozek', '1');
        startUrl.searchParams.set('typHledani', 'STARTS_WITH');
        startUrl.searchParams.set('nazev', companyName);

        await crawler.run([
            { url: startUrl.toString(), label: LABELS.START },
        ]);

        // Persist state
        state.finished = true;
        await Actor.setValue(stateKey, state);

        return state.files;
    }

    protected async _run(input: ToolInput<this>): Promise<JSONToolOutput<ContentSourceOrJusticeToolOutput>> {
        const { companyName } = input as z.infer<typeof inputSchema>;

        // TODO: Duplicate code
        const companyNameNormalized = companyName.replace(/[^a-zA-Z0-9_.-]/g, '-').toLowerCase();
        const stateKey = `content-source-or-justice-ocr-state-${companyNameNormalized}`;
        const state: { finished: boolean, files: string[] } = (await Actor.getValue(stateKey)) || {
            finished: false,
            files: [],
        };

        if (state.finished) {
            return new JSONToolOutput({ files: state.files });
        }

        const records = await this.getRecords(companyName);

        for (const record of records) {
            // Only deal with PDF files
            if (!record.endsWith('.pdf')) continue;
            // TODO: This does not work well when we're re-running the actor
            const data: Buffer | null = await Actor.getValue(record);
            if (!data) {
                log.error('File not found', { record });
                continue;
            }
            const text = await pdfToText(data.toString('base64'));
            state.files.push(text);
        }

        state.finished = true;
        await Actor.setValue(stateKey, state);

        return new JSONToolOutput({ files: state.files });
    }

    static {
        // Makes the class serializable
        this.register();
    }
}
