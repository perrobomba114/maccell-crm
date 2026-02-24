const ai = require("ai");
console.log(Object.keys(ai).filter(k => k === 'fallback' || k === 'streamText'));
