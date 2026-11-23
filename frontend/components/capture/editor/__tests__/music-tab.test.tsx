import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import MusicTab from '../music-tab';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

jest.mock('expo-audio', () => ({
  useAudioPlayer: jest.fn(),
  useAudioPlayerStatus: jest.fn(),
}));

jest.mock('../../music/music-list-item', () => {
  const React = require('react');
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    MusicListItem: ({ music, onPress, onTogglePreview }: any) => (
      <View>
        <TouchableOpacity onPress={() => onTogglePreview(music)}><Text>Preview {music.title}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onPress(music)}><Text>Select {music.title}</Text></TouchableOpacity>
      </View>
    ),
  };
});

const songs = [
  { id: 1, title: 'First', artist: 'Artist', preview: 'https://example.com/first.mp3', cover: '', duration: 30 },
  { id: 2, title: 'Second', artist: 'Artist', preview: 'https://example.com/second.mp3', cover: '', duration: 30 },
];

test('uses one player to switch, pause and resume previews, and stops when selecting a song', () => {
  const player = {
    playing: false,
    pause: jest.fn(),
    play: jest.fn(),
    replace: jest.fn(),
    seekTo: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  };
  const selectMusic = jest.fn();
  (useAudioPlayer as jest.Mock).mockReturnValue(player);
  (useAudioPlayerStatus as jest.Mock).mockReturnValue({ playing: false, duration: 30, currentTime: 0 });

  const props = { isLoading: false, musicQuery: '', onMusicQueryChange: jest.fn(), musicTags: songs, onSelectMusic: selectMusic };
  const { rerender } = render(<MusicTab {...props} />);

  fireEvent.press(screen.getByText('Preview First'));
  expect(player.replace).toHaveBeenLastCalledWith({ uri: songs[0].preview });
  expect(player.play).toHaveBeenCalledTimes(1);

  player.playing = true;
  (useAudioPlayerStatus as jest.Mock).mockReturnValue({ playing: true, duration: 30, currentTime: 1 });
  rerender(<MusicTab {...props} />);
  fireEvent.press(screen.getByText('Preview Second'));
  expect(player.pause).toHaveBeenCalledTimes(2);
  expect(player.replace).toHaveBeenLastCalledWith({ uri: songs[1].preview });
  expect(player.play).toHaveBeenCalledTimes(2);

  fireEvent.press(screen.getByText('Preview Second'));
  expect(player.pause).toHaveBeenCalledTimes(3);
  player.playing = false;
  (useAudioPlayerStatus as jest.Mock).mockReturnValue({ playing: false, duration: 30, currentTime: 1 });
  rerender(<MusicTab {...props} />);
  fireEvent.press(screen.getByText('Preview Second'));
  expect(player.play).toHaveBeenCalledTimes(3);
  expect(player.replace).toHaveBeenCalledTimes(2);

  fireEvent.press(screen.getByText('Select First'));
  expect(player.pause).toHaveBeenCalledTimes(4);
  expect(selectMusic).toHaveBeenCalledWith(songs[0]);
});

test('pauses a buffering preview when the reported playback status is playing', () => {
  const player = { playing: false, pause: jest.fn(), play: jest.fn(), replace: jest.fn(), seekTo: jest.fn(), addListener: jest.fn(() => ({ remove: jest.fn() })) };
  (useAudioPlayer as jest.Mock).mockReturnValue(player);
  (useAudioPlayerStatus as jest.Mock).mockReturnValue({ playing: false, duration: 0, currentTime: 0 });
  const props = { isLoading: false, musicQuery: '', onMusicQueryChange: jest.fn(), musicTags: songs, onSelectMusic: jest.fn() };
  const { rerender } = render(<MusicTab {...props} />);
  fireEvent.press(screen.getByText('Preview First'));
  (useAudioPlayerStatus as jest.Mock).mockReturnValue({ playing: true, isBuffering: true, duration: 0, currentTime: 0 });
  rerender(<MusicTab {...props} />);

  fireEvent.press(screen.getByText('Preview First'));
  expect(player.pause).toHaveBeenCalledTimes(2);
  expect(player.play).toHaveBeenCalledTimes(1);
});

test('replaces a failed source when retrying the same preview', () => {
  const player = { playing: false, pause: jest.fn(), play: jest.fn(), replace: jest.fn(), seekTo: jest.fn(), addListener: jest.fn(() => ({ remove: jest.fn() })) };
  (useAudioPlayer as jest.Mock).mockReturnValue(player);
  (useAudioPlayerStatus as jest.Mock).mockReturnValue({ playing: false, duration: 0, currentTime: 0 });
  const props = { isLoading: false, musicQuery: '', onMusicQueryChange: jest.fn(), musicTags: songs, onSelectMusic: jest.fn() };
  const { rerender } = render(<MusicTab {...props} />);
  fireEvent.press(screen.getByText('Preview First'));
  (useAudioPlayerStatus as jest.Mock).mockReturnValue({ playing: false, duration: 0, currentTime: 0, error: 'Network error' });
  rerender(<MusicTab {...props} />);

  fireEvent.press(screen.getByText('Preview First'));
  expect(player.replace).toHaveBeenCalledTimes(2);
  expect(player.replace).toHaveBeenLastCalledWith({ uri: songs[0].preview });
});

test('retries a failed preview even after a later idle status update', () => {
  let onStatusUpdate: (status: { error?: string | null }) => void = () => {};
  const player = {
    playing: false,
    pause: jest.fn(),
    play: jest.fn(),
    replace: jest.fn(),
    seekTo: jest.fn(),
    addListener: jest.fn((_event, listener) => {
      onStatusUpdate = listener;
      return { remove: jest.fn() };
    }),
  };
  (useAudioPlayer as jest.Mock).mockReturnValue(player);
  (useAudioPlayerStatus as jest.Mock).mockReturnValue({ playing: false, duration: 0, currentTime: 0 });
  render(<MusicTab isLoading={false} musicQuery="" onMusicQueryChange={jest.fn()} musicTags={songs} onSelectMusic={jest.fn()} />);
  fireEvent.press(screen.getByText('Preview First'));
  onStatusUpdate({ error: 'Network error' });
  onStatusUpdate({ error: null });

  fireEvent.press(screen.getByText('Preview First'));
  expect(player.replace).toHaveBeenCalledTimes(2);
});

test('restarts a finished preview from the beginning', async () => {
  const player = {
    playing: false,
    pause: jest.fn(),
    play: jest.fn(),
    replace: jest.fn(),
    seekTo: jest.fn().mockResolvedValue(undefined),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  };
  (useAudioPlayer as jest.Mock).mockReturnValue(player);
  (useAudioPlayerStatus as jest.Mock).mockReturnValue({
    playing: false, duration: 30, currentTime: 30, didJustFinish: true,
  });
  render(<MusicTab isLoading={false} musicQuery="" onMusicQueryChange={jest.fn()} musicTags={songs} onSelectMusic={jest.fn()} />);

  fireEvent.press(screen.getByText('Preview First'));
  fireEvent.press(screen.getByText('Preview First'));

  await waitFor(() => expect(player.seekTo).toHaveBeenCalledWith(0));
  await waitFor(() => expect(player.play).toHaveBeenCalledTimes(2));
});
