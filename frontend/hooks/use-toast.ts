import { useToastContext } from '@/providers/toast-provider';

export function useToast() {
    const { showToast } = useToastContext();
    
    const toast = (message: string, type: 'success' | 'error' = 'success', duration?: number, title?: string) => {
        showToast(message, type, duration, title);
    };
    
    return { toast };
}
