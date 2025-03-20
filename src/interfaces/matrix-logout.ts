#!/usr/bin/env bun
import * as sdk from 'matrix-js-sdk';

async function logoutMatrixClient() {
  // Get values from environment variables
  const baseUrl = process.env.MATRIX_HOMESERVER_URL || 'https://matrix.org';
  const accessToken = process.env.MATRIX_ACCESS_TOKEN;
  const userId = process.env.MATRIX_USER_ID;

  if (!accessToken || !userId) {
    console.error('Error: MATRIX_ACCESS_TOKEN and MATRIX_USER_ID environment variables are required');
    process.exit(1);
  }

  try {
    console.log(`Logging out Matrix user: ${userId}`);
    console.log(`From homeserver: ${baseUrl}`);

    // Create a client with the access token
    const client = sdk.createClient({
      baseUrl: baseUrl,
      accessToken: accessToken,
      userId: userId,
    });

    // Logout to invalidate the token
    console.log('Sending logout request...');
    await client.logout();

    console.log('\nLogout successful!');
    console.log('The access token has been invalidated.');
    console.log('You will need to generate a new token to reconnect.');

  } catch (error) {
    console.error('Error during logout:', error.message);
  }
}

logoutMatrixClient().catch(console.error);