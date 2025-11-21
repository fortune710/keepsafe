declare module 'react-native-markdown-display' {
  import * as React from 'react';
  import { TextProps, ViewProps } from 'react-native';

  export interface MarkdownProps {
    children: string;
    style?: Record<string, any>;
  }

  const Markdown: React.ComponentType<MarkdownProps & ViewProps>;
  export default Markdown;
}


