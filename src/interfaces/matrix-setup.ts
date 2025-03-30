#!/usr/bin/env bun
import * as sdk from 'matrix-js-sdk';

async function setupMatrixClient() {
  // Hard-coded test values - in a real app you would get these interactively
  // but we're skipping that due to readline issues
  const baseUrl = 'https://matrix.rizom.ai';
  console.log(`Using Matrix server: ${baseUrl}`);

  // Get Matrix username and password from command line arguments
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: bun run matrix:setup <username> <password>');
    process.exit(1);
  }

  const username = args[0];
  const password = args[1];

  try {
    console.log(`Setting up Matrix for user: ${username}`);
    console.log(`Connecting to ${baseUrl}...`);

    // Create a temporary client for login
    const client = sdk.createClient({ baseUrl });

    // Login to get an access token
    console.log('Logging in...');
    const loginResponse = await client.login('m.login.password', {
      user: username,
      password: password,
      initial_device_display_name: 'Personal Brain',
    });

    const userId = loginResponse.user_id;
    const accessToken = loginResponse.access_token;

    console.log(`\nLogin successful for user ${userId}`);
    console.log('\nAdd the following to your .env file:');
    console.log(`MATRIX_HOMESERVER_URL="${baseUrl}"`);
    console.log(`MATRIX_USER_ID="${userId}"`);
    console.log(`MATRIX_ACCESS_TOKEN="${accessToken}"`);
    console.log('MATRIX_ROOM_IDS=""  # Add room IDs separated by commas');
    console.log('COMMAND_PREFIX="!brain"  # Customize if desired');

    // Create .env file template
    console.log('\nCreating .env.matrix template file...');
    await Bun.write(
      '.env.matrix',
      `MATRIX_HOMESERVER_URL="${baseUrl}"
MATRIX_USER_ID="${userId}"
MATRIX_ACCESS_TOKEN="${accessToken}"
MATRIX_ROOM_IDS=""
COMMAND_PREFIX="!brain"
ANTHROPIC_API_KEY=""
`,
    );

    console.log('Template saved to .env.matrix');
    console.log('Copy this file to .env and fill in any missing information.');

  } catch (error: unknown) {
    console.error('Error during setup:', error instanceof Error ? error.message : String(error));
  }
}

setupMatrixClient().catch(console.error);
