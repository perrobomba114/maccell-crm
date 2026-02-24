import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
async function run() {
    try {
        const result = await streamText({
            model: google('gemini-2.0-flash-exp'),
            messages: [{
                role: 'user', content: [
                    { type: 'text', text: 'test' },
                    { type: 'image', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' }
                ]
            }]
        });
        console.log("Stream initialized successfully.", !!result.toDataStreamResponse, !!result.toUIMessageStreamResponse);
    } catch (e) {
        console.error("Caught error:", e.message, e.status);
    }
}
run();
