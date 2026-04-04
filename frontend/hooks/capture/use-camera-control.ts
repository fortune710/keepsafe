import { CameraType, CameraView } from "expo-camera";
import { useRef, useState } from "react";

export function useCameraControl() {
    const [facing, setFacing] = useState<CameraType>('back');
    const cameraRef = useRef<CameraView>(null);


    const toggleCameraFacing = () => {
        setFacing(prevFacing => (prevFacing === 'back' ? 'front' : 'back'));
    };

    return {
        facing,
        cameraRef,
        toggleCameraFacing
    };
}