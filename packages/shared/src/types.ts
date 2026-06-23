import type { z } from 'zod';
import type {
    prospectSchema,
    createProspectSchema,
    updateProspectSchema,
    clientSchema,
    createClientSchema,
    updateClientSchema,
    clientStatusSchema,
    productSchema,
    createProductSchema,
    updateProductSchema,
    dashboardMetricsSchema,
    profitabilityKpisSchema,
    prospectStatusSchema,
    signInSchema,
    signUpSchema,
    // Ticket #009.2 — AI Import
    importJobStatusSchema,
    importJobSchema,
    createImportJobSchema,
} from './schemas.js';

export type ProspectStatus = z.infer<typeof prospectStatusSchema>;
export type Prospect = z.infer<typeof prospectSchema>;
export type CreateProspect = z.infer<typeof createProspectSchema>;
export type UpdateProspect = z.infer<typeof updateProspectSchema>;
export type ClientStatus = z.infer<typeof clientStatusSchema>;
export type Client = z.infer<typeof clientSchema>;
export type CreateClient = z.infer<typeof createClientSchema>;
export type UpdateClient = z.infer<typeof updateClientSchema>;
export type Product = z.infer<typeof productSchema>;
export type CreateProduct = z.infer<typeof createProductSchema>;
export type UpdateProduct = z.infer<typeof updateProductSchema>;
export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;
export type ProfitabilityKpis = z.infer<typeof profitabilityKpisSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
// Ticket #009.2 — AI Import
export type ImportJobStatus = z.infer<typeof importJobStatusSchema>;
export type ImportJob = z.infer<typeof importJobSchema>;
export type CreateImportJob = z.infer<typeof createImportJobSchema>;
