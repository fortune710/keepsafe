import { render } from "@testing-library/react-native";
import ProfileUpdatePopover from "@/components/profile/profile-update-popover";
import { AuthProvider } from "@/providers/auth-provider";


describe("Profile Update Popover Tests", () => {
    const popoverTestId = "profile-update-popover"
    const profileAvatartestId = "profile-update-avatar"
    
    test("Renders nothing when isVisible is false", () => {
        const { queryByTestId } = render(
            <AuthProvider>
                <ProfileUpdatePopover 
                    onClose={() => {}} 
                    isVisible={false} 
                    updateType="avatar" 
                />
            </AuthProvider>
        )

        expect(queryByTestId(popoverTestId)).toBeNull();
    })


    test("Renders only avatar when update type is avatar", () => {
        const { getByTestId } = render(
            <AuthProvider>
                <ProfileUpdatePopover
                    onClose={() => {}} 
                    isVisible={true} 
                    updateType="avatar"
                />
            </AuthProvider>
        )

        expect(getByTestId(profileAvatartestId)).toBeOnTheScreen();
    })
})