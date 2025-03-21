#!/bin/sh
# Fully dynamic GitHub secrets upload script

# Hard-code the repo
REPO="yeehaa123/personal-brain"
echo "Using repository: $REPO"

# Delay in seconds between API calls
DELAY=5
echo "Using delay of $DELAY seconds between API calls"

# Create temp file for existing secrets
TEMP_FILE=$(mktemp)

# Fetch existing secrets list
echo "Fetching existing secrets..."
gh secret list -R "$REPO" > "$TEMP_FILE"
echo "Waiting $DELAY seconds after API call..."
sleep $DELAY

# Function to check if secret exists
secret_exists() {
  KEY=$1
  grep -q "^$KEY" "$TEMP_FILE"
  return $?
}

# Function to upload a secret if needed
upload_if_needed() {
  KEY=$1
  VALUE=$2
  
  if secret_exists "$KEY"; then
    echo "Secret $KEY already exists, skipping"
  else
    echo "Setting $KEY..."
    echo "$VALUE" | gh secret set "$KEY" -R "$REPO"
    
    if [ $? -eq 0 ]; then
      echo "✓ $KEY uploaded successfully"
    else
      echo "× Failed to upload $KEY"
    fi
  fi
  
  echo "Waiting $DELAY seconds before next operation..."
  sleep $DELAY
}

# Process all keys in .env file
echo "Processing all keys from .env file..."
while IFS= read -r line || [ -n "$line" ]; do
  # Skip empty lines and comments
  case "$line" in
    ""|\#*) continue ;;
  esac
  
  # Extract key and value
  KEY=$(echo "$line" | cut -d= -f1)
  VALUE=$(echo "$line" | cut -d= -f2-)
  
  # Remove quotes if present
  VALUE=$(echo "$VALUE" | sed 's/^[[:space:]"'"'"']*//;s/[[:space:]"'"'"']*$//')
  
  # Upload the secret if needed
  upload_if_needed "$KEY" "$VALUE"
done < .env

# Check if SSH key exists and add it
if [ -f ~/.ssh/id_ed25519 ]; then
  echo "Adding SSH private key to GitHub secrets..."
  upload_if_needed "SSH_PRIVATE_KEY" "$(cat ~/.ssh/id_ed25519)"
else
  echo "No SSH key found at ~/.ssh/id_ed25519"
fi

# Clean up
rm -f "$TEMP_FILE"

echo "Secret upload process completed!"
