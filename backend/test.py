from services.gemini_client import generate_description_from_media, generate_embedding

import asyncio

async def main():
    url = "https://kjnuwzuhngfvdfzzaitj.supabase.co/storage/v1/object/public/media/d745ed21-5667-4595-bf76-8505ccf63d8b/media/photo_1763296571434.png"
    description = await generate_description_from_media(url, "photo")
    print(description)
asyncio.run(main())