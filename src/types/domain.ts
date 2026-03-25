export interface SessionUser {
  id: string;
  email?: string | null;
}

export interface ReceiptItem {
  id?: string;
  name: string;
  normalized_key?: string;
  normalized_name?: string;
  category?: string;
  canonical_product_id?: string;
  qty?: string | number;
  quantity?: string | number;
  unit?: string;
  unitPrice?: string | number;
  price?: string | number;
  total?: string | number;
  [key: string]: unknown;
}

export interface Receipt {
  id: string;
  establishment: string;
  date: string;
  items: ReceiptItem[];
  created_at?: string;
  [key: string]: unknown;
}

export interface DictionaryEntry {
  key: string;
  normalized_name: string;
  category?: string;
  user_id?: string;
  created_at?: string;
  [key: string]: unknown;
}

export type DictionaryMap = Record<
  string,
  {
    normalized_name?: string;
    category?: string;
    canonical_product_id?: string;
    [key: string]: unknown;
  }
>;

export interface CanonicalProduct {
  id: string;
  slug: string;
  name: string;
  category?: string;
  brand?: string;
  user_id?: string;
  merge_count?: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}
