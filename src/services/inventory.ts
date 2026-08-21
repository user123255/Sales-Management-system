import { supabase, getFriendlyError } from '../lib/supabase';
import type { InventoryItem } from '../types/database';
import { getInventoryStatus } from '../lib/utils';

export async function fetchInventory(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select(`
      *,
      product:products(id, name, category, unit, is_active)
    `)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(getFriendlyError(error));
  return (data || []) as InventoryItem[];
}

export async function updateInventoryQuantity(
  productId: string,
  quantity: number
): Promise<void> {
  const { error } = await supabase
    .from('inventory')
    .update({ quantity, updated_at: new Date().toISOString() })
    .eq('product_id', productId);

  if (error) throw new Error(getFriendlyError(error));
}

export async function updateLowStockThreshold(
  productId: string,
  threshold: number
): Promise<void> {
  const { error } = await supabase
    .from('inventory')
    .update({ low_stock_threshold: threshold, updated_at: new Date().toISOString() })
    .eq('product_id', productId);

  if (error) throw new Error(getFriendlyError(error));
}

export function getItemStatus(item: InventoryItem) {
  return getInventoryStatus(item.quantity, item.low_stock_threshold);
}

export function subscribeToInventory(callback: () => void) {
  const channel = supabase
    .channel('inventory-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inventory' },
      () => callback()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
