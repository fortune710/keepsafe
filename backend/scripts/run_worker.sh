#!/bin/bash

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$( dirname "$SCRIPT_DIR" )"
PYTHON_SCRIPT="$SCRIPT_DIR/run_worker.py"

# Check for worker type argument
if [ -z "$1" ]; then
    echo "Usage: ./run_worker.sh <ingestion|dump|notification>"
    exit 1
fi

WORKER_TYPE=$1

# Change to backend directory
cd "$BACKEND_DIR"

# Run the python script
python "$PYTHON_SCRIPT" "$WORKER_TYPE"
