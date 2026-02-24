import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import dotenv from "dotenv";

dotenv.config();

async function test() {
    console.log("Testing OpenRouter connectivity...");
    const apiKey = process.env.OPENROUTER_API_KEY || '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';
    console.log("Using API Key:", apiKey.substring(0, 10) + "...");

    try {
        const openrouter = createOpenRouter({
            apiKey: apiKey,
            headers: {
                "HTTP-Referer": "https://sistema.maccell.com.ar",
                "X-Title": "Maccell CRM Test",
            }
        });

        const { text } = await generateText({
            model: openrouter("google/gemini-2.0-flash-lite-preview-02-05:free"),
            prompt: "Hola, ¿estás ahí? Responde solo 'OK'.",
        });

        console.log("Response from OpenRouter:", text);
    } catch (error) {
        console.error("OpenRouter Test Failed:", error);
    }
}

test();
