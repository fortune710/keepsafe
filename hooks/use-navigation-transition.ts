import { Href, useRouter } from "expo-router";
import { useState } from "react";

export function useNavigationTransition() {
    const [isNavigating, setIsNavigating] = useState(false);
    const router = useRouter();

    function navigate(route: Href, callback?: () => void) {
        if (isNavigating) return; // Prevent multiple navigation attempts
              
        try {
            setIsNavigating(true);
            callback?.();
            
            // Use a small delay to ensure animations complete
            setTimeout(() => {
                try {
                    router.replace(route);
                } catch (error) {
                    console.error('Navigation error:', error);
                    router.replace(route);
                } finally {
                    setIsNavigating(false);
                }
            }, 50);
        } catch (error) {
            console.error('Error navigating to:', route, error);
            setIsNavigating(false);
            router.replace(route);
        }
    }

    return {
        navigate
    }
}