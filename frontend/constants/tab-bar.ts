import { verticalScale } from 'react-native-size-matters';

export const TAB_BAR_HEIGHT = verticalScale(64);
export const TAB_BAR_BOTTOM = verticalScale(28);
// Clear the floating bar and leave a little breathing room above it.
export const TAB_BAR_CONTENT_PADDING = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + verticalScale(16);
