import { useToastContext } from '@/providers/toast-provider';

export function useToast() {
    const { showToast } = useToastContext();
    
    const toast = (message: string, type: 'success' | 'error' = 'success', duration?: number) => {
        showToast(message, type, duration);
    };
    
    return { toast };
}