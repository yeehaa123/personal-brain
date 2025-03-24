#!/usr/bin/env bun
import { ProfileContext } from './mcp/context/profileContext';

async function generateProfileTags() {
  const forceRegenerate = process.argv.includes('--force');

  console.log(`Generating tags for profile${forceRegenerate ? ' (forced regeneration)' : ''}...`);

  try {
    const context = new ProfileContext();
    const tags = await context.updateProfileTags(forceRegenerate);

    if (tags) {
      console.log(`Tag generation complete!`);
      console.log(`Generated tags: ${tags.join(', ')}`);
    } else {
      console.log('No tags were generated. Check the logs for details.');
    }
  } catch (error) {
    console.error('Error generating profile tags:', error);
    process.exit(1);
  }
}

generateProfileTags();