from pinecone import Pinecone, ServerlessSpec
from config import settings
from typing import Optional

_pinecone_client: Optional[Pinecone] = None

def get_pinecone_client() -> Pinecone:
    """Initialize and return Pinecone client instance."""
    global _pinecone_client
    
    if _pinecone_client is None:
        if not settings.PINECONE_API_KEY:
            raise ValueError("PINECONE_API_KEY must be set in environment variables")
        
        _pinecone_client = Pinecone(api_key=settings.PINECONE_API_KEY)
    
    return _pinecone_client

def get_pinecone_index():
    """Get Pinecone index instance."""
    client = get_pinecone_client()
    index_name = settings.PINECONE_INDEX_NAME
    
    # Check if index exists, if not create it
    existing_indexes = [index.name for index in client.list_indexes()]
    
    if index_name not in existing_indexes:
        # Create index with appropriate dimensions for Gemini embeddings
        # text-embedding-004 has 768 dimensions
        # Use environment from settings or default to us-east-1
        region = settings.PINECONE_ENVIRONMENT or "us-east-1"
        client.create_index(
            name=index_name,
            dimension=768,
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region=region
            )
        )
    
    return client.Index(index_name)

