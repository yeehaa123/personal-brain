// Anthropic embeddings test
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Log the available properties on the client
console.log("Available properties on Anthropic client:", Object.keys(anthropic));
console.log("Client constructor name:", anthropic.constructor.name);

// Try to see if there are any methods that might be related to embeddings
const proto = Object.getPrototypeOf(anthropic);
console.log("Prototype methods:", Object.getOwnPropertyNames(proto));

// Check if beta features exist
if (anthropic.beta) {
  console.log("Beta features available:", Object.keys(anthropic.beta));
}

// Output results to a file for reference
fs.writeFileSync('anthropic-api-investigation.txt', 
  JSON.stringify({
    properties: Object.keys(anthropic),
    prototype: Object.getOwnPropertyNames(proto),
    beta: anthropic.beta ? Object.keys(anthropic.beta) : null
  }, null, 2)
);

console.log("Investigation complete, check anthropic-api-investigation.txt for results");
