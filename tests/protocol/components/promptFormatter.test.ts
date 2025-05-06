import { beforeEach, describe, expect, test } from 'bun:test';

import type { ExternalSourceResult } from '@/contexts/externalSources/sources';
import { PromptFormatter } from '@/protocol/components/promptFormatter';
import type { Note } from '@models/note';
import type { Profile } from '@models/profile';
import { createMockNote } from '@test/__mocks__/models/note';
import { EmbeddingService as MockEmbeddingService } from '@test/__mocks__/resources/ai/embedding/embeddings';

describe('PromptFormatter', () => {
  const promptFormatter = PromptFormatter.createFresh();
  
  // Will be initialized in beforeEach
  let sampleNotes: Note[];

  beforeEach(async () => {
    // Initialize sample notes
    sampleNotes = await createSampleNotes();
    
    // Initialize profile embedding
    const mockService = MockEmbeddingService.createFresh();
    sampleProfile.embedding = await mockService.getEmbedding('Quantum researcher profile');
  });
  
  // Create sample notes with embeddings
  async function createSampleNotes(): Promise<Note[]> {
    const note1 = await createMockNote('note-1', 'Quantum Computing Basics', ['quantum', 'computing', 'science']);
    note1.content = 'Quantum computing uses quantum bits or qubits which can exist in multiple states simultaneously.';
    note1.createdAt = new Date('2025-01-01');
    note1.updatedAt = new Date('2025-01-02');
    
    const note2 = await createMockNote('note-2', 'Quantum Entanglement', ['quantum', 'physics']);
    note2.content = 'Quantum entanglement is a physical phenomenon that occurs when a pair of particles interact in such a way that the quantum state of each particle cannot be described independently of the others.';
    note2.createdAt = new Date('2025-01-03');
    note2.updatedAt = new Date('2025-01-04');
    
    // Use the standard API for embedding generation
    const mockService = MockEmbeddingService.createFresh();
    note1.embedding = await mockService.getEmbedding('Quantum computing basics');
    note2.embedding = await mockService.getEmbedding('Quantum entanglement');
    
    return [note1, note2];
  }

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
    // We'll set this in beforeEach
    embedding: [] as number[],
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

  describe('Prompt formatting with different context types', () => {
    test('formats prompts with notes correctly', async () => {
      const { formattedPrompt, citations } = promptFormatter.formatPromptWithContext(
        'Explain quantum computing',
        sampleNotes,
      );
      
      // Verify prompt structure and content
      expect({
        promptStructure: {
          hasIntroduction: formattedPrompt.includes('I have the following information in my personal knowledge base:'),
          hasFirstNote: formattedPrompt.includes('INTERNAL CONTEXT [1]:'),
          hasFirstNoteTitle: formattedPrompt.includes('Title: Quantum Computing Basics'),
          hasFirstNoteTags: formattedPrompt.includes('Tags: quantum, computing, science'),
          hasSecondNote: formattedPrompt.includes('INTERNAL CONTEXT [2]:'),
          hasQuestion: formattedPrompt.includes('Based on this information, please answer my question:'),
          hasQueryText: formattedPrompt.includes('Explain quantum computing'),
        },
        citationsInfo: {
          count: citations.length,
          firstNoteId: citations[0]?.noteId,
          firstNoteTitle: citations[0]?.noteTitle,
          hasExcerpts: citations.every(citation => citation.excerpt !== undefined),
        },
      }).toMatchObject({
        promptStructure: {
          hasIntroduction: true,
          hasFirstNote: true,
          hasFirstNoteTitle: true,
          hasFirstNoteTags: true,
          hasSecondNote: true,
          hasQuestion: true,
          hasQueryText: true,
        },
        citationsInfo: {
          count: 2,
          firstNoteId: 'note-1',
          firstNoteTitle: 'Quantum Computing Basics',
          hasExcerpts: true,
        },
      });
    });

    test('formats prompts with profile information correctly', async () => {
      const { formattedPrompt, citations } = promptFormatter.formatPromptWithContext(
        'What do I know about quantum computing?',
        sampleNotes,
        [],
        true, // include profile
        0.8,  // high profile relevance
        sampleProfile,
      );
      
      // Verify prompt includes profile information
      expect({
        promptStructure: {
          hasProfileIntro: formattedPrompt.includes('including my profile and relevant notes'),
          hasProfileSection: formattedPrompt.includes('PROFILE INFORMATION:'),
          hasProfileName: formattedPrompt.includes('Name: Jan Hein Hoogstad'),
          hasProfileHeadline: formattedPrompt.includes('Headline: Quantum Physicist | AI Researcher'),
          hasNotes: formattedPrompt.includes('INTERNAL CONTEXT [1]:'),
          hasQuantumComputingNote: formattedPrompt.includes('Title: Quantum Computing Basics'),
        },
        citationsInfo: {
          // Profile doesn't create a citation
          count: citations.length,
        },
      }).toMatchObject({
        promptStructure: {
          hasProfileIntro: true,
          hasProfileSection: true,
          hasProfileName: true,
          hasProfileHeadline: true,
          hasNotes: true,
          hasQuantumComputingNote: true,
        },
        citationsInfo: {
          count: 2,
        },
      });
    });

    test('formats prompts with external sources correctly', async () => {
      const { formattedPrompt, citations } = promptFormatter.formatPromptWithContext(
        'What are recent advances in quantum computing?',
        sampleNotes,
        sampleExternalSources,
      );
      
      // Verify prompt includes external sources
      expect({
        promptStructure: {
          hasExternalIntro: formattedPrompt.includes('external sources'),
          hasExternalSection: formattedPrompt.includes('--- EXTERNAL INFORMATION ---'),
          hasExternalSource: formattedPrompt.includes('EXTERNAL SOURCE [1]:'),
          hasSourceTitle: formattedPrompt.includes('Title: Recent Advances in Quantum Computing'),
          hasSourceAttribution: formattedPrompt.includes('Source: Wikipedia'),
        },
        citationsInfo: {
          // Only notes create citations
          count: citations.length,
        },
      }).toMatchObject({
        promptStructure: {
          hasExternalIntro: true,
          hasExternalSection: true,
          hasExternalSource: true,
          hasSourceTitle: true,
          hasSourceAttribution: true,
        },
        citationsInfo: {
          count: 2,
        },
      });
    });

    test('combines profile, notes, and external sources in prompts correctly', async () => {
      const { formattedPrompt, citations } = promptFormatter.formatPromptWithContext(
        'How does my background relate to quantum computing advances?',
        sampleNotes,
        sampleExternalSources,
        true,  // include profile
        0.9,   // high profile relevance
        sampleProfile,
      );
      
      // Verify prompt includes all elements
      expect({
        promptStructure: {
          hasCombinedIntro: formattedPrompt.includes('my personal knowledge base, my profile, and external sources'),
          hasProfileSection: formattedPrompt.includes('PROFILE INFORMATION:'),
          hasNotesSection: formattedPrompt.includes('INTERNAL CONTEXT [1]:'),
          hasExternalSection: formattedPrompt.includes('EXTERNAL SOURCE [1]:'),
        },
        citationsInfo: {
          // Only notes create citations
          count: citations.length,
        },
      }).toMatchObject({
        promptStructure: {
          hasCombinedIntro: true,
          hasProfileSection: true,
          hasNotesSection: true,
          hasExternalSection: true,
        },
        citationsInfo: {
          count: 2,
        },
      });
    });
  });

  describe('Content coverage and utility functions', () => {
    test('calculates content coverage accurately based on query relevance', async () => {
      // Create note with specific content for coverage testing
      const testNote = createMockNote('test-note', 'Quantum Entanglement Explained', ['quantum', 'physics']);
      testNote.content = 'Quantum entanglement occurs when particles become correlated in ways that cannot be explained by classical physics. Quantum states of entangled particles are dependent on each other regardless of distance. Einstein called this "spooky action at a distance".';
      
      // Initialize embedding
      const mockService = MockEmbeddingService.createFresh();
      testNote.embedding = await mockService.getEmbedding('Quantum entanglement test');
      testNote.createdAt = new Date('2025-01-03');
      testNote.updatedAt = new Date('2025-01-04');
      
      // Test with relevant and irrelevant queries
      const relevantQuery = 'What is quantum entanglement and how does it work with particles at a distance?';
      const irrelevantQuery = 'How does artificial intelligence work with machine learning?';
      
      const relevantCoverage = promptFormatter.calculateCoverage(relevantQuery, testNote);
      const irrelevantCoverage = promptFormatter.calculateCoverage(irrelevantQuery, testNote);
      
      // Verify coverage calculations
      expect({
        relevantCase: {
          isNumeric: typeof relevantCoverage === 'number',
          isInValidRange: relevantCoverage > 0 && relevantCoverage <= 1,
          hasHighRelevance: relevantCoverage >= 0.5,
        },
        irrelevantCase: {
          isNumeric: typeof irrelevantCoverage === 'number',
          valuePresent: irrelevantCoverage !== undefined,
          hasLowRelevance: irrelevantCoverage < 0.3,
        },
      }).toMatchObject({
        relevantCase: {
          isNumeric: true,
          isInValidRange: true,
          hasHighRelevance: true,
        },
        irrelevantCase: {
          isNumeric: true,
          valuePresent: true,
          hasLowRelevance: true,
        },
      });
    });

    test('generates content excerpts with appropriate truncation', async () => {
      const longContent = 'This is a very long content that should be truncated to a shorter excerpt for display purposes.';
      
      // Get excerpts with different length limits
      const shortExcerpt = promptFormatter.getExcerpt(longContent, 20);
      const fullExcerpt = promptFormatter.getExcerpt(longContent, 200);
      
      // Verify excerpt generation
      expect({
        shortExcerpt: {
          isWithinLimit: shortExcerpt.length <= 23, // 20 + '...'
          isVisiblyTruncated: shortExcerpt.includes('...'),
        },
        fullExcerpt: {
          matchesOriginal: fullExcerpt === longContent,
        },
      }).toMatchObject({
        shortExcerpt: {
          isWithinLimit: true,
          isVisiblyTruncated: true,
        },
        fullExcerpt: {
          matchesOriginal: true,
        },
      });
    });
  });
});