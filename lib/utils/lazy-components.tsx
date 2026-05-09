/**
 * Lazy-loaded components for better performance
 * Import these instead of direct imports for heavy components
 */

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// ── Dashboard Pages ───────────────────────────────────────────────

export const LazyBusinessCasesPage = dynamic(
  () => import('@/app/dashboard/business-cases/page'),
  { loading: LoadingFallback, ssr: false }
);

export const LazyClaimsPage = dynamic(
  () => import('@/app/dashboard/claims/page'),
  { loading: LoadingFallback, ssr: false }
);

export const LazyCustomersPage = dynamic(
  () => import('@/app/dashboard/customers/page'),
  { loading: LoadingFallback, ssr: false }
);

export const LazyPoliciesPage = dynamic(
  () => import('@/app/dashboard/policies/page'),
  { loading: LoadingFallback, ssr: false }
);

export const LazyIntakePage = dynamic(
  () => import('@/app/dashboard/intake/page'),
  { loading: LoadingFallback, ssr: false }
);

// ── Forms ─────────────────────────────────────────────────────────

export const LazyProductForm = dynamic(
  () => import('@/app/dashboard/intake/components/ProductForm').then(mod => ({ default: mod.ProductForm })),
  { loading: LoadingFallback, ssr: false }
);

// ── Calendar ──────────────────────────────────────────────────────

export const LazyCalendar = dynamic(
  () => import('@/components/ui/calendar').then(mod => ({ default: mod.Calendar })),
  {
    loading: () => (
      <div className="h-[300px] flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false,
  }
);

// ── Stubs for components not yet implemented ──────────────────────
// These are placeholders — replace with real implementations when needed

const NotImplemented = ({ name }: { name: string }) => (
  <div className="flex items-center justify-center h-40 border border-dashed border-border rounded-lg">
    <p className="text-muted-foreground text-sm">{name} — not yet implemented</p>
  </div>
);

export const LazyRevenueChart = dynamic(
  async () => ({ default: () => <NotImplemented name="RevenueChart" /> }),
  { ssr: false }
);

export const LazyPolicyDistributionChart = dynamic(
  async () => ({ default: () => <NotImplemented name="PolicyDistributionChart" /> }),
  { ssr: false }
);

export const LazyCustomerForm = dynamic(
  async () => ({ default: () => <NotImplemented name="CustomerForm" /> }),
  { ssr: false }
);

export const LazyPDFViewer = dynamic(
  async () => ({ default: () => <NotImplemented name="PDFViewer" /> }),
  { ssr: false }
);

export const LazyImageEditor = dynamic(
  async () => ({ default: () => <NotImplemented name="ImageEditor" /> }),
  { ssr: false }
);

export const LazyDataTable = dynamic(
  async () => ({ default: () => <NotImplemented name="DataTable" /> }),
  { ssr: false }
);

export const LazyRichTextEditor = dynamic(
  async () => ({ default: () => <NotImplemented name="RichTextEditor" /> }),
  { ssr: false }
);

// ── Export map ────────────────────────────────────────────────────

export const lazyComponents = {
  BusinessCasesPage: LazyBusinessCasesPage,
  ClaimsPage: LazyClaimsPage,
  CustomersPage: LazyCustomersPage,
  PoliciesPage: LazyPoliciesPage,
  IntakePage: LazyIntakePage,
  RevenueChart: LazyRevenueChart,
  PolicyDistributionChart: LazyPolicyDistributionChart,
  ProductForm: LazyProductForm,
  CustomerForm: LazyCustomerForm,
  PDFViewer: LazyPDFViewer,
  ImageEditor: LazyImageEditor,
  DataTable: LazyDataTable,
  RichTextEditor: LazyRichTextEditor,
  Calendar: LazyCalendar,
};

export default lazyComponents;
