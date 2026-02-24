const { streamText } = require("ai");
const { createOpenRouter } = require("@openrouter/ai-sdk-provider");
require("dotenv").config();

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
async function run() {
    try {
        const res = await streamText({
            model: openrouter(process.env.OPENROUTER_MODEL),
            messages: [
                {
                    role: 'user', content: [
                        { type: 'text', text: 'what is this' },
                        { type: 'image', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2NkYGD4z8DAwMgAI0AMDA4FAwH/W1MAAAAASUVORK5CYII=' }
                    ]
                }
            ]
        });
        for await (const chunk of res.textStream) {
            process.stdout.write(chunk);
        }
        console.log();
    } catch (e) {
        console.error("Caught Stream Error:", e.name, e.message);
    }
}
run();
