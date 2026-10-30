import { API_URL } from './config';
import type { ProductInput } from './domain/types';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, options: { method?: string; token?: string | null; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body == null ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError('The server could not be reached.', 0);
  }
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new ApiError(json.error || `Request failed (${response.status})`, response.status);
  }
  return json as T;
}

export function stackSyncBody(products: ProductInput[]) {
  return {
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      note: product.note,
      priceCents: product.priceCents,
      servingsPerContainer: product.servingsPerContainer,
      servingsPerDay: product.servingsPerDay,
      startDate: product.startDate,
      catalogueId: product.catalogueId ?? null,
      ingredients: product.ingredients,
    })),
  };
}
