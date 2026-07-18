import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CaptureContextType {
  isCapturing: boolean;
  setIsCapturing: (value: boolean) => void;
  isVideoRecording: boolean;
  setIsVideoRecording: (value: boolean) => void;
  recordingDuration: number;
  setRecordingDuration: React.Dispatch<React.SetStateAction<number>>;
  meteringLevel: number;
  setMeteringLevel: (value: number) => void;
}

const CaptureContext = createContext<CaptureContextType | undefined>(undefined);

export function CaptureProvider({ children }: { children: ReactNode }) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [meteringLevel, setMeteringLevel] = useState(0);

  return (
    <CaptureContext.Provider
      value={{
        isCapturing,
        setIsCapturing,
        isVideoRecording,
        setIsVideoRecording,
        recordingDuration,
        setRecordingDuration,
        meteringLevel,
        setMeteringLevel,
      }}
    >
      {children}
    </CaptureContext.Provider>
  );
}

export function useCaptureContext() {
  const context = useContext(CaptureContext);
  if (context === undefined) {
    throw new Error('useCaptureContext must be used within a CaptureProvider');
  }
  return context;
}
