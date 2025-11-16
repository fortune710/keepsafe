# KeepSafe Backend API

FastAPI backend service for KeepSafe with vector search capabilities using Gemini and Pinecone.

## Features

- **Supabase Integration**: Database operations
- **Google Gemini Integration**: 
  - Gemini Flash for media description generation
  - Gemini Embed for vector embeddings
- **Pinecone Integration**: Vector database for semantic search
- **Webhook Endpoints**: Process entry changes in real-time

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase service role key
- `GOOGLE_GENERATIVE_AI_API_KEY`: Your Google Gemini API key
- `PINECONE_API_KEY`: Your Pinecone API key
- `PINECONE_ENVIRONMENT`: Your Pinecone environment (e.g., "us-east-1")
- `PINECONE_INDEX_NAME`: Name for your Pinecone index (default: "keepsafe-entries")

### 3. Run the Server

```bash
# Development mode with auto-reload
uvicorn main:app --reload

# Production mode
uvicorn main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Webhooks

- `POST /webhooks/entries`: Process entry changes (INSERT, UPDATE, DELETE)
- `GET /webhooks/health`: Health check for webhook service

### General

- `GET /`: Root endpoint
- `GET /health`: Health check

## Webhook Payload Format

```json
{
  "type": "INSERT",
  "table": "entries",
  "record": {
    "id": "entry-id",
    "user_id": "user-id",
    "type": "photo",
    "content_url": "https://...",
    ...
  }
}
```

## Architecture

- **IngestionService**: Handles media processing, description generation, embedding creation, and Pinecone storage
- **Gemini Client**: Manages Gemini API interactions for descriptions and embeddings
- **Pinecone Client**: Manages vector database operations
- **Supabase Client**: Database client for entry retrieval if needed

## Notes

- The service automatically creates a Pinecone index if it doesn't exist
- Embeddings use Gemini's `text-embedding-004` model (768 dimensions)
- Media descriptions are generated using Gemini Flash
- Metadata from entries is stored in Pinecone for filtering and retrieval

