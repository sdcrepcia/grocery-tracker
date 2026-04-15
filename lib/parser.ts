// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseMod = require('pdf-parse');
const pdfParse = pdfParseMod.default ?? pdfParseMod;

export interface ParsedReceipt {
  orderId: string;
  store: string;
  orderDate: Date;
  itemCount: number;
  total: number;
  items: ParsedItem[];
}

export interface ParsedItem {
  name: string;
  quantity: number;
  unit: string;
  totalPrice: number;
}

// Matches lines like: "Beef Strip Steak 0.55lb $10.44"
// or:                 "Chobani Non-Fat Greek Yogurt Plain 1ct $1.79"
const LINE_ITEM_RE = /^(.+?)\s+([\d.]+)(lb|ct)\s+\$(\d+\.\d{2})$/;

// Matches: "4/4/2026 10:07AM"
const DATE_RE = /^(\d{1,2}\/\d{1,2}\/\d{4})\s+\d{1,2}:\d{2}[AP]M$/;

// Matches: "Order #4244594"
const ORDER_RE = /^Order #(\d+)$/;

// Matches: "Total: $128.66"
const TOTAL_RE = /^Total:\s+\$(\d+\.\d{2})$/;

export async function parseReceiptPdf(buffer: Buffer): Promise<ParsedReceipt> {
  const data = await pdfParse(buffer);
  const lines = data.text
    .split('\n')
    .map((l: string) => l.trim())
    .filter(Boolean);

  let orderId = '';
  let store = '';
  let orderDate: Date | null = null;
  let total = 0;
  let itemCount = 0;
  const items: ParsedItem[] = [];

  for (const line of lines) {
    // Store name is the first non-empty line
    if (!store && line.startsWith("Heinen's")) {
      store = line;
      continue;
    }

    const dateMatch = line.match(DATE_RE);
    if (dateMatch && !orderDate) {
      orderDate = new Date(dateMatch[1]);
      continue;
    }

    const orderMatch = line.match(ORDER_RE);
    if (orderMatch) {
      orderId = orderMatch[1];
      continue;
    }

    const totalMatch = line.match(TOTAL_RE);
    if (totalMatch) {
      total = parseFloat(totalMatch[1]);
      continue;
    }

    // Skip summary lines
    if (line.startsWith('Order Summary')) {
      const countMatch = line.match(/(\d+) line items/);
      if (countMatch) itemCount = parseInt(countMatch[1], 10);
      continue;
    }

    const itemMatch = line.match(LINE_ITEM_RE);
    if (itemMatch) {
      items.push({
        name: itemMatch[1].trim(),
        quantity: parseFloat(itemMatch[2]),
        unit: itemMatch[3],
        totalPrice: parseFloat(itemMatch[4]),
      });
    }
  }

  if (!orderId || !orderDate || !store) {
    throw new Error(`Failed to parse receipt. Extracted: store=${store}, orderId=${orderId}, date=${orderDate}`);
  }

  return {
    orderId,
    store,
    orderDate,
    itemCount: itemCount || items.length,
    total,
    items,
  };
}
