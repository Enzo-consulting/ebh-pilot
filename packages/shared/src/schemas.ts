import { z } from 'zod';

export const prospectStatusSchema = z.enum([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'WON',
  'LOST',
]);

export const prospectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  company: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  value: z.number().nonnegative(),
  status: prospectStatusSchema,
  createdAt: z.string(),
});

export const createProspectSchema = prospectSchema.pick({
  name: true,
  company: true,
  email: true,
  value: true,
  status: true,
});

// All fields optional for partial updates (PUT).
export const updateProspectSchema = createProspectSchema.partial();

// --- Client module (Ticket #005) ---
// The Prospect table is reused as the Clients store; these schemas describe
// the client-facing shape and validation.
export const clientStatusSchema = z.enum(['PROSPECT', 'ACTIVE', 'INACTIVE']);

const optionalString = z.string().trim().max(255).nullable().optional();

export const clientSchema = z.object({
  id: z.string().uuid(),
  company: z.string().min(1),
  contactName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: optionalString,
  mobile: optionalString,
  website: optionalString,
  address: optionalString,
  postalCode: optionalString,
  city: optionalString,
  country: optionalString,
  vatNumber: optionalString,
  status: clientStatusSchema,
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

// Required on create: company (raison sociale) and contactName.
export const createClientSchema = z.object({
  company: z.string().min(1, 'La société est obligatoire.'),
  contactName: z.string().min(1, 'Le contact est obligatoire.'),
  email: z
    .string()
    .email('Email invalide.')
    .nullable()
    .optional()
    .or(z.literal('')),
  phone: optionalString,
  mobile: optionalString,
  website: optionalString,
  address: optionalString,
  postalCode: optionalString,
  city: optionalString,
  country: optionalString,
  vatNumber: optionalString,
  status: clientStatusSchema.default('PROSPECT'),
  notes: z.string().max(5000).nullable().optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  supplier: z.string().nullable().optional(),
  supplierReference: z.string().nullable().optional(),
  purchasePrice: z.number().nonnegative(),
  transportCost: z.number().nonnegative(),
  preparationCost: z.number().nonnegative(),
  accessoriesCost: z.number().nonnegative(),
  otherCosts: z.number().nonnegative(),
  // Derived fields (computed server-side from the inputs above).
  costPrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  marginAmount: z.number(),
  marginPercent: z.number(),
  createdAt: z.string(),
});

// Client only supplies cost inputs + selling price; derived fields are computed.
export const createProductSchema = z.object({
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  supplier: z.string().nullable().optional(),
  supplierReference: z.string().nullable().optional(),
  purchasePrice: z.number().nonnegative().default(0),
  transportCost: z.number().nonnegative().default(0),
  preparationCost: z.number().nonnegative().default(0),
  accessoriesCost: z.number().nonnegative().default(0),
  otherCosts: z.number().nonnegative().default(0),
  sellingPrice: z.number().nonnegative().default(0),
});

// All fields optional for partial updates (PUT); derived fields recomputed server-side.
export const updateProductSchema = createProductSchema.partial();

/**
 * Single source of truth for product profitability math.
 * Used server-side on create/update so stored values stay consistent.
 */
export function computeProductFinancials(input: {
  purchasePrice: number;
  transportCost: number;
  preparationCost: number;
  accessoriesCost: number;
  otherCosts: number;
  sellingPrice: number;
}) {
  const costPrice =
    input.purchasePrice +
    input.transportCost +
    input.preparationCost +
    input.accessoriesCost +
    input.otherCosts;
  const marginAmount = input.sellingPrice - costPrice;
  const marginPercent =
    input.sellingPrice > 0 ? (marginAmount / input.sellingPrice) * 100 : 0;
  return {
    costPrice: round2(costPrice),
    marginAmount: round2(marginAmount),
    marginPercent: round2(marginPercent),
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export const profitabilityKpisSchema = z.object({
  productsCount: z.number().int(),
  totalCost: z.number(),
  totalRevenue: z.number(),
  totalMargin: z.number(),
  averageMarginPercent: z.number(),
});

export const dashboardMetricsSchema = z.object({
  businessScore: z.number().min(0).max(100),
  revenue: z.number(),
  margin: z.number(),
  prospectsCount: z.number().int(),
  productsCount: z.number().int(),
  aiActions: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      impact: z.enum(['low', 'medium', 'high']),
    }),
  ),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signUpSchema = signInSchema.extend({
  name: z.string().min(1),
});


// --- AI Import module (Ticket #009.2) ---

/** Valid lifecycle statuses for an import job. */
export const importJobStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'SUCCESS',
  'FAILED',
]);

/** Full import job shape returned by the API. */
export const importJobSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  status: importJobStatusSchema,
  userId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Payload required to create a new import job (client → POST /api/imports). */
export const createImportJobSchema = z.object({
  url: z
    .string()
    .min(1, "L'URL est obligatoire.")
    .regex(/^https?:\/\//, "L'URL doit commencer par http:// ou https://"),
});
