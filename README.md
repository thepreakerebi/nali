# Nali - AI Lesson Planner for Teachers

**Nali** is an intelligent lesson planning platform designed specifically for teachers. It leverages AI to help educators create comprehensive, curriculum-aligned lesson plans and notes efficiently. Built with modern web technologies, Nali provides a seamless experience for organizing classes, subjects, and educational content.

## 🌟 Features

### Core Functionality

- **Class & Subject Management**
  - Create and organize classes with grade levels and academic years
  - Assign subjects to specific classes
  - Edit and delete classes/subjects with cascading deletion support

- **AI-Powered Lesson Plan Generation**
  - Automatically generate detailed, curriculum-aligned lesson plans
  - Includes learning objectives, instructional methods, assessment activities, and resources
  - Integrates YouTube videos and educational websites via Firecrawl search
  - Customizable content based on class, subject, topic, and grade level

- **Lesson Notes**
  - Create lesson notes linked to lesson plans
  - AI-assisted note generation
  - Rich text editing with BlockNote.js

- **Rich Text Editor**
  - BlockNote.js integration for powerful document editing
  - BlockNote AI for in-editor AI assistance
  - Auto-save functionality with real-time status feedback
  - Support for embedded videos, links, and formatted content

- **Search & Discovery**
  - Semantic search for lesson plans and notes
  - Filter by class, subject, or lesson plan
  - Hybrid search combining exact matches with semantic similarity

- **User Profile & Settings**
  - Google OAuth authentication
  - Profile management with school name and country
  - Multi-language support (English, French, Kinyarwanda)
  - Settings page for profile updates

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - Accessible component library
- **BlockNote.js** - Rich text editor with AI capabilities
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend
- **Convex** - Backend-as-a-Service (database, serverless functions, real-time)
- **Convex Auth** - Authentication system with Google OAuth
- **OpenAI GPT-4o** - AI model for content generation
- **OpenAI Embeddings** - Semantic search (text-embedding-3-small)
- **Firecrawl** - Web scraping and search for educational resources
- **Marked** - Markdown parsing

