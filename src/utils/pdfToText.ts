import { gotScraping } from 'got-scraping';

export const pdfToText = async (fileBase64: string) => {
    const result = await gotScraping('https://api.ocr.space/parse/image', {
        method: 'POST',
        searchParams: {
            apiKey: 'K87959486588957',
            base64Image: fileBase64,
        },
    });

    console.log(result.body);
    return result.body;
};
