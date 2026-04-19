import sys
import uuid
from datetime import datetime, timezone
import os

# Add the parent directory to sys.path so we can import modules from 'backend'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.supabase_client import get_supabase_client

def insert_media(user_id: str):
    supabase = get_supabase_client()
    now = datetime.now(timezone.utc).isoformat()
    
    # 10 Photos
    photo_urls = [
        "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1433086566608-01494595294e?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1532270660266-d47bdba0c35d?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1493246507139-91e8bef99c02?auto=format&fit=crop&w=1000&q=80"
    ]
    
    # 2 Videos
    video_urls = [
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
    ]
    
    # 2 Audios
    audio_urls = [
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
    ]
    
    entries = []

    # Prepare Photos
    """
    for i, url in enumerate(photo_urls):
        entries.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "photo",
            "content_url": url,
            "text_content": f"Sample photo entry {i+1}",
            "is_private": False,
            "shared_with_everyone": True,
            "created_at": now,
            "updated_at": now,
            "attachments": []
        })
    """

    # Prepare Videos
    for i, url in enumerate(video_urls):
        entries.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "video",
            "content_url": url,
            "text_content": f"Sample video entry {i+1}",
            "is_private": False,
            "shared_with_everyone": True,
            "created_at": now,
            "updated_at": now,
            "attachments": [],
            "metadata": {"duration": 15} # Mock duration
        })

    # Prepare Audios
    for i, url in enumerate(audio_urls):
        entries.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": "audio",
            "content_url": url,
            "text_content": f"Sample audio entry {i+1}",
            "is_private": False,
            "shared_with_everyone": True,
            "created_at": now,
            "updated_at": now,
            "attachments": [],
            "metadata": {"duration": 30} # Mock duration
        })
    
    print(f"Inserting {len(entries)} items (10 photos, 2 videos, 2 audios) for user: {user_id}...")
    
    try:
        response = supabase.table("entries").insert(entries).execute()
        print(f"Successfully inserted {len(response.data)} media entries!")
    except Exception as e:
        print(f"Error inserting entries: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python insert_photos.py <user_id>")
        sys.exit(1)
    
    target_user_id = sys.argv[1]
    insert_media(target_user_id)