### Key Libraries
- **Vercel AI SDK** - AI integration
- **Sonner** - Toast notifications
- **Lucide React** - Icon library
- **React Intl** - Internationalization

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.x or higher
- **npm** or **yarn** package manager
- **Git** for version control
- **Convex account** - Sign up at [convex.dev](https://convex.dev)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd nali
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Convex

1. **Create a Convex project** (if you haven't already):
   ```bash
   npx convex dev
   ```
   This will prompt you to create a new Convex project or link to an existing one.

2. **Set up Convex Auth**:
   The setup script will run automatically, but you can also run:
   ```bash
   npx @convex-dev/auth
   ```
   Follow the prompts to configure Google OAuth.

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Convex
CONVEX_DEPLOYMENT=<your-convex-deployment-url>
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>
CONVEX_SITE_URL=http://localhost:3000

# OpenAI (for AI content generation and embeddings)
OPENAI_API_KEY=<your-openai-api-key>

# Firecrawl (for web search and resource extraction)
FIRECRAWL_API_KEY=<your-firecrawl-api-key>

# Google OAuth (configured via Convex Auth setup)
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
```

**How to get API keys:**

- **OpenAI API Key**: Sign up at [platform.openai.com](https://platform.openai.com) and create an API key
- **Firecrawl API Key**: Sign up at [firecrawl.dev](https://firecrawl.dev) and get your API key
- **Google OAuth**: Follow the Convex Auth setup wizard or configure manually in Google Cloud Console

### 5. Run the Development Server

```bash
npm run dev
```

This command runs both the Next.js frontend and Convex backend in parallel:
- Frontend: `http://localhost:3000`
- Convex Dashboard: Opens automatically in your browser

### 6. First-Time Setup

1. **Sign In**: Navigate to `http://localhost:3000` and sign in with Google
2. **Complete Onboarding**: Enter your school name and country
3. **Create Your First Class**: Add a class with grade level and academic year
4. **Add Subjects**: Create subjects and assign them to classes
5. **Create a Lesson Plan**: Generate your first AI-powered lesson plan!

## 📁 Project Structure

```
nali/
├── app/                          # Next.js App Router pages
│   ├── _components/              # React components
│   │   ├── sidebar.tsx          # Main navigation sidebar
│   │   ├── layoutWrapper.tsx    # Layout wrapper with header
│   │   ├── BlockNoteEditor.tsx  # BlockNote editor component
│   │   └── ...                  # Other components
│   ├── lesson-plans/[id]/       # Lesson plan editor page
│   ├── lesson-notes/[id]/       # Lesson note editor page
│   ├── settings/                 # Settings page
│   ├── onboarding/               # Onboarding flow
│   └── page.tsx                 # Home page
├── convex/                       # Convex backend
│   ├── functions/               # Convex functions
│   │   ├── classes/             # Class CRUD operations
│   │   ├── subjects/             # Subject CRUD operations
│   │   ├── lessonPlans/         # Lesson plan logic
│   │   │   ├── actions/         # Actions (AI generation, etc.)
│   │   │   ├── mutations.ts     # Database mutations
│   │   │   └── queries.ts       # Database queries
│   │   ├── lessonNotes/         # Lesson note logic
│   │   ├── userProfile/         # User profile management
│   │   ├── actions/             # Shared actions (semantic search)
│   │   └── prompts/             # AI prompt templates
│   ├── schema.ts                 # Database schema
│   └── auth.ts                   # Auth configuration
├── components/                   # Reusable UI components
│   └── ui/                       # Shadcn UI components
├── lib/                          # Utility functions
├── dictionaries/                 # i18n translations
└── public/                       # Static assets
```

## 🔧 Development Workflow

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:frontend` - Start only Next.js frontend
- `npm run dev:backend` - Start only Convex backend
- `npm run build` - Build Next.js app for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Convex Development

- **Convex Dashboard**: Automatically opens when running `npm run dev`
- **View Functions**: Check the dashboard to see all queries, mutations, and actions
- **Debug**: Use `console.log()` in Convex functions - logs appear in the dashboard
- **Schema Changes**: Update `convex/schema.ts` and Convex will automatically migrate

### Code Organization

- **Frontend Components**: Place reusable components in `app/_components/`
- **UI Components**: Use Shadcn UI components from `components/ui/`
- **Backend Functions**: Organize by feature in `convex/functions/`
- **Types**: TypeScript types are auto-generated in `convex/_generated/`

## 🎨 Key Features Explained

### AI Lesson Plan Generation

When you create a lesson plan, Nali:
1. Creates an empty lesson plan document
2. Schedules an AI generation job
3. Uses OpenAI GPT-4o to generate comprehensive content
4. Searches for relevant educational resources via Firecrawl
5. Formats content as BlockNote blocks
6. Updates the document in real-time

### Semantic Search

Nali uses vector embeddings to enable semantic search:
- Lesson plans and notes are embedded using OpenAI's text-embedding-3-small
- Search queries are embedded and compared against stored embeddings
- Results combine exact title matches with semantic similarity

### Auto-Save

The BlockNote editor automatically saves changes:
- Debounced saves (waits for pause in typing)
- Real-time status indicators in the header
- Embedding updates scheduled after content changes

## 🔐 Authentication

Nali uses **Convex Auth** with Google OAuth:
- Users sign in with their Google account
- Profile information is synced from Google
- Protected routes require authentication
- Middleware handles route protection automatically

## 🌍 Internationalization

Nali supports multiple languages:
- English (en)
- French (fr)
- Kinyarwanda (rw)

Language preferences are stored in user profiles and can be changed in settings.

## 📚 Learn More

### Convex Resources
- [Convex Documentation](https://docs.convex.dev/)
- [Convex Tour](https://docs.convex.dev/get-started)
- [Convex Auth Docs](https://labs.convex.dev/auth)
- [Convex Discord Community](https://convex.dev/community)

### Next.js Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)

### BlockNote Resources
- [BlockNote Documentation](https://www.blocknotejs.org/docs)
- [BlockNote AI Guide](https://www.blocknotejs.org/docs/features/ai)

### AI SDK Resources
- [Vercel AI SDK](https://ai-sdk.dev/)
- [OpenAI API Reference](https://platform.openai.com/docs)

## 🐛 Troubleshooting

### Common Issues

**Issue**: Convex functions not found
- **Solution**: Ensure `npx convex dev` is running and the deployment is synced

**Issue**: Authentication not working
- **Solution**: Check that Google OAuth credentials are correctly set in `.env.local` and Convex dashboard

**Issue**: AI generation failing
- **Solution**: Verify `OPENAI_API_KEY` and `FIRECRAWL_API_KEY` are set correctly

**Issue**: Build errors
- **Solution**: Run `npm install` again and ensure Node.js version is 20.x or higher

## 📝 License

[Add your license here]

## 🤝 Contributing

[Add contribution guidelines here]

## 📧 Support

For issues, questions, or feature requests, please [open an issue](link-to-issues) or contact the development team.

---

**Built with ❤️ for teachers everywhere**
