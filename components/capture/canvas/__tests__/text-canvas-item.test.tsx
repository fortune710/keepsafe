import React from "react";
import { render } from "@testing-library/react-native";
import { TextCanvasItem } from "@/components/capture/canvas/text-canvas-item";

describe("Text canvas Item Tests", () => {
    it("renders text when text is present", () => {
        const expectedTestId = "canvas-text";
        const { getByTestId } = render(<TextCanvasItem text="test text" />);
        expect(getByTestId(expectedTestId)).toBeTruthy();
    })

    it("renders nothing when text is empty", () => {
        const expectedTestId = "canvas-text";
        const { getByTestId } = render(<TextCanvasItem text="" />);
        expect(getByTestId(expectedTestId)).toBeFalsy();
    })
})