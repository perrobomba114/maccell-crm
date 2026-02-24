const { streamText } = require("ai");
const { createGroq } = require("@ai-sdk/groq");
require("dotenv").config();

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
async function run() {
  try {
    const res = await streamText({
      model: groq('meta-llama/llama-4-maverick-17b-128e-instruct'),
      messages: [
        { role: 'user', content: [
          { type: 'text', text: 'what is this image?' },
          { type: 'image', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' }
        ]}
      ]
    });
    for await (const chunk of res.textStream) {
       process.stdout.write(chunk);
    }
    console.log();
  } catch (e) {
    console.error("Error from AI:", e);
  }
}
run();
