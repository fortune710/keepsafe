# KeepSafe 🛡️

**Secure Your Digital Life with AI-Powered Intelligence.**

KeepSafe is a next-generation personal data vault that leverages advanced AI to help you organize, secure, and interact with your digital memories and sensitive information. Built with a modern tech stack, it combines robust encryption with the power of Semantic Search and Generative AI.

---

## 🚀 Key Features

- **🔐 Secure Vault**: Store passwords, notes, and sensitive documents with industry-standard encryption.
- **🧠 Dreamscape**: An immersive AI-powered interface to explore and visualize your data connections.
- **🔍 Smart Semantic Search**: Don't just match keywords—find what you *mean* using Pinecone vector embeddings.
- **🤝 Trusted Social Graph**: Securely share select information with verified friends and family.
- **⚡ Real-time Updates**: Instant synchronization across devices using Supabase.

---

## 🛠️ Architecture & Tech Stack

KeepSafe is built as a monorepo containing a high-performance Python backend and a cross-platform React Native frontend.

### Backend (`/backend`)
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) - High-performance async API.
- **AI Engine**: [Google GenAI (Gemini)](https://ai.google.dev/) - For generative text and analysis.
- **Vector DB**: [Pinecone](https://www.pinecone.io/) - For semantic search and memory retrieval.
- **Database & Auth**: [Supabase](https://supabase.com/) - Postgres database and secure authentication.

### Frontend (`/frontend`)
- **Core**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) (SDK 54).
- **Language**: TypeScript - For type-safe robust code.
- **Styling**: [NativeWind](https://www.nativewind.dev/) (Tailwind CSS) - Utility-first styling.
- **Routing**: Expo Router - File-based navigation.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18+) & **npm/bun**
- **Python** (3.10+)
- **Expo Go** (on your mobile device)

### Required API Keys
You will need to sign up for the following services to get API keys:
1.  **Supabase**: Project URL and Anon Key.
2.  **Google AI Studio**: API Key for Gemini models.
3.  **Pinecone**: API Key and Environment for vector storage.

---

## ⚙️ Configuration

Create a `.env` file in the `backend` directory with the following variables:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=your_pinecone_env
PINECONE_INDEX_NAME=keepsafe-entries
PORT=8000
ENVIRONMENT=development
```

*(Note: The frontend uses `expo-env.d.ts` and standard Expo environment configuration)*

---

## 🚀 Getting Started

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload
```
The API will be available at `http://localhost:8000`.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install  # or bun install

# Start the Expo development server
npx expo start
```
Scan the QR code with the **Expo Go** app on your phone to run the application.

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
