import { supabase, getFriendlyError } from '../lib/supabase';
import type { Product } from '../types/database';

export async function fetchProducts(activeOnly = true): Promise<Product[]> {
  let query = supabase.from('products').select('*').order('category').order('name');
  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw new Error(getFriendlyError(error));
  return (data || []) as Product[];
}

export async function fetchProductsByCategory(): Promise<Record<string, Product[]>> {
  const products = await fetchProducts();
  return products.reduce(
    (acc, product) => {
      if (!acc[product.category]) acc[product.category] = [];
      acc[product.category].push(product);
      return acc;
    },
    {} as Record<string, Product[]>
  );
}

export async function createProduct(input: {
  name: string;
  category: string;
  unit: string;
}): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: input.name.trim(),
      category: input.category,
      unit: input.unit,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw new Error(getFriendlyError(error));

  await supabase.from('inventory').insert({
    product_id: data.id,
    quantity: 0,
    unit: input.unit,
    low_stock_threshold: 10,
  });

  return data as Product;
}

export async function updateProduct(
  id: string,
  updates: Partial<Pick<Product, 'name' | 'category' | 'unit' | 'is_active'>>
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(getFriendlyError(error));
  return data as Product;
}

export async function searchProducts(query: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
    .order('name')
    .limit(20);

  if (error) throw new Error(getFriendlyError(error));
  return (data || []) as Product[];
}

export const SEED_PRODUCTS = [
  { name: 'Blade', category: 'Beef Cuts', unit: 'kg' },
  { name: 'Brisket', category: 'Beef Cuts', unit: 'kg' },
  { name: 'Chuck', category: 'Beef Cuts', unit: 'kg' },
  { name: 'Rump', category: 'Beef Cuts', unit: 'kg' },
  { name: 'Sirloin', category: 'Beef Cuts', unit: 'kg' },
  { name: 'Fillet', category: 'Beef Cuts', unit: 'kg' },
  { name: 'Pork Spare Ribs', category: 'Pork Cuts', unit: 'kg' },
  { name: 'Pork Chops', category: 'Pork Cuts', unit: 'kg' },
  { name: 'Pork Head', category: 'Pork Cuts', unit: 'kg' },
  { name: 'Pork Trotters', category: 'Pork Cuts', unit: 'kg' },
  { name: 'Pork Rashers', category: 'Pork Cuts', unit: 'kg' },
  { name: 'Beef Quarter', category: 'Quarters', unit: 'kg' },
  { name: 'Pork Quarter', category: 'Quarters', unit: 'kg' },
  { name: 'Sausages', category: 'Processed Products', unit: 'kg' },
  { name: 'Minced Meat', category: 'Processed Products', unit: 'kg' },
];
