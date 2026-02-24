const { streamText } = require("ai");
const { createGoogleGenerativeAI } = require("@ai-sdk/google");
require("dotenv").config();

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });
async function run() {
  try {
    const res = await streamText({
      model: google('gemini-2.0-flash'),
      messages: [
        { role: 'user', content: [
          { type: 'text', text: 'analyza' },
          { type: 'image', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' }
        ]}
      ]
    });
    for await (const chunk of res.textStream) {
       console.log(chunk);
    }
    console.log("Success with Gemini 2.0 Flash");
  } catch (e) {
    console.error("Error from AI:", e);
  }
}
run();
