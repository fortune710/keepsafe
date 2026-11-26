import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SearchComposer } from '../search-composer';

jest.mock('lucide-react-native', () => ({ ArrowUp: () => null }));
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: () => false }));

test('keeps the send button disabled until there is text and submits when pressed', () => {
  const submit = jest.fn();
  const change = jest.fn();
  const screen = render(<SearchComposer value="" onChangeText={change} onSubmit={submit} isLoading={false} />);
  const input = screen.getByLabelText('Ask about your memories');
  fireEvent(input, 'focus');
  fireEvent.changeText(input, 'Find my memories');
  expect(change).toHaveBeenCalledWith('Find my memories');
  expect(screen.getByRole('button', { name: 'Search memories' }).props.accessibilityState.disabled).toBe(true);
  screen.rerender(<SearchComposer value="Find my memories" onChangeText={change} onSubmit={submit} isLoading={false} />);
  fireEvent.press(screen.getByRole('button', { name: 'Search memories' }));
  expect(submit).toHaveBeenCalledTimes(1);
});

test('supports multiline content and disables sending while loading', () => {
  const screen = render(<SearchComposer value={'First line\nSecond line'} onChangeText={jest.fn()} onSubmit={jest.fn()} isLoading />);
  const input = screen.getByLabelText('Ask about your memories');
  expect(input.props.multiline).toBe(true);
  fireEvent(input, 'contentSizeChange', { nativeEvent: { contentSize: { height: 48, width: 250 } } });
  expect(screen.getByRole('button', { name: 'Search memories' }).props.accessibilityState.disabled).toBe(true);
});
