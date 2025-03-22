import { EmbeddingService } from './src/mcp/model/embeddings.ts';

async function testEmbedding() {
  const service = new EmbeddingService();
  
  console.log("Testing real embedding with direct API call");
  
  try {
    const result = await service.getEmbedding("This is a test text for embedding generation using Anthropic's API.");
    console.log("Embedding result received:", {
      dimensions: result.embedding.length,
      truncated: result.truncated,
      sampleValues: result.embedding.slice(0, 5) // Show first 5 values
    });
  } catch (error) {
    console.error("Error in test:", error);
  }
}

testEmbedding();
