import { render } from "@testing-library/react-native";
import { TextCanvasItem } from "@/components/capture/canvas/text-canvas-item";

describe("Text canvas Item Tests", () => {
    test("renders text when text is present", () => {
        const expectedTestId = "canvas-text";
        const { getByTestId } = render(<TextCanvasItem text="test text" />);
        expect(getByTestId(expectedTestId)).toBeTruthy();
    })

    test("renders nothing when text is empty", () => {
        const expectedTestId = "canvas-text";
        const { queryByTestId } = render(<TextCanvasItem text="" />);
        expect(queryByTestId(expectedTestId)).toBeNull();
    })
})