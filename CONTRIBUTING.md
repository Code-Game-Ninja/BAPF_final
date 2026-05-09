# Contributing to BP & AF Insurance Broker Portal

Thank you for your interest in contributing to the BP & AF Insurance Broker Portal! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Bug Reports](#bug-reports)
- [Feature Requests](#feature-requests)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. Please be respectful and constructive in your interactions.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Git
- Supabase account (for database access)
- Code editor (VS Code recommended)

### Setup Development Environment

1. **Fork the repository**
```bash
# Click "Fork" on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/bapf-portal.git
cd bapf-portal
```

2. **Add upstream remote**
```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/bapf-portal.git
```

3. **Install dependencies**
```bash
npm install
```

4. **Set up environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

5. **Run development server**
```bash
npm run dev
```

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
# Update your fork
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 2. Make Changes

- Write clean, readable code
- Follow the coding standards (see below)
- Add tests for new features
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run tests
npm run test

# Run linter
npm run lint

# Type check
npm run type-check

# Build to ensure no errors
npm run build
```

### 4. Commit Your Changes

Follow the commit message format (see below):

```bash
git add .
git commit -m "feat(customers): add bulk import feature"
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types/interfaces
- Avoid `any` type unless absolutely necessary
- Use strict mode

**Example**:
```typescript
// Good
interface Customer {
  id: string;
  name: string;
  email: string;
}

function getCustomer(id: string): Promise<Customer> {
  // ...
}

// Bad
function getCustomer(id: any): any {
  // ...
}
```

### React Components

- Use functional components with hooks
- Keep components small and focused
- Use proper prop types
- Extract reusable logic into custom hooks

**Example**:
```typescript
// Good
interface CustomerCardProps {
  customer: Customer;
  onEdit: (id: string) => void;
}

export function CustomerCard({ customer, onEdit }: CustomerCardProps) {
  return (
    <div>
      <h3>{customer.name}</h3>
      <button onClick={() => onEdit(customer.id)}>Edit</button>
    </div>
  );
}

// Bad
export function CustomerCard(props: any) {
  return <div>{props.customer.name}</div>;
}
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `CustomerCard.tsx`)
- Utilities: `kebab-case.ts` (e.g., `format-currency.ts`)
- Hooks: `use-kebab-case.ts` (e.g., `use-customers.ts`)
- Types: `kebab-case.ts` (e.g., `customer-types.ts`)

### Code Organization

```
component/
├── ComponentName.tsx          # Main component
├── ComponentName.test.tsx     # Tests
├── ComponentName.stories.tsx  # Storybook (if applicable)
├── components/                # Sub-components
│   └── SubComponent.tsx
└── hooks/                     # Component-specific hooks
    └── use-component-logic.ts
```

### Styling

- Use Tailwind CSS utility classes
- Follow mobile-first approach
- Use consistent spacing (4px grid)
- Use theme colors from Tailwind config

**Example**:
```tsx
// Good
<div className="flex items-center gap-4 p-4 rounded-lg bg-card">
  <h3 className="text-lg font-bold">Title</h3>
</div>

// Bad
<div style={{ display: 'flex', padding: '16px' }}>
  <h3 style={{ fontSize: '18px' }}>Title</h3>
</div>
```

### API Routes

- Use proper HTTP methods (GET, POST, PUT, DELETE)
- Validate input using Zod schemas
- Return consistent error responses
- Add authentication middleware
- Add rate limiting

**Example**:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError, authError } from '@/lib/api/auth-middleware';
import { createCustomerSchema } from '@/lib/validation/schemas';
import { trackAPIError } from '@/lib/monitoring/error-tracker';

export async function POST(req: NextRequest) {
  // Auth check
  const caller = await requireAuth(req);
  if (isAuthError(caller)) return authError(caller);

  try {
    // Validate input
    const body = await req.json();
    const data = createCustomerSchema.parse(body);

    // Business logic
    const customer = await createCustomer(data, caller.uid);

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    trackAPIError('/api/customers', error, { method: 'POST' }, { status: 500 });
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}
```

## Testing Guidelines

### Unit Tests

- Test individual functions/components
- Mock external dependencies
- Use descriptive test names
- Aim for 70%+ coverage

**Example**:
```typescript
import { describe, it, expect } from 'vitest';
import { formatCurrency } from './format-currency';

describe('formatCurrency', () => {
  it('should format Indian currency correctly', () => {
    expect(formatCurrency(1000)).toBe('₹1,000');
    expect(formatCurrency(100000)).toBe('₹1,00,000');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('₹0');
  });

  it('should handle negative numbers', () => {
    expect(formatCurrency(-1000)).toBe('-₹1,000');
  });
});
```

### Integration Tests

- Test complete user flows
- Test API endpoints
- Test database interactions

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test path/to/test.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Scopes

- `customers`: Customer management
- `policies`: Policy management
- `claims`: Claims management
- `intake`: Intake desk
- `auth`: Authentication
- `api`: API routes
- `ui`: UI components
- `db`: Database

### Examples

```bash
# Feature
git commit -m "feat(customers): add bulk import functionality"

# Bug fix
git commit -m "fix(policies): correct premium calculation for motor policies"

# Documentation
git commit -m "docs(api): update API documentation with new endpoints"

# Refactoring
git commit -m "refactor(intake): extract PDF extraction logic to separate service"

# Breaking change
git commit -m "feat(auth)!: implement 2FA authentication

BREAKING CHANGE: Users must set up 2FA to access the system"
```

## Pull Request Process

### Before Submitting

1. ✅ All tests pass
2. ✅ Code follows style guidelines
3. ✅ Documentation updated
4. ✅ Commit messages follow format
5. ✅ Branch is up to date with main

### PR Title

Use the same format as commit messages:

```
feat(customers): add bulk import feature
```

### PR Description

Use this template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots here

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass
- [ ] No new warnings
```

### Review Process

1. Automated checks run (tests, linting, build)
2. Code review by maintainers
3. Address feedback
4. Approval and merge

## Bug Reports

### Before Reporting

1. Check existing issues
2. Verify it's reproducible
3. Test on latest version

### Bug Report Template

```markdown
**Describe the bug**
Clear description of the bug

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen

**Screenshots**
If applicable

**Environment**
- OS: [e.g., Windows 11]
- Browser: [e.g., Chrome 120]
- Version: [e.g., 1.0.0]

**Additional context**
Any other relevant information
```

## Feature Requests

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
Clear description of the problem

**Describe the solution you'd like**
Clear description of desired solution

**Describe alternatives you've considered**
Alternative solutions or features

**Additional context**
Mockups, examples, or other context
```

## Questions?

- **Email**: dev@bpaf.in
- **Documentation**: [docs/](docs/)
- **Discussions**: GitHub Discussions

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing! 🎉
