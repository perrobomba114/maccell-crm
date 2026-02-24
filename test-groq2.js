const { streamText } = require("ai");
const { createGroq } = require("@ai-sdk/groq");
require("dotenv").config();

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
async function run() {
  try {
    const res = await streamText({
      model: groq('llama-3.2-11b-vision-preview'),
      messages: [
        { role: 'user', content: [
          { type: 'text', text: 'what is this' },
          { type: 'image', image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQIW2NkYGD4z8DAwMgAI0AMDA4FAwH/W1MAAAAASUVORK5CYII=' }
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
