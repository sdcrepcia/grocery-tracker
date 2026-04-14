import { neon, NeonQueryFunction } from '@neondatabase/serverless';

let _sql: NeonQueryFunction<false, false> | null = null;

function getDb(): NeonQueryFunction<false, false> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

const sql = new Proxy(function () {} as unknown as NeonQueryFunction<false, false>, {
  apply(_target, _thisArg, args) {
    return (getDb() as any)(...args);
  },
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export default sql;

export interface Receipt {
  id: number;
  order_id: string;
  store: string;
  order_date: string;
  total: number;
  item_count: number;
  created_at: string;
}

export interface LineItem {
  id: number;
  receipt_id: number;
  name: string;
  quantity: number;
  unit: string;
  total_price: number;
  unit_price: number;
}

export interface ReceiptWithItems extends Receipt {
  items: LineItem[];
}
