export type LegalDocId = 'terms' | 'eula' | 'privacy';

export interface LegalSection {
  title: string;
  text: string;
}

export interface LegalDocument {
  id: LegalDocId;
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export const LEGAL_DOCUMENTS: Record<LegalDocId, LegalDocument> = {
  terms: {
    id: 'terms',
    title: 'Terms of Service',
    lastUpdated: 'January 15, 2025',
    sections: [
      {
        title: '1. Acceptance of Terms',
        text: 'By accessing and using Keepsafe, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.',
      },
      {
        title: '2. Description of Service',
        text: 'Keepsafe is a mobile application that allows users to capture, store, and share their most treasured moments. The service provides secure storage and sharing capabilities for photos, videos, and other media content.',
      },
      {
        title: '3. User Accounts',
        text: 'You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We reserve the right to suspend or terminate accounts that violate these terms.',
      },
      {
        title: '4. User Content',
        text: 'You retain all rights to content you upload to Keepsafe. By uploading content, you grant us a license to store, process, and display your content as necessary to provide the service. You are solely responsible for the content you upload and must ensure you have the right to share it.',
      },
      {
        title: '5. Prohibited Uses',
        text: 'You may not use Keepsafe to upload, share, or transmit any content that is illegal, harmful, threatening, abusive, or violates any third-party rights. We reserve the right to remove any content that violates these terms.',
      },
      {
        title: '6. Service Availability',
        text: 'We strive to provide reliable service but do not guarantee uninterrupted access. We may perform maintenance, updates, or modifications that temporarily affect service availability.',
      },
      {
        title: '7. Limitation of Liability',
        text: 'Keepsafe is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.',
      },
      {
        title: '8. Changes to Terms',
        text: 'We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms. We will notify users of significant changes.',
      },
      {
        title: '9. Contact Information',
        text: 'If you have questions about these Terms of Service, please contact us at contact@fortunealebiosu.dev.',
      },
    ],
  },
  eula: {
    id: 'eula',
    title: 'End User License Agreement',
    lastUpdated: 'January 15, 2025',
    sections: [
      {
        title: '1. Grant of License',
        text: 'Subject to the terms of this Agreement, Keepsafe grants you a limited, non-exclusive, non-transferable, revocable license to use the Keepsafe mobile application on your personal device for personal, non-commercial purposes.',
      },
      {
        title: '2. License Restrictions',
        text: 'You may not: (a) copy, modify, or create derivative works of the application; (b) reverse engineer, decompile, or disassemble the application; (c) remove any proprietary notices or labels; (d) rent, lease, or sublicense the application; or (e) use the application for any illegal purpose.',
      },
      {
        title: '3. Intellectual Property',
        text: 'The application, including all content, features, and functionality, is owned by Keepsafe and protected by copyright, trademark, and other intellectual property laws. This Agreement does not grant you any rights to use our trademarks, logos, or other brand features.',
      },
      {
        title: '4. Updates and Modifications',
        text: 'Keepsafe may provide updates, patches, or modifications to the application. You agree to install such updates to continue using the service. We reserve the right to modify or discontinue features at any time.',
      },
      {
        title: '5. Content and Conduct Requirements',
        text: 'You must not post, upload, share, or otherwise distribute harmful, toxic, discriminatory, or sexual content on Keepsafe. If you fail to comply with this requirement, we may take enforcement action, including temporary account suspension or permanent account bans.',
      },
      {
        title: '6. Termination',
        text: 'This license is effective until terminated. Your rights under this license will terminate automatically without notice if you fail to comply with any term of this Agreement. Upon termination, you must cease all use of the application and delete all copies.',
      },
      {
        title: '7. Disclaimer of Warranties',
        text: 'THE APPLICATION IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.',
      },
      {
        title: '8. Limitation of Liability',
        text: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, KEEPSAFE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.',
      },
      {
        title: '9. Governing Law',
        text: 'This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction in which Keepsafe operates, without regard to its conflict of law provisions.',
      },
    ],
  },
  privacy: {
    id: 'privacy',
    title: 'Privacy Policy',
    lastUpdated: 'January 15, 2025',
    sections: [
      {
        title: '1. Introduction',
        text: 'At Keepsafe, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.',
      },
      {
        title: '2. Information We Collect',
        text: 'We collect information that you provide directly to us, including account information (name, email, username), content you upload (photos, videos, captions), and usage data. We also automatically collect device information, log data, and analytics information to improve our service.',
      },
      {
        title: '3. How We Use Your Information',
        text: 'We use the information we collect to: provide and maintain our service, process your transactions, send you notifications, improve and personalize your experience, detect and prevent fraud, and comply with legal obligations.',
      },
      {
        title: '4. Information Sharing and Disclosure',
        text: 'We do not sell your personal information. We may share your information with service providers who assist us in operating our service, when required by law, to protect our rights, or with your consent. Content you choose to share with other users will be visible to those users.',
      },
      {
        title: '5. Data Security',
        text: 'We implement appropriate technical and organizational measures to protect your personal information. This includes encryption, secure servers, and access controls. However, no method of transmission over the internet is 100% secure.',
      },
      {
        title: '6. Data Retention',
        text: 'We retain your personal information for as long as necessary to provide our services and fulfill the purposes described in this policy. When you delete your account, we will delete or anonymize your personal information, subject to legal retention requirements.',
      },
      {
        title: '7. Your Rights',
        text: 'You have the right to access, update, or delete your personal information. You can manage your privacy settings within the app, export your data, or request deletion of your account at any time through the app settings.',
      },
      {
        title: "8. Children's Privacy",
        text: 'Keepsafe is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it.',
      },
      {
        title: '9. Changes to This Policy',
        text: 'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date. You are advised to review this policy periodically.',
      },
      {
        title: '10. Contact Us',
        text: "If you have questions about this Privacy Policy, please contact us at contact@fortunealebiosu.dev or through the app's support feature.",
      },
    ],
  },
};
