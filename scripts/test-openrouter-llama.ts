import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import dotenv from "dotenv";

dotenv.config();

async function test() {
    console.log("Testing OpenRouter with different model...");
    const apiKey = process.env.OPENROUTER_API_KEY || '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';

    try {
        const openrouter = createOpenRouter({
            apiKey: apiKey,
        });

        const { text } = await generateText({
            model: openrouter("meta-llama/llama-3.2-1b-instruct:free"),
            prompt: "Hi",
        });

        console.log("Response:", text);
    } catch (error: any) {
        console.error("Failed:", error.message || error);
    }
}

test();
