import { NoteContext } from './src/mcp/context/noteContext';
import { nanoid } from 'nanoid';

async function createTestNote() {
  const context = new NoteContext();
  
  const id = nanoid();
  const testNote = {
    id,
    title: "Test Embedding Serialization",
    content: "This is a test note to verify that embeddings are properly serialized and deserialized when stored in the database.",
    tags: ["test", "embedding"],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  try {
    console.log(`Creating test note with ID: ${id}`);
    await context.createNote(testNote);
    console.log("Note created successfully");
    
    // Now try to retrieve it
    console.log("Retrieving created note...");
    const retrievedNote = await context.getNoteById(id);
    console.log("Retrieved note:", {
      id: retrievedNote?.id,
      title: retrievedNote?.title,
      hasEmbedding: Boolean(retrievedNote?.embedding),
      embeddingLength: retrievedNote?.embedding ? retrievedNote.embedding.length : 0,
      embeddingSample: retrievedNote?.embedding ? retrievedNote.embedding.slice(0, 5) : []
    });
    
    // Try a semantic search
    console.log("\nTesting semantic search...");
    const results = await context.searchNotes({
      query: "serialization embedding test",
      limit: 1,
      semanticSearch: true
    });
    
    console.log(`Search found ${results.length} notes`);
    if (results.length > 0) {
      console.log("Top result:", {
        id: results[0].id,
        title: results[0].title,
        hasEmbedding: Boolean(results[0].embedding)
      });
    }
    
  } catch (error) {
    console.error("Error in test:", error);
  }
}

createTestNote();
