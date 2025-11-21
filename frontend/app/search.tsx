import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Dimensions,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, ArrowLeft, SendHorizonal, Video as VideoIcon, Mic } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSearch } from '@/hooks/use-search';
import { useUserEntries } from '@/hooks/use-user-entries';
import { Colors } from '@/lib/constants';
import { Image } from 'expo-image';
import Markdown from 'react-native-markdown-display';
import { verticalScale } from 'react-native-size-matters';

const SAMPLE_QUERIES = [
  'Show me my happiest memories',
  'Find photos from last summer',
  'What did I capture with music last week?',
  'Memories I shared with friends',
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SearchMessageProps {
  message: { id: string; role: string; content: string };
}

interface SearchEntryPreviewProps {
  entry: any;
}

const SearchEntryPreview: React.FC<SearchEntryPreviewProps> = ({ entry }) => {
  const [visible, setVisible] = useState(false);

  const open = () => setVisible(true);
  const close = () => setVisible(false);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={open}
        style={styles.searchPreviewContainer}
      >
        {entry.type === 'photo' && entry.content_url ? (
          <Image
            source={{ uri: entry.content_url }}
            style={styles.resultPreviewImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.resultPreviewPlaceholder}>
            {entry.type === 'video' && (
              <VideoIcon color="#111827" size={20} style={styles.resultPreviewIcon} />
            )}
            {entry.type === 'audio' && (
              <Mic color="#111827" size={20} style={styles.resultPreviewIcon} />
            )}
            <Text style={styles.resultPreviewType}>
              {entry.type || 'entry'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity style={styles.fullscreenBackdrop} onPress={close} />
          <View style={styles.fullscreenContent}>
            {entry.type === 'photo' && entry.content_url ? (
              <Image
                source={{ uri: entry.content_url }}
                style={styles.fullscreenImage}
                contentFit="contain"
              />
            ) : (
              <View style={styles.fullscreenPlaceholder}>
                {entry.type === 'video' && (
                  <VideoIcon color="#E5E7EB" size={32} style={styles.resultPreviewIcon} />
                )}
                {entry.type === 'audio' && (
                  <Mic color="#E5E7EB" size={32} style={styles.resultPreviewIcon} />
                )}
                <Text style={styles.resultPreviewType}>
                  {entry.type || 'entry'}
                </Text>
                {entry.created_at && (
                  <Text style={styles.fullscreenMeta}>
                    {new Date(entry.created_at).toLocaleString()}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const SearchMessage: React.FC<SearchMessageProps> = ({ message }) => {
  const isAssistant = message.role === 'assistant';

  const { cleanText, entries } = useMemo(() => {
    const content = message.content ?? '';
    const codeBlockRegex = /```json([\s\S]*?)```/i;
    const match = content.match(codeBlockRegex);

    let parsedEntries: any[] = [];
    if (match && match[1]) {
      const jsonText = match[1].trim();
      try {
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
          parsedEntries = parsed;
        }
      } catch (error) {
        console.warn('SearchMessage: failed to parse JSON code block', error);
      }
    }

    const cleaned = match ? content.replace(codeBlockRegex, '').trim() : content;

    return {
      cleanText: cleaned,
      entries: parsedEntries,
    };
  }, [message.content]);

  return (
    <View style={styles.searchMessageContainer}>
      <View
        style={[
          styles.messageBubble,
          isAssistant ? styles.assistantBubble : styles.userBubble,
          { alignSelf: 'stretch' },
        ]}
      >
        {cleanText ? (
          <Markdown
            style={{
              body: {
                color: isAssistant ? styles.assistantText.color : styles.userText.color,
                fontSize: styles.messageText.fontSize,
              },
              paragraph: {
                marginTop: 0,
                marginBottom: 4,
              },
              bullet_list: {
                marginVertical: 4,
              },
              ordered_list: {
                marginVertical: 4,
              },
              heading1: {
                fontSize: 18,
                fontWeight: '700',
                marginBottom: 6,
                color: isAssistant ? styles.assistantText.color : styles.userText.color,
              },
              heading2: {
                fontSize: 16,
                fontWeight: '700',
                marginBottom: 4,
                color: isAssistant ? styles.assistantText.color : styles.userText.color,
              },
              code_inline: {
                backgroundColor: '#E5E7EB',
                borderRadius: 4,
                paddingHorizontal: 4,
                paddingVertical: 2,
              },
            }}
          >
            {cleanText}
          </Markdown>
        ) : null}

        {entries.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.resultPreviewList}
          >
            {entries.map((entry) => (
              <SearchEntryPreview
                key={entry.entry_id || entry.id}
                entry={entry}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

export default function SearchScreen() {
  const { messages, input, setInput, startSearch, isLoading, error } = useSearch();
  const { entries, isLoading: entriesLoading } = useUserEntries();

  const hasMessages = messages.length > 0;

  const handleSubmit = () => {
    if (!input.trim()) return;
    // Dismiss the keyboard immediately upon submit
    if (Platform.OS !== 'web' && typeof Keyboard !== 'undefined' && Keyboard.dismiss) {
      Keyboard.dismiss();
    }
    void startSearch();
  };

  const renderEntryItem = ({ item }: any) => {
    return <SearchEntryPreview entry={item} />;
  };

  const renderMessageItem = ({ item }: any) => {
    return <SearchMessage message={item} />;
  };

  const showRecentAndSamples = !hasMessages;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color="#64748B" size={24} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Sparkles color={Colors.primary} size={20} />
            <Text style={styles.headerTitle}>Search memories</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          {showRecentAndSamples ? (
            <View style={styles.emptyState}>
              <Text style={styles.sectionTitle}>Recent memories</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.entriesListContent}
              >
                {entries.slice(0, 5).length === 0 ? (
                  entriesLoading ? (
                    <Text style={styles.placeholderText}>Loading your memories…</Text>
                  ) : (
                    <Text style={styles.placeholderText}>
                      Your recent captures will appear here.
                    </Text>
                  )
                ) : (
                  entries.slice(0, 5).map((item) => (
                    <View key={item.id}>
                      {renderEntryItem({ item })}
                    </View>
                  ))
                )}
              </ScrollView>

              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
                Try asking…
              </Text>
              <View style={styles.sampleQueriesContainer}>
                {SAMPLE_QUERIES.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={styles.sampleQueryChip}
                    onPress={() => {
                      setInput(q);
                      void startSearch(q);
                    }}
                  >
                    <Text style={styles.sampleQueryText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessageItem}
              contentContainerStyle={styles.messagesListContent}
            />
          )}
        </View>

        <View style={styles.inputContainer}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask anything about your memories…"
              placeholderTextColor="#94A3B8"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSubmit}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[
                styles.searchButton,
                (!input.trim() || isLoading) && styles.searchButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!input.trim() || isLoading}
            >
              <SendHorizonal color="white" size={20} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hintText}>
            Results are generated from your memories and what you’ve shared with friends.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(240, 249, 255, 0.96)',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyState: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2933',
    marginBottom: 8,
  },
  entriesListContent: {
    paddingBottom: 8,
  },
  entryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  entryTitle: {
    fontSize: 14,
    color: '#1F2933',
    marginBottom: 4,
  },
  entryMeta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sampleQueriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  sampleQueryChip: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sampleQueryText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  messagesListContent: {
    paddingVertical: 8,
    gap: 8,
  },
  messageBubble: {
    width: '100%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCFCE7',
  },
  messageText: {
    fontSize: 14,
  },
  assistantText: {
    color: '#1F2933',
  },
  userText: {
    color: '#065F46',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    height: verticalScale(110),
    marginBottom: verticalScale(-30)
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#111827',
  },
  searchButton: {
    borderRadius: 999,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  searchButtonDisabled: {
    backgroundColor: '#CBD5F5',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  hintText: {
    marginTop: 6,
    fontSize: 11,
    color: '#9CA3AF',
  },
  placeholderText: {
    fontSize: 13,
    color: '#9CA3AF',
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 4,
  },
  searchMessageContainer: {
    width: '100%',
  },
  resultPreviewList: {
    marginTop: 8,
    paddingVertical: 4,
  },
  searchPreviewContainer: {
    width: SCREEN_WIDTH * 0.28,
    height: SCREEN_WIDTH * 0.28,
    marginRight: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  resultPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  resultPreviewPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  resultPreviewIcon: {
    marginBottom: 4,
  },
  resultPreviewType: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  fullscreenOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  fullscreenContent: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.7,
    borderRadius: 16,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  fullscreenPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenMeta: {
    marginTop: 8,
    fontSize: 13,
    color: '#E5E7EB',
  },
});


