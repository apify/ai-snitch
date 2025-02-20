import { log } from 'apify';
import * as cheerio from 'cheerio';
import { Emitter } from 'bee-agent-framework/emitter/emitter';
import { AnyToolSchemaLike } from 'bee-agent-framework/internals/helpers/schema';
import { JSONToolOutput, Tool, ToolEmitter, ToolInput } from 'bee-agent-framework/tools/base';
import { gotScraping } from 'got-scraping';
import { z } from 'zod';

interface RejstrikDocumentsOutput {
    documentDownloadLinks: string[];
}

const REJSTRIK_BASE_URL = 'https://or.justice.cz';
const REJSTRIK_BASE_UI_URL = `${REJSTRIK_BASE_URL}/ias/ui`;

const getRejstrikSearchUrl = (entityName: string) => `https://or.justice.cz/ias/ui/rejstrik-$firma?jenPlatne=PLATNE&nazev=${encodeURIComponent(entityName)}&polozek=50&typHledani=STARTS_WITH`;
const transformRejstrikRelativeUrl = (relativeUrl: string, baseUrl = REJSTRIK_BASE_UI_URL) => (relativeUrl.startsWith('./')
    ? `${baseUrl}${relativeUrl.substring(1)}`
    : `${baseUrl}${relativeUrl}`);

const getSingleDocumentContent = async (documentUrl: string) => {
    const documentDetailResponse = await gotScraping(documentUrl);

    const $documentDetail = cheerio.load(documentDetailResponse.body);

    const documentDetailDownloadLinks = $documentDetail('a[href^="/ias/content/download?id="]')
        .map((_, el) => $documentDetail(el).attr('href'))
        .get();

    log.debug(`Found ${documentDetailDownloadLinks.length} download links`);

    return documentDetailDownloadLinks.map((link) => transformRejstrikRelativeUrl(link, REJSTRIK_BASE_URL));
};

/**
 * @class RejstrikDocumentsScrapeTool
 * @extends Tool
 *
 * @description
 */
export class RejstrikDocumentsScrapeTool extends Tool<JSONToolOutput<RejstrikDocumentsOutput>> {
    override name: string = 'rejstrik_documents_scraper';

    override description: string = 'Tool to scrape all document links related to a company.';

    override inputSchema(): Promise<AnyToolSchemaLike> | AnyToolSchemaLike {
        return z.object({
            entityName: z.string().describe('Name of the entity'),
        }).required({ entityName: true });
    }

    public readonly emitter: ToolEmitter<ToolInput<this>, JSONToolOutput<RejstrikDocumentsOutput>> = Emitter.root.child({
        namespace: ['tool', 'rejstrik_documents_scrape'],
        creator: this,
    });

    protected async _run(input: ToolInput<this>): Promise<JSONToolOutput<RejstrikDocumentsOutput>> {
        const { entityName } = input;
        const entityDetailUrl = getRejstrikSearchUrl(entityName);

        log.debug(`Searching for entity: ${entityName} at url: ${entityDetailUrl}`);
        const entityDetailLinkResponse = await gotScraping(entityDetailUrl);

        const $entityDetail = cheerio.load(entityDetailLinkResponse.body);

        const entityDocumentsListLink = $entityDetail('a[href^="./vypis-sl-firma?subjektId="]')?.first()?.attr('href');

        if (!entityDocumentsListLink) {
            throw new Error('Entity not found');
        }

        log.debug(`Found entity detail link: ${entityDocumentsListLink}`);

        const entityDocumentsListResponse = await gotScraping(transformRejstrikRelativeUrl(entityDocumentsListLink));

        const $entityDocumentsList = cheerio.load(entityDocumentsListResponse.body);

        const entityDocumentsLinks = $entityDocumentsList('td > a')
            .map((_, el) => $entityDocumentsList(el).attr('href'))
            .get();

        log.debug(`Found ${entityDocumentsLinks.length} documents`);

        const documentsDetailLinks = await Promise.allSettled(entityDocumentsLinks.map(
            (documentLink) => getSingleDocumentContent(transformRejstrikRelativeUrl(documentLink)),
        ));

        const documentDownloadLinks = documentsDetailLinks.filter((o) => o.status === 'fulfilled').map((o) => o.value);

        log.debug(`Found ${documentDownloadLinks.length} document details. ${entityDocumentsLinks.length - documentDownloadLinks.length} requests failed`);

        const flatResult = documentDownloadLinks.flat();

        await downloadFile(flatResult.at(1), '/Users/jankirchner/Projects/Apify/ai-snitch');

        log.debug(`In total found ${flatResult.length} documents`);

        return new JSONToolOutput({ documentDownloadLinks: flatResult });
    }

    static {
        // Makes the class serializable
        this.register();
    }
}
