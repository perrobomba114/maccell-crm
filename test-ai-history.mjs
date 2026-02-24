import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
async function run() {
    try {
        const result = await streamText({
            model: google('gemini-2.0-flash-exp'),
            messages: [
                {
                    role: 'user', content: [
                        { type: 'text', text: 'test' },
                        { type: 'image', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' }
                    ]
                },
                { role: 'assistant', content: 'hello' },
                { role: 'user', content: 'again' }
            ]
        });
        console.log("History test:", !!result.toUIMessageStreamResponse);
    } catch (e) {
        console.error("History test error:", e.message, e.status);
    }
}
run();
