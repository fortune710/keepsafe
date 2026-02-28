import React, { createContext, useContext, useState, useCallback } from 'react';

interface SaveLockContextType {
    isSaveLocked: boolean;
    lockSave: () => void;
    unlockSave: () => void;
}

const SaveLockContext = createContext<SaveLockContextType>({
    isSaveLocked: false,
    lockSave: () => { },
    unlockSave: () => { },
});

/**
 * Custom hook to access the SaveLockContext.
 * 
 * This hook provides a way to manage a global "save lock" state across the application.
 * It is primarily used to prevent multiple concurrent save operations or to disable 
 * UI elements (like a "Save" button) while a save is in progress or has just completed.
 * 
 * @returns {SaveLockContextType} An object containing:
 * - `isSaveLocked`: A boolean indicating if the save action is currently disabled.
 * - `lockSave`: A function to manually set the lock to true.
 * - `unlockSave`: A function to manually set the lock to false (e.g., when navigating back or after an error).
 */
export function useSaveLock() {
    return useContext(SaveLockContext);
}

export function SaveLockProvider({ children }: { children: React.ReactNode }) {
    const [isSaveLocked, setIsSaveLocked] = useState(false);

    const lockSave = () => setIsSaveLocked(true);
    const unlockSave = () => setIsSaveLocked(false);

    return (
        <SaveLockContext.Provider value={{ isSaveLocked, lockSave, unlockSave }}>
            {children}
        </SaveLockContext.Provider>
    );
}
