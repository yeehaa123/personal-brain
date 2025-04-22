import { describe, expect, test } from 'bun:test';


import type { ExternalSourceResult } from '@/contexts/externalSources/sources';
import { PromptFormatter } from '@/protocol/components/promptFormatter';
import type { Note } from '@models/note';
import type { Profile } from '@models/profile';
import { createMockNote } from '@test/__mocks__/models/note';
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';




describe('PromptFormatter', () => {
  const promptFormatter = PromptFormatter.createFresh();

  // Test data
  const sampleNotes: Note[] = [
    createMockNote('note-1', 'Quantum Computing Basics', ['quantum', 'computing', 'science']),
    createMockNote('note-2', 'Quantum Entanglement', ['quantum', 'physics']),
  ];
  
  // Customize the notes with specific contents and embeddings
  sampleNotes[0].content = 'Quantum computing uses quantum bits or qubits which can exist in multiple states simultaneously.';
  sampleNotes[0].embedding = MockEmbeddingService.createMockEmbedding('Quantum computing basics');
  sampleNotes[0].createdAt = new Date('2025-01-01');
  sampleNotes[0].updatedAt = new Date('2025-01-02');
  
  sampleNotes[1].content = 'Quantum entanglement is a physical phenomenon that occurs when a pair of particles interact in such a way that the quantum state of each particle cannot be described independently of the others.';
  sampleNotes[1].embedding = MockEmbeddingService.createMockEmbedding('Quantum entanglement');
  sampleNotes[1].createdAt = new Date('2025-01-03');
  sampleNotes[1].updatedAt = new Date('2025-01-04');

  const sampleProfile: Profile = {
    id: 'profile-1',
    publicIdentifier: null,
    profilePicUrl: null,
    backgroundCoverImageUrl: null,
    firstName: 'Jan Hein',
    lastName: 'Hoogstad',
    fullName: 'Jan Hein Hoogstad',
    followerCount: null,
    headline: 'Quantum Physicist | AI Researcher',
    occupation: 'Quantum Physicist',
    city: 'Amsterdam',
    country: 'nl',
    countryFullName: 'Netherlands',
    state: null,
    summary: 'Researching quantum computing applications in artificial intelligence.',
    experiences: [
      {
        company: 'Quantum Labs',
        title: 'Lead Researcher',
        starts_at: { day: 1, month: 1, year: 2020 },
        ends_at: null,
        description: 'Leading research in quantum computing applications.',
        company_linkedin_profile_url: null,
        company_facebook_profile_url: null,
        location: null,
        logo_url: null,
      },
    ],
    education: null,
    languages: ['TypeScript', 'Python', 'Q#'],
    languagesAndProficiencies: null,
    accomplishmentPublications: null,
    accomplishmentHonorsAwards: null,
    accomplishmentProjects: null,
    volunteerWork: null,
    embedding: MockEmbeddingService.createMockEmbedding('Quantum researcher profile'),
    tags: ['quantum', 'research', 'AI'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleExternalSources: ExternalSourceResult[] = [
    {
      title: 'Recent Advances in Quantum Computing',
      source: 'Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Quantum_computing',
      content: 'Recent advances in quantum computing include improvements in error correction and qubit stability.',
      sourceType: 'encyclopedia',
      timestamp: new Date(),
      confidence: 0.95,
    },
  ];

  test('should format prompts with notes only', () => {
    const { formattedPrompt, citations } = promptFormatter.formatPromptWithContext(
      'Explain quantum computing',
      sampleNotes,
    );
    
    // Check the prompt structure
    expect(formattedPrompt).toContain('I have the following information in my personal knowledge base:');
    expect(formattedPrompt).toContain('INTERNAL CONTEXT [1]:');
    expect(formattedPrompt).toContain('Title: Quantum Computing Basics');
    expect(formattedPrompt).toContain('Tags: quantum, computing, science');
    expect(formattedPrompt).toContain('INTERNAL CONTEXT [2]:');
    expect(formattedPrompt).toContain('Based on this information, please answer my question:');
    expect(formattedPrompt).toContain('Explain quantum computing');
    
    // Check citations
    expect(citations).toHaveLength(2);
    expect(citations[0].noteId).toBe('note-1');
    expect(citations[0].noteTitle).toBe('Quantum Computing Basics');
    expect(citations[0].excerpt).toBeDefined();
  });

  test('should format prompts with profile information', () => {
    const { formattedPrompt, citations } = promptFormatter.formatPromptWithContext(
      'What do I know about quantum computing?',
      sampleNotes,
      [],
      true, // include profile
      0.8,  // high profile relevance
      sampleProfile,
    );
    
    // Check the prompt structure includes profile
    expect(formattedPrompt).toContain('I have the following information in my personal knowledge base, including my profile and relevant notes:');
    expect(formattedPrompt).toContain('PROFILE INFORMATION:');
    expect(formattedPrompt).toContain('Name: Jan Hein Hoogstad');
    expect(formattedPrompt).toContain('Headline: Quantum Physicist | AI Researcher');
    
    // Check if it includes notes too
    expect(formattedPrompt).toContain('INTERNAL CONTEXT [1]:');
    expect(formattedPrompt).toContain('Title: Quantum Computing Basics');
    
    // Check citations (profile doesn't create a citation)
    expect(citations).toHaveLength(2);
  });

  test('should format prompts with external sources', () => {
    const { formattedPrompt, citations } = promptFormatter.formatPromptWithContext(
      'What are recent advances in quantum computing?',
      sampleNotes,
      sampleExternalSources,
    );
    
    // Check the prompt structure includes external sources
    expect(formattedPrompt).toContain('I have the following information from my personal knowledge base and external sources:');
    expect(formattedPrompt).toContain('--- EXTERNAL INFORMATION ---');
    expect(formattedPrompt).toContain('EXTERNAL SOURCE [1]:');
    expect(formattedPrompt).toContain('Title: Recent Advances in Quantum Computing');
    expect(formattedPrompt).toContain('Source: Wikipedia');
    
    // Check citations
    expect(citations).toHaveLength(2); // Only notes create citations
  });

  test('should format prompts with both profile and external sources', () => {
    const { formattedPrompt, citations } = promptFormatter.formatPromptWithContext(
      'How does my background relate to quantum computing advances?',
      sampleNotes,
      sampleExternalSources,
      true,  // include profile
      0.9,   // high profile relevance
      sampleProfile,
    );
    
    // Check the prompt has all three elements
    expect(formattedPrompt).toContain('I have the following information from my personal knowledge base, my profile, and external sources:');
    expect(formattedPrompt).toContain('PROFILE INFORMATION:');
    expect(formattedPrompt).toContain('INTERNAL CONTEXT [1]:');
    expect(formattedPrompt).toContain('EXTERNAL SOURCE [1]:');
    
    // Check citations
    expect(citations).toHaveLength(2); // Only notes create citations
  });

  test('should calculate content coverage correctly', () => {
    // Create a note with specific content for testing coverage
    const testNote = createMockNote('test-note', 'Quantum Entanglement Explained', ['quantum', 'physics']);
    testNote.content = 'Quantum entanglement occurs when particles become correlated in ways that cannot be explained by classical physics. Quantum states of entangled particles are dependent on each other regardless of distance. Einstein called this "spooky action at a distance".';
    testNote.embedding = MockEmbeddingService.createMockEmbedding('Quantum entanglement test');
    testNote.createdAt = new Date('2025-01-03');
    testNote.updatedAt = new Date('2025-01-04');
    
    // Query with many overlapping terms
    const query = 'What is quantum entanglement and how does it work with particles at a distance?';
    
    const coverage = promptFormatter.calculateCoverage(query, testNote);
    
    // Should be a value between 0 and 1
    expect(coverage).toBeGreaterThan(0);
    expect(coverage).toBeLessThanOrEqual(1);
    
    // Should have good coverage for this note with highly overlapping content
    expect(coverage).toBeGreaterThanOrEqual(0.5);
    
    // Test with a less relevant query
    const irrelevantQuery = 'How does artificial intelligence work with machine learning?';
    const irrelevantCoverage = promptFormatter.calculateCoverage(irrelevantQuery, testNote);
    
    // Should have low coverage
    expect(irrelevantCoverage).toBeLessThan(0.3);
  });

  test('should get excerpt from content correctly', () => {
    const content = 'This is a very long content that should be truncated to a shorter excerpt for display purposes.';
    
    const excerpt = promptFormatter.getExcerpt(content, 20);
    
    // Should truncate to specified length
    expect(excerpt.length).toBeLessThanOrEqual(23); // 20 + '...'
    expect(excerpt).toContain('...');
    
    // With long enough limit, should return full content
    const fullExcerpt = promptFormatter.getExcerpt(content, 200);
    expect(fullExcerpt).toBe(content);
  });
});