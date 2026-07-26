import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { FileText, ChevronRight } from 'lucide-react-native';
import { BackButton } from '@/components/back-button';
import { scale, verticalScale } from 'react-native-size-matters';
import { logger } from '@/lib/logger';
import { LEGAL_DOCUMENTS, type LegalDocId } from '@/constants/legal';
import { Colors } from '@/lib/constants';

// Every option icon shares this neutral slate color, matching the main
// settings screen.
const OPTION_ICON_COLOR = '#64748B';

type LegalDocument = LegalDocId;

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: LegalDocument }>();
  const [selectedDoc, setSelectedDoc] = useState<LegalDocument | null>(
    doc || null,
  );

  const legalDocuments = [
    {
      id: 'terms' as LegalDocument,
      title: 'Terms of Service',
      description: 'Our terms and conditions for using Keepsafe',
    },
    {
      id: 'eula' as LegalDocument,
      title: 'End User License Agreement',
      description: 'License agreement for the Keepsafe application',
    },
    {
      id: 'privacy' as LegalDocument,
      title: 'Privacy Policy',
      description: 'How we collect, use, and protect your data',
    },
  ];

  const renderDocumentContent = (docId: LegalDocument) => {
    const document = LEGAL_DOCUMENTS[docId];

    if (!document) {
      logger.error('Invalid document ID passed to renderDocumentContent', {
        invalidId: docId,
        validIds: ['terms', 'eula', 'privacy'],
        context: 'LegalScreen.renderDocumentContent',
      });
      return (
        <View style={styles.documentContent}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Document Not Found</Text>
            <Text style={styles.errorMessage}>
              The requested document could not be found. Please try selecting a
              document from the list.
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.documentContent}>
        <Text style={styles.documentTitle}>{document.title}</Text>
        <Text style={styles.lastUpdated}>
          Last Updated: {document.lastUpdated}
        </Text>

        {document.sections.map((section) => (
          <React.Fragment key={section.title}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionText}>{section.text}</Text>
          </React.Fragment>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton
          onPress={() => {
            if (selectedDoc) {
              setSelectedDoc(null);
            } else {
              router.back();
            }
          }}
        />
        <Text style={styles.title}>
          {selectedDoc
            ? legalDocuments.find((d) => d.id === selectedDoc)?.title
            : 'Legal'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {!selectedDoc ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.documentsSection}>
            {legalDocuments.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={styles.documentItem}
                onPress={() => setSelectedDoc(doc.id)}
              >
                <View style={styles.iconContainer}>
                  <FileText color={OPTION_ICON_COLOR} size={20} />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentItemTitle}>{doc.title}</Text>
                  <Text style={styles.documentItemDescription}>
                    {doc.description}
                  </Text>
                </View>
                <ChevronRight color="#94A3B8" size={20} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderDocumentContent(selectedDoc)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
  },
  title: {
    fontSize: scale(16),
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
  },
  content: {
    flex: 1,
  },
  documentsSection: {
    margin: 20,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 2,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${OPTION_ICON_COLOR}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  documentInfo: {
    flex: 1,
  },
  documentItemTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  documentItemDescription: {
    fontSize: 14,
    fontFamily: 'Jost-Regular',
    color: '#64748B',
  },
  documentContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  documentTitle: {
    fontSize: 28,
    fontFamily: 'Outfit-Bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    fontFamily: 'Jost-Regular',
    color: '#94A3B8',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Outfit-SemiBold',
    color: '#1E293B',
    marginTop: 24,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    fontFamily: 'Jost-Regular',
    color: '#475569',
    lineHeight: 24,
    marginBottom: 16,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Outfit-SemiBold',
    color: '#DC2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    fontFamily: 'Jost-Regular',
    color: '#64748B',
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
