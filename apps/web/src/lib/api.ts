import type {
    DashboardMetrics,
    Prospect,
    Product,
    CreateProduct,
    UpdateProduct,
    CreateProspect,
    Client,
    CreateClient,
    UpdateClient,
    ProfitabilityKpis,
} from '@ebh/shared';
import { supabase } from './supabase';

// Single source of truth for the API base URL.
// Set VITE_API_URL in your .env.local (see .env.example).
export const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

async function authHeaders(): Promise<Record<string, string>> {
    if (!supabase) return {};
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = await authHeaders();
    const res = await fetch(`${BASE}${path}`, {
          ...init,
          headers: {
                  'Content-Type': 'application/json',
                  ...headers,
                  ...(init?.headers ?? {}),
          },
    });
    if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

export interface HealthResponse {
    status: 'ok' | 'error';
    database: 'connected' | 'disconnected';
    timestamp: string;
}

export interface ProfitabilityResponse {
    products: Product[];
    kpis: ProfitabilityKpis;
}

export const api = {
    /** Non-authenticated health check — safe to call before login. */
    health: () =>
          fetch(`${BASE}/api/health`)
        .then((r) => r.json() as Promise<HealthResponse>)
        .catch((): HealthResponse => ({
                  status: 'error',
                  database: 'disconnected',
                  timestamp: new Date().toISOString(),
        })),

    dashboard: () => request<DashboardMetrics>('/api/dashboard'),
    prospects: () => request<Prospect[]>('/api/prospects'),
    createProspect: (input: CreateProspect) =>
          request<Prospect>('/api/prospects', {
                  method: 'POST',
                  body: JSON.stringify(input),
          }),
    products: () => request<Product[]>('/api/products'),
    createProduct: (input: CreateProduct) =>
          request<Product>('/api/products', {
                  method: 'POST',
                  body: JSON.stringify(input),
          }),
    updateProduct: (id: string, input: UpdateProduct) =>
          request<Product>(`/api/products/${id}`, {
                  method: 'PUT',
                  body: JSON.stringify(input),
          }),
    profitability: () => request<ProfitabilityResponse>('/api/profitability'),
    clients: () => request<Client[]>('/api/clients'),
    client: (id: string) => request<Client>(`/api/clients/${id}`),
    createClient: (input: CreateClient) =>
          request<Client>('/api/clients', {
                  method: 'POST',
                  body: JSON.stringify(input),
          }),
    updateClient: (id: string, input: UpdateClient) =>
          request<Client>(`/api/clients/${id}`, {
                  method: 'PUT',
                  body: JSON.stringify(input),
          }),
    deleteClient: (id: string) =>
          request<void>(`/api/clients/${id}`, { method: 'DELETE' }),
};
