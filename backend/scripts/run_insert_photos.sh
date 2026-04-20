#!/bin/bash

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$( dirname "$SCRIPT_DIR" )"
PYTHON_SCRIPT="$SCRIPT_DIR/insert_photos.py"

# Check for user_id argument
if [ -z "$1" ]; then
    echo "Error: No user_id provided."
    echo "Usage: ./run_insert_photos.sh <user_id>"
    exit 1
fi

USER_ID=$1

echo "Starting photo insertion for user: $USER_ID"

# Change to backend directory to ensure environment variables and imports work
cd "$BACKEND_DIR"

# Run the python script
# We use 'python' because it's the standard command, but change to 'python3' if needed
python "$PYTHON_SCRIPT" "$USER_ID"

if [ $? -eq 0 ]; then
    echo "Done!"
else
    echo "Script failed."
    exit 1
fi
