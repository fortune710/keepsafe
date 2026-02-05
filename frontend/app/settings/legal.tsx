import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, FileText, ChevronRight } from 'lucide-react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { logger } from '@/lib/logger';

type LegalDocument = 'terms' | 'eula' | 'privacy';

export default function LegalScreen() {
  const [selectedDoc, setSelectedDoc] = useState<LegalDocument | null>(null);

  const legalDocuments = [
    {
      id: 'terms' as LegalDocument,
      title: 'Terms of Service',
      description: 'Our terms and conditions for using Keepsafe',
      color: '#059669',
    },
    {
      id: 'eula' as LegalDocument,
      title: 'End User License Agreement',
      description: 'License agreement for the Keepsafe application',
      color: '#8B5CF6',
    },
    {
      id: 'privacy' as LegalDocument,
      title: 'Privacy Policy',
      description: 'How we collect, use, and protect your data',
      color: '#DC2626',
    },
  ];

  const renderDocumentContent = (docId: LegalDocument) => {
    switch (docId) {
      case 'terms':
        return (
          <View style={styles.documentContent}>
            <Text style={styles.documentTitle}>Terms of Service</Text>
            <Text style={styles.lastUpdated}>Last Updated: January 15, 2025</Text>
            
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.sectionText}>
              By accessing and using Keepsafe, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </Text>

            <Text style={styles.sectionTitle}>2. Description of Service</Text>
            <Text style={styles.sectionText}>
              Keepsafe is a mobile application that allows users to capture, store, and share their most treasured moments. The service provides secure storage and sharing capabilities for photos, videos, and other media content.
            </Text>

            <Text style={styles.sectionTitle}>3. User Accounts</Text>
            <Text style={styles.sectionText}>
              You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We reserve the right to suspend or terminate accounts that violate these terms.
            </Text>

            <Text style={styles.sectionTitle}>4. User Content</Text>
            <Text style={styles.sectionText}>
              You retain all rights to content you upload to Keepsafe. By uploading content, you grant us a license to store, process, and display your content as necessary to provide the service. You are solely responsible for the content you upload and must ensure you have the right to share it.
            </Text>

            <Text style={styles.sectionTitle}>5. Prohibited Uses</Text>
            <Text style={styles.sectionText}>
              You may not use Keepsafe to upload, share, or transmit any content that is illegal, harmful, threatening, abusive, or violates any third-party rights. We reserve the right to remove any content that violates these terms.
            </Text>

            <Text style={styles.sectionTitle}>6. Service Availability</Text>
            <Text style={styles.sectionText}>
              We strive to provide reliable service but do not guarantee uninterrupted access. We may perform maintenance, updates, or modifications that temporarily affect service availability.
            </Text>

            <Text style={styles.sectionTitle}>7. Limitation of Liability</Text>
            <Text style={styles.sectionText}>
              Keepsafe is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.
            </Text>

            <Text style={styles.sectionTitle}>8. Changes to Terms</Text>
            <Text style={styles.sectionText}>
              We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms. We will notify users of significant changes.
            </Text>

            <Text style={styles.sectionTitle}>9. Contact Information</Text>
            <Text style={styles.sectionText}>
              If you have questions about these Terms of Service, please contact us at contact@fortunealebiosu.dev.
            </Text>
          </View>
        );

      case 'eula':
        return (
          <View style={styles.documentContent}>
            <Text style={styles.documentTitle}>End User License Agreement</Text>
            <Text style={styles.lastUpdated}>Last Updated: January 15, 2025</Text>
            
            <Text style={styles.sectionTitle}>1. Grant of License</Text>
            <Text style={styles.sectionText}>
              Subject to the terms of this Agreement, Keepsafe grants you a limited, non-exclusive, non-transferable, revocable license to use the Keepsafe mobile application on your personal device for personal, non-commercial purposes.
            </Text>

            <Text style={styles.sectionTitle}>2. License Restrictions</Text>
            <Text style={styles.sectionText}>
              You may not: (a) copy, modify, or create derivative works of the application; (b) reverse engineer, decompile, or disassemble the application; (c) remove any proprietary notices or labels; (d) rent, lease, or sublicense the application; or (e) use the application for any illegal purpose.
            </Text>

            <Text style={styles.sectionTitle}>3. Intellectual Property</Text>
            <Text style={styles.sectionText}>
              The application, including all content, features, and functionality, is owned by Keepsafe and protected by copyright, trademark, and other intellectual property laws. This Agreement does not grant you any rights to use our trademarks, logos, or other brand features.
            </Text>

            <Text style={styles.sectionTitle}>4. Updates and Modifications</Text>
            <Text style={styles.sectionText}>
              Keepsafe may provide updates, patches, or modifications to the application. You agree to install such updates to continue using the service. We reserve the right to modify or discontinue features at any time.
            </Text>

            <Text style={styles.sectionTitle}>5. Termination</Text>
            <Text style={styles.sectionText}>
              This license is effective until terminated. Your rights under this license will terminate automatically without notice if you fail to comply with any term of this Agreement. Upon termination, you must cease all use of the application and delete all copies.
            </Text>

            <Text style={styles.sectionTitle}>6. Disclaimer of Warranties</Text>
            <Text style={styles.sectionText}>
              THE APPLICATION IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </Text>

            <Text style={styles.sectionTitle}>7. Limitation of Liability</Text>
            <Text style={styles.sectionText}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, KEEPSAFE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.
            </Text>

            <Text style={styles.sectionTitle}>8. Governing Law</Text>
            <Text style={styles.sectionText}>
              This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction in which Keepsafe operates, without regard to its conflict of law provisions.
            </Text>
          </View>
        );

      case 'privacy':
        return (
          <View style={styles.documentContent}>
            <Text style={styles.documentTitle}>Privacy Policy</Text>
            <Text style={styles.lastUpdated}>Last Updated: January 15, 2025</Text>
            
            <Text style={styles.sectionTitle}>1. Introduction</Text>
            <Text style={styles.sectionText}>
              At Keepsafe, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
            </Text>

            <Text style={styles.sectionTitle}>2. Information We Collect</Text>
            <Text style={styles.sectionText}>
              We collect information that you provide directly to us, including account information (name, email, username), content you upload (photos, videos, captions), and usage data. We also automatically collect device information, log data, and analytics information to improve our service.
            </Text>

            <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
            <Text style={styles.sectionText}>
              We use the information we collect to: provide and maintain our service, process your transactions, send you notifications, improve and personalize your experience, detect and prevent fraud, and comply with legal obligations.
            </Text>

            <Text style={styles.sectionTitle}>4. Information Sharing and Disclosure</Text>
            <Text style={styles.sectionText}>
              We do not sell your personal information. We may share your information with service providers who assist us in operating our service, when required by law, to protect our rights, or with your consent. Content you choose to share with other users will be visible to those users.
            </Text>

            <Text style={styles.sectionTitle}>5. Data Security</Text>
            <Text style={styles.sectionText}>
              We implement appropriate technical and organizational measures to protect your personal information. This includes encryption, secure servers, and access controls. However, no method of transmission over the internet is 100% secure.
            </Text>

            <Text style={styles.sectionTitle}>6. Data Retention</Text>
            <Text style={styles.sectionText}>
              We retain your personal information for as long as necessary to provide our services and fulfill the purposes described in this policy. When you delete your account, we will delete or anonymize your personal information, subject to legal retention requirements.
            </Text>

            <Text style={styles.sectionTitle}>7. Your Rights</Text>
            <Text style={styles.sectionText}>
              You have the right to access, update, or delete your personal information. You can manage your privacy settings within the app, export your data, or request deletion of your account at any time through the app settings.
            </Text>

            <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
            <Text style={styles.sectionText}>
              Keepsafe is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it.
            </Text>

            <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
            <Text style={styles.sectionText}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date. You are advised to review this policy periodically.
            </Text>

            <Text style={styles.sectionTitle}>10. Contact Us</Text>
            <Text style={styles.sectionText}>
              If you have questions about this Privacy Policy, please contact us at contact@fortunealebiosu.dev or through the app's support feature.
            </Text>
          </View>
        );

      default:
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
                The requested document could not be found. Please try selecting a document from the list.
              </Text>
            </View>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (selectedDoc) {
              setSelectedDoc(null);
            } else {
              router.back();
            }
          }}
        >
          <ArrowLeft color="#64748B" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {selectedDoc ? legalDocuments.find(d => d.id === selectedDoc)?.title : 'Legal'}
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
                <View style={[styles.iconContainer, { backgroundColor: `${doc.color}15` }]}>
                  <FileText color={doc.color} size={20} />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentItemTitle}>{doc.title}</Text>
                  <Text style={styles.documentItemDescription}>{doc.description}</Text>
                </View>
                <ChevronRight color="#CBD5E1" size={20} />
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
    backgroundColor: '#F0F9FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
  },
  backButton: {
    padding: 8,
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
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
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

