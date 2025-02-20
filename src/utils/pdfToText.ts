import { log } from 'apify';
import { gotScraping } from 'got-scraping';

type OcrResult = {
    ParsedResults: {
        ParsedText: string,
    }[]
}

export const pdfToText = async (fileBase64: string) => {
    log.debug('PDF to text called');

    try {
        const result = await gotScraping('https://apipro1.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                apiKey: process.env.OCR_API_KEY,
                'Content-type': 'application/x-www-form-urlencoded',
            },
            searchParams: {
                language: 'cze',
            },
            form: {
                base64Image: `data:application/pdf;base64,${fileBase64}`,
            },
            http2: false,
        });

        const parsedPages = (JSON.parse(result.body) as OcrResult)?.ParsedResults?.map(({ ParsedText }) => ParsedText);

        log.debug(`Parsed ${parsedPages?.length ?? 0} pages`);

        if (!parsedPages?.length) console.log(result.body);

        return parsedPages?.join('\n\n\n');
    } catch (err: unknown) {
        // @ts-expect-error exception
        console.log(err?.message);
        throw err;
    }
};
