import { ImageBackground } from "expo-image";

export function EntryPage({ children }: { children: React.ReactNode }) {
    return (
        <ImageBackground 
            style={{ width: "100%", height: 800, flex: 1 }}
            source={require("@/assets/templates/diary-page-template-1.jpeg")}
        >
            {children}
        </ImageBackground>
    )
}