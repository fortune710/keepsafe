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

export function useSaveLock() {
    return useContext(SaveLockContext);
}

export function SaveLockProvider({ children }: { children: React.ReactNode }) {
    const [isSaveLocked, setIsSaveLocked] = useState(false);

    const lockSave = useCallback(() => setIsSaveLocked(true), []);
    const unlockSave = useCallback(() => setIsSaveLocked(false), []);

    return (
        <SaveLockContext.Provider value={{ isSaveLocked, lockSave, unlockSave }}>
            {children}
        </SaveLockContext.Provider>
    );
}
