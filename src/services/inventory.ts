import { supabase, getFriendlyError } from '../lib/supabase';
import type { InventoryItem } from '../types/database';
import { getInventoryStatus } from '../lib/utils';

/* =========================================================
   FETCH INVENTORY
========================================================= */

export async function fetchInventory(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      product:products(
        id,
        name,
        category,
        unit,
        is_active
      )
    `)
    .order('updated_at', {
      ascending: false,
    });

  if (error) {
    throw new Error(getFriendlyError(error));
  }

  return (data || []) as InventoryItem[];
}

/* =========================================================
   GET SINGLE INVENTORY ITEM
========================================================= */

export async function fetchInventoryByProduct(
  productId: string
): Promise<InventoryItem | null> {
  if (!productId?.trim()) {
    return null;
  }

  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      product:products(
        id,
        name,
        category,
        unit,
        is_active
      )
    `)
    .eq('product_id', productId)
    .maybeSingle();

  if (error) {
    throw new Error(getFriendlyError(error));
  }

  return (data || null) as InventoryItem | null;
}

/* =========================================================
   ADD STOCK
   Used by Butchery
========================================================= */

export async function addInventoryStock(
  productId: string,
  quantity: number,
  unit?: string,
  lowStockThreshold?: number
): Promise<void> {
  if (!productId?.trim()) {
    throw new Error('Product is required.');
  }

  const amount = Number(quantity);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Stock quantity must be greater than zero.');
  }

  const { data: existing, error: findError } =
    await supabase
      .from('inventory')
      .select('id, quantity, unit, low_stock_threshold')
      .eq('product_id', productId)
      .maybeSingle();

  if (findError) {
    throw new Error(getFriendlyError(findError));
  }

  if (existing) {
    const { error } = await supabase
      .from('inventory')
      .update({
        quantity:
          Number(existing.quantity || 0) + amount,

        unit:
          unit?.trim() ||
          existing.unit ||
          'kg',

        low_stock_threshold:
          lowStockThreshold !== undefined
            ? Number(lowStockThreshold)
            : existing.low_stock_threshold,

        updated_at:
          new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) {
      throw new Error(getFriendlyError(error));
    }

    return;
  }

  const { error } = await supabase
    .from('inventory')
    .insert({
      product_id: productId,
      quantity: amount,
      unit: unit?.trim() || 'kg',
      low_stock_threshold:
        lowStockThreshold !== undefined
          ? Number(lowStockThreshold)
          : 5,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(getFriendlyError(error));
  }
}

/* =========================================================
   SET STOCK EXACTLY
========================================================= */

export async function updateInventoryQuantity(
  productId: string,
  quantity: number
): Promise<void> {
  if (!productId?.trim()) {
    throw new Error('Product is required.');
  }

  const amount = Number(quantity);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Stock quantity cannot be negative.');
  }

  const { data: existing, error: findError } =
    await supabase
      .from('inventory')
      .select('id')
      .eq('product_id', productId)
      .maybeSingle();

  if (findError) {
    throw new Error(getFriendlyError(findError));
  }

  if (!existing) {
    const { error } = await supabase
      .from('inventory')
      .insert({
        product_id: productId,
        quantity: amount,
        unit: 'kg',
        low_stock_threshold: 5,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(getFriendlyError(error));
    }

    return;
  }

  const { error } = await supabase
    .from('inventory')
    .update({
      quantity: amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (error) {
    throw new Error(getFriendlyError(error));
  }
}

/* =========================================================
   REMOVE STOCK
========================================================= */

export async function removeInventoryStock(
  productId: string,
  quantity: number
): Promise<void> {
  if (!productId?.trim()) {
    throw new Error('Product is required.');
  }

  const amount = Number(quantity);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(
      'Quantity must be greater than zero.'
    );
  }

  const inventory =
    await fetchInventoryByProduct(productId);

  if (!inventory) {
    throw new Error(
      'Inventory record not found for this product.'
    );
  }

  const current =
    Number(inventory.quantity || 0);

  if (current <= 0) {
    throw new Error(
      'This product has no stock available to remove.'
    );
  }

  if (amount > current) {
    throw new Error(
      `Not enough stock. Only ${current} ${
        inventory.unit || ''
      } available.`
    );
  }

  const newQuantity =
    current - amount;

  const { error } = await supabase
    .from('inventory')
    .update({
      quantity: newQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inventory.id);

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }
}
/* =========================================================
   LOW STOCK THRESHOLD
========================================================= */

export async function updateLowStockThreshold(
  productId: string,
  threshold: number
): Promise<void> {
  if (!productId?.trim()) {
    throw new Error('Product is required.');
  }

  const value = Number(threshold);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      'Low-stock threshold must be zero or greater.'
    );
  }

  const { error } = await supabase
    .from('inventory')
    .update({
      low_stock_threshold: value,
      updated_at: new Date().toISOString(),
    })
    .eq('product_id', productId);

  if (error) {
    throw new Error(getFriendlyError(error));
  }
}

/* =========================================================
   INVENTORY STATUS
========================================================= */

export function getItemStatus(
  item: InventoryItem
) {
  return getInventoryStatus(
    Number(item.quantity || 0),
    Number(item.low_stock_threshold || 0)
  );
}

/* =========================================================
   INVENTORY SUMMARY
========================================================= */

export async function getInventorySummary() {
  const inventory =
    await fetchInventory();

  const totalProducts =
    inventory.length;

  const inStock =
    inventory.filter(
      (item) =>
        Number(item.quantity) >
        Number(item.low_stock_threshold)
    ).length;

  const lowStock =
    inventory.filter((item) => {
      const quantity =
        Number(item.quantity || 0);

      const threshold =
        Number(
          item.low_stock_threshold || 0
        );

      return (
        quantity > 0 &&
        quantity <= threshold
      );
    }).length;

  const outOfStock =
    inventory.filter(
      (item) =>
        Number(item.quantity || 0) <= 0
    ).length;

  const totalQuantity =
    inventory.reduce(
      (sum, item) =>
        sum +
        Number(item.quantity || 0),
      0
    );

  return {
    totalProducts,
    inStock,
    lowStock,
    outOfStock,
    totalQuantity,
  };
}

/* =========================================================
   REALTIME
========================================================= */

export function subscribeToInventory(
  callback: () => void
) {
  const channel = supabase
    .channel(
      `inventory-realtime-${Date.now()}`
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory',
      },
      () => {
        callback();
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
/* =========================================================
   STOCK MOVEMENT COMPATIBILITY API
========================================================= */

export type StockMovementType =
  | 'add'
  | 'remove'
  | 'adjust';

/* =========================================================
   ADD STOCK
========================================================= */

export async function addStock(
  productId: string,
  quantity: number
): Promise<void> {
  await addInventoryStock(
    productId,
    quantity
  );
}

/* =========================================================
   REMOVE STOCK
========================================================= */

export async function removeStock(
  productId: string,
  quantity: number
): Promise<void> {
  await removeInventoryStock(
    productId,
    quantity
  );
}

/* =========================================================
   ADJUST STOCK
========================================================= */

export async function adjustStock(
  productId: string,
  quantity: number
): Promise<void> {
  await updateInventoryQuantity(
    productId,
    quantity
  );
}