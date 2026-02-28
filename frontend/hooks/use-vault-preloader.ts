import { useEffect } from 'react';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/constants/supabase';
import { useAuthContext } from '@/providers/auth-provider';
import { logger } from '@/lib/logger';
import { RenderedMediaCanvasItem } from '@/types/capture';
import { Asset } from 'expo-asset';

const DIARY_TEMPLATE = require("@/assets/templates/diary-page-template-1.jpeg");

/**
 * Hook to preload the first 5 images from the vault.
 * This should be used on the capture page to warm up the image cache
 * before the user navigates to the vault.
 */
export function useVaultPreloader() {
    const { user, profile } = useAuthContext();

    useEffect(() => {
        if (!user?.id) return;

        const preloadImages = async () => {
            try {
                logger.debug('Vault Preloader: Starting background preloading');

                // Preload the diary template simultaneously
                Asset.loadAsync(DIARY_TEMPLATE);

                const urlsToPreload: string[] = [];

                // Preload current user's avatar
                if (profile?.avatar_url) {
                    urlsToPreload.push(profile.avatar_url);
                }

                const { data: entries, error } = await supabase
                    .from(TABLES.ENTRIES)
                    .select(`
                        content_url,
                        type,
                        attachments,
                        profile:${TABLES.PROFILES} (
                            avatar_url
                        )
                    `)
                    .contains('shared_with', [user.id])
                    .order('created_at', { ascending: false })
                    .limit(5) as { data: any[] | null; error: any };

                if (error) {
                    logger.error('Vault Preloader: Error fetching entries for preloading', error);
                }

                if (entries && entries.length > 0) {
                    entries.forEach(entry => {
                        // Preload main content if it's an image
                        if (entry.content_url && entry.type === 'image') {
                            urlsToPreload.push(entry.content_url);
                        }

                        // Preload profile avatar if exists
                        if (entry.profile?.avatar_url) {
                            urlsToPreload.push(entry.profile.avatar_url);
                        }

                        // Preload stickers from attachments
                        if (Array.isArray(entry.attachments)) {
                            (entry.attachments as RenderedMediaCanvasItem[]).forEach(attachment => {
                                if (attachment.type === 'sticker' && attachment.sticker) {
                                    urlsToPreload.push(attachment.sticker);
                                }
                            });
                        }
                    });
                }

                if (urlsToPreload.length > 0) {
                    const uniqueUrls = Array.from(new Set(urlsToPreload));
                    logger.info(`Vault Preloader: Preloading ${uniqueUrls.length} unique URLs`);
                    Image.prefetch(uniqueUrls);
                }
            } catch (err) {
                logger.error('Vault Preloader: Unexpected error during preloading', err);
            }
        };

        preloadImages();
    }, [user?.id, profile?.avatar_url]);
}
