# BP & AF Insurance Broker Portal

> A comprehensive insurance brokerage management system built with Next.js 16, React 19, and Supabase.

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

## 🚀 Features

### Core Modules (30+)
- **Dashboard** - Real-time KPIs, charts, and activity feed
- **Customers** - CRUD, bulk import, portal account management
- **Policies** - Complete lifecycle management with AI-powered PDF extraction
- **Claims** - Submission, tracking, document management
- **Proposals** - Quote generation and approval workflow
- **Renewals** - Automated tracking and reminders
- **Premiums** - Payment tracking and receipts
- **Business Cases** - Sales pipeline and opportunity management
- **Attendance** - GPS-based check-in/out with location tracking
- **Sales Leads** - CRM with Kanban board
- **Documents** - Centralized document repository
- **Communications** - Templates and bulk messaging
- **Reports** - Comprehensive business intelligence

### Advanced Features
- 🤖 **AI-Powered PDF Extraction** - Gemini AI + Regex for accurate data extraction
- 📄 **Unified Intake Desk** - 7-step policy creation workflow
- 🔄 **Direct Policy Issuance** - One-click policy creation from business cases
- 🔐 **Role-Based Access Control** - Admin, Manager, Employee roles
- 📊 **Real-time Updates** - Supabase Realtime for live data
- 📱 **Responsive Design** - Mobile-first UI with Tailwind CSS
- 🎨 **Modern UI** - Framer Motion animations, Radix UI components
- 🔍 **Advanced Search** - Full-text search across all modules
- 📧 **Email Notifications** - Automated reminders and alerts
- 🌐 **Customer Portal** - Self-service portal for customers

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [License](#-license)

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 16.1.6 (App Router)
- **UI Library**: React 19.2.3
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Components**: Radix UI, shadcn/ui
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod
- **Data Fetching**: SWR

### Backend
- **API**: Next.js API Routes (39 endpoints)
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth (JWT)
- **Storage**: Supabase Storage
- **Email**: Nodemailer

### External Services
- **AI**: Google Gemini (PDF extraction)
- **Monitoring**: Sentry
- **Analytics**: Vercel Analytics
- **PDF Processing**: pdf-lib, pdf-parse

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/bapf-portal.git
cd bapf-portal
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials (see [Environment Variables](#-environment-variables))

4. **Run database migrations**
```bash
# Migrations are in supabase/migrations/
# Apply them via Supabase Dashboard or CLI
```

5. **Start development server**
```bash
npm run dev
# or
yarn dev
```

6. **Open browser**
```
http://localhost:3000
```

## 📁 Project Structure

```
bapf-portal/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (39 endpoints)
│   │   ├── extract-pdf/          # PDF extraction API
│   │   ├── upload/               # File upload API
│   │   ├── policies/             # Policy CRUD
│   │   ├── customers/            # Customer CRUD
│   │   └── ...                   # Other endpoints
│   ├── dashboard/                # Dashboard pages
│   │   ├── intake/               # Unified intake desk
│   │   ├── policies/             # Policy management
│   │   ├── customers/            # Customer management
│   │   ├── business-cases/       # Business case pipeline
│   │   └── ...                   # Other modules
│   ├── login/                    # Authentication
│   └── layout.tsx                # Root layout
├── components/                   # Reusable components
│   ├── ui/                       # shadcn/ui components
│   └── ...                       # Custom components
├── lib/                          # Utilities and services
│   ├── services/                 # Business logic services
│   ├── helpers/                  # Helper functions
│   │   └── pdf-extractor.ts     # PDF extraction logic
│   ├── monitoring/               # Error tracking
│   │   └── error-tracker.ts     # Sentry integration
│   ├── supabase/                 # Supabase clients
│   ├── api/                      # API middleware
│   │   └── auth-middleware.ts   # JWT verification
│   └── types/                    # TypeScript types
├── tests/                        # Test files
│   ├── flows/                    # Integration tests
│   └── api/                      # API tests
├── public/                       # Static assets
├── supabase/                     # Supabase config
│   └── migrations/               # Database migrations (30+)
├── docs/                         # Documentation
│   ├── fixes/                    # Bug fix documentation
│   ├── deployment/               # Deployment guides
│   └── production/               # Production readiness
└── package.json                  # Dependencies
```

## 🔐 Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES=30

# PDF Extractor API
PDF_EXTRACTOR_API_URL=http://localhost:3002/api/upload

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@yourdomain.com

# Security
OFFICE_IP_WHITELIST=192.168.1.0/24,10.0.0.0/8

# Monitoring (Optional)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_token

# Analytics (Optional)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_analytics_id
```

### Required Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)

### Optional Variables
- `PDF_EXTRACTOR_API_URL` - External PDF extraction service URL
- `SMTP_*` - Email configuration for notifications
- `NEXT_PUBLIC_SENTRY_DSN` - Error tracking with Sentry
- `OFFICE_IP_WHITELIST` - IP whitelist for additional security

## 💻 Development

### Running the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run type-check
```

## 🧪 Testing

### Run All Tests

```bash
npm run test
```

### Run Specific Test File

```bash
npm run test tests/flows/intake-flow.test.ts
```

### Run with Coverage

```bash
npm run test:coverage
```

### Watch Mode

```bash
npm run test:watch
```

### Test Coverage

Current test coverage: **45%** (54+ tests)

**Covered Areas**:
- ✅ Intake flow (19 tests)
- ✅ PDF extraction (14 tests)
- ✅ Authentication (10 tests)
- ✅ File upload (11 tests)

**Target**: 70% coverage

## 🚢 Deployment

### Vercel (Recommended)

1. **Connect to Vercel**
```bash
npm i -g vercel
vercel login
vercel
```

2. **Configure Environment Variables**
   - Add all environment variables in Vercel Dashboard
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is added as a secret

3. **Deploy**
```bash
vercel --prod
```

### Manual Deployment

See [docs/deployment/SETUP.md](docs/deployment/SETUP.md) for detailed deployment instructions.

## 📚 API Documentation

### API Endpoints (39 total)

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token

#### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/[id]` - Get customer details
- `PUT /api/customers/[id]` - Update customer
- `DELETE /api/customers/[id]` - Delete customer

#### Policies
- `GET /api/policies` - List policies
- `POST /api/policies` - Create policy
- `GET /api/policies/[id]` - Get policy details
- `PUT /api/policies/[id]` - Update policy
- `DELETE /api/policies/[id]` - Delete policy

#### PDF Extraction
- `POST /api/extract-pdf` - Extract data from PDF

#### File Upload
- `POST /api/upload` - Get signed upload URL

#### Business Cases
- `GET /api/business-cases` - List business cases
- `POST /api/business-cases` - Create business case
- `GET /api/business-cases/[id]` - Get business case details
- `PUT /api/business-cases/[id]` - Update business case

For complete API documentation, see [docs/API.md](docs/API.md)

## 🔒 Security

### Authentication
- JWT-based authentication via Supabase Auth
- Role-based access control (Admin, Manager, Employee)
- Row-level security (RLS) on all database tables
- Session timeout (30 minutes default)

### API Security
- Rate limiting (30 requests/minute per IP)
- CORS configuration
- Input validation with Zod
- SQL injection protection (Supabase client)
- XSS protection (React escaping)
- CSRF protection (SameSite cookies)

### File Upload Security
- File type validation (PDF, images only)
- File size limit (10MB)
- Path traversal prevention
- Malicious filename sanitization
- Signed URLs for secure access

### Planned Security Enhancements
- [ ] Two-Factor Authentication (2FA)
- [ ] Enhanced input validation
- [ ] Malware scanning for uploads
- [ ] Penetration testing

## 📊 Monitoring & Error Tracking

### Sentry Integration

Error tracking is integrated via Sentry:

```typescript
import { trackError, trackAPIError } from '@/lib/monitoring/error-tracker';

// Track errors
try {
  await riskyOperation();
} catch (error) {
  trackError(error, { user, extra: { context } }, 'error');
}

// Track API errors
trackAPIError('/api/endpoint', error, 
  { method: 'POST', body: data },
  { status: 500 }
);
```

### Performance Monitoring

```typescript
import { measurePerformance } from '@/lib/monitoring/error-tracker';

const result = await measurePerformance('operation-name', async () => {
  return await slowOperation();
}, { metadata: { size: 1000 } });
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Coding Standards
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write tests for new features
- Update documentation as needed
- Follow the existing code style

### Commit Message Format
```
type(scope): subject

body

footer
```

**Types**: feat, fix, docs, style, refactor, test, chore

## 📝 License

This project is proprietary software. All rights reserved.

## 👥 Team

- **Development Team** - BP & AF Insurance Brokers
- **Project Lead** - [Your Name]
- **Contributors** - See [CONTRIBUTORS.md](CONTRIBUTORS.md)

## 📞 Support

For support and questions:
- **Email**: support@bpaf.in
- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/bapf-portal/issues)

## 🗺 Roadmap

### Current Version: 1.0.0

### Upcoming Features
- [ ] Two-Factor Authentication (2FA)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] WhatsApp integration
- [ ] Payment gateway integration
- [ ] Multi-language support
- [ ] AI chatbot for customer support

### Production Readiness
- **Current**: 70%
- **Target**: 80%+
- **Timeline**: 6-8 weeks

See [docs/production/PRODUCTION_READINESS_SUMMARY.md](docs/production/PRODUCTION_READINESS_SUMMARY.md) for details.

## 📈 Performance

- **Page Load**: < 3 seconds
- **PDF Extraction**: 10-15 seconds (optimization in progress)
- **API Response Time**: < 200ms average
- **Database Queries**: Optimized with indexes

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a service
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Radix UI](https://www.radix-ui.com/) - UI components
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [Sentry](https://sentry.io/) - Error tracking

---

**Made with ❤️ by BP & AF Insurance Brokers**
