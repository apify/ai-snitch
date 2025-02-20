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
        const result = await gotScraping<OcrResult>('https://apipro1.ocr.space/parse/image', {
            method: 'POST',
            headers: {
                apiKey: process.env.OCR_API_KEY,
                'Content-type': 'multipart/form-data',
            },
            searchParams: {
                language: 'cze',
            },
            body: `data:application/pdf;base64,${fileBase64}`,
            http2: false,
        });

        console.log(result.body);

        return result.body.ParsedResults?.map(({ ParsedText }) => ParsedText)?.join('\n\n\n');
    } catch (err: unknown) {
        // @ts-expect-error exception
        console.log(err?.message);
        throw err;
    }
};
