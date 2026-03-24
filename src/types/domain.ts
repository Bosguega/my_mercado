export interface SessionUser {
  id: string;
  email?: string | null;
  [key: string]: any; // TODO: type
}

export interface ReceiptItem {
  id?: string;
  name: string;
  normalized_key?: string;
  normalized_name?: string;
  category?: string;
  qty?: string | number;
  quantity?: string | number;
  unit?: string;
  unitPrice?: string | number;
  price?: string | number;
  total?: string | number;
  [key: string]: any; // TODO: type
}

export interface Receipt {
  id: string;
  establishment: string;
  date: string;
  items: ReceiptItem[];
  created_at?: string;
  [key: string]: any; // TODO: type
}

export interface DictionaryEntry {
  key: string;
  normalized_name: string;
  category?: string;
  user_id?: string;
  created_at?: string;
  [key: string]: any; // TODO: type
}

export type DictionaryMap = Record<
  string,
  {
    normalized_name?: string;
    category?: string;
    [key: string]: any; // TODO: type
  }
>;
