import React from "react";
import { render } from "@testing-library/react-native";
import VaultCanvas from "@/components/capture/canvas/vault-canvas";
import { MediaType } from "@/types/media";
import { RenderedMediaCanvasItem } from "@/types/capture";

describe("Vault Canvas Tests", () => {
    it("renders only image when there are no canvas items", () => {
        const expectedTestId = "vault-canvas-image";

        const uri = "test-uri";
        const items: RenderedMediaCanvasItem[] = [];
        const type: MediaType = "photo";
        const { getByTestId } = render(<VaultCanvas uri={uri} items={items} type={type} />);
        expect(getByTestId(expectedTestId)).toBeTruthy();
    
    })
})