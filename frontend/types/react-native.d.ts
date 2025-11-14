declare module "react-native/Libraries/Image/resolveAssetSource" {
    import { ImageSourcePropType } from "react-native";
    export default function resolveAssetSource(
      source: ImageSourcePropType
    ): { uri?: string; width?: number; height?: number; scale?: number };
}
  