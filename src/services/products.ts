import {
  supabase,
  getFriendlyError,
} from '../lib/supabase';

import type { Product } from '../types/database';

export type { Product };

/* =========================================================
   CONSTANTS
========================================================= */

export const PRODUCT_CATEGORIES = [
  'BEEF CUTS',
  'PORK CUTS',
  'QUARTERS',
  'PROCESSED PRODUCTS',
] as const;

export const PRODUCT_UNITS = [
  {
    value: 'kg',
    label: 'Kilogram (kg)',
  },
  {
    value: 'piece',
    label: 'Piece',
  },
  {
    value: 'unit',
    label: 'Unit',
  },
  {
    value: 'litre',
    label: 'Litre (L)',
  },
  {
    value: 'pack',
    label: 'Pack',
  },
] as const;

/* =========================================================
   HELPERS
========================================================= */

function cleanCategory(category: string): string {
  const value = category.trim();

  const match = PRODUCT_CATEGORIES.find(
    (item) => item.toLowerCase() === value.toLowerCase(),
  );

  return match ?? value.toUpperCase();
}

function cleanUnit(unit: string): string {
  return unit.trim().toLowerCase();
}

/* =========================================================
   FETCH PRODUCTS
========================================================= */

export async function fetchProducts(
  activeOnly = true,
): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select('*')
    .order('category', {
      ascending: true,
    })
    .order('name', {
      ascending: true,
    });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(getFriendlyError(error));
  }

  return (data ?? []) as Product[];
}

/* =========================================================
   FETCH ALL PRODUCTS
========================================================= */

export async function fetchAllProducts(): Promise<Product[]> {
  return fetchProducts(false);
}

/* =========================================================
   FETCH PRODUCTS BY CATEGORY
========================================================= */

export async function fetchProductsByCategory(): Promise<
  Record<string, Product[]>
> {
  const products = await fetchProducts(true);

  return products.reduce<Record<string, Product[]>>(
    (groups, product) => {
      const category = cleanCategory(product.category);

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(product);

      return groups;
    },
    {},
  );
}

/* =========================================================
   FETCH SINGLE PRODUCT
========================================================= */

export async function fetchProductById(
  productId: string,
): Promise<Product | null> {
  const id = productId?.trim();

  if (!id) {
    return null;
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(getFriendlyError(error));
  }

  return data as Product | null;
}

/* =========================================================
   CREATE PRODUCT
========================================================= */

export async function createProduct(input: {
  name: string;
  category: string;
  unit: string;
  is_active?: boolean;
}): Promise<Product> {
  const name = input.name.trim();
  const category = cleanCategory(input.category);
  const unit = cleanUnit(input.unit);
  const isActive = input.is_active !== false;

  if (!name) {
    throw new Error('Product name is required.');
  }

  if (!category) {
    throw new Error('Product category is required.');
  }

  if (!unit) {
    throw new Error('Product unit is required.');
  }

  /* Check for duplicate product name */
  const {
    data: existingProduct,
    error: duplicateCheckError,
  } = await supabase
    .from('products')
    .select('id, name')
    .ilike('name', name)
    .maybeSingle();

  if (duplicateCheckError) {
    throw new Error(
      `Unable to check for duplicate products. ${getFriendlyError(
        duplicateCheckError,
      )}`,
    );
  }

  if (existingProduct) {
    throw new Error(
      `A product named "${name}" already exists.`,
    );
  }

  /* Create product */
  const {
    data,
    error,
  } = await supabase
    .from('products')
    .insert({
      name,
      category,
      unit,
      is_active: isActive,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(getFriendlyError(error));
  }

  if (!data?.id) {
    throw new Error(
      'Product was created, but no product ID was returned.',
    );
  }

  /* Create matching inventory record */
  const {
    error: inventoryError,
  } = await supabase
    .from('inventory')
    .insert({
      product_id: data.id,
      quantity: 0,
      unit,
      low_stock_threshold: 10,
      updated_at: new Date().toISOString(),
    });

  if (inventoryError) {
    /* Attempt rollback */
    await supabase
      .from('products')
      .delete()
      .eq('id', data.id);

    throw new Error(
      `Product was created, but its inventory record could not be created. ${getFriendlyError(
        inventoryError,
      )}`,
    );
  }

  return data as Product;
}

/* =========================================================
   UPDATE PRODUCT
========================================================= */

export async function updateProduct(
  id: string,
  updates: Partial<
    Pick<
      Product,
      'name' | 'category' | 'unit' | 'is_active'
    >
  >,
): Promise<Product> {
  const productId = id?.trim();

  if (!productId) {
    throw new Error('Product ID is required.');
  }

  const cleanedUpdates: Record<string, unknown> = {};

  if (typeof updates.name === 'string') {
    const name = updates.name.trim();

    if (!name) {
      throw new Error(
        'Product name cannot be empty.',
      );
    }

    cleanedUpdates.name = name;
  }

  if (typeof updates.category === 'string') {
    const category = cleanCategory(
      updates.category,
    );

    if (!category) {
      throw new Error(
        'Product category cannot be empty.',
      );
    }

    cleanedUpdates.category = category;
  }

  if (typeof updates.unit === 'string') {
    const unit = cleanUnit(updates.unit);

    if (!unit) {
      throw new Error(
        'Product unit cannot be empty.',
      );
    }

    cleanedUpdates.unit = unit;
  }

  if (typeof updates.is_active === 'boolean') {
    cleanedUpdates.is_active =
      updates.is_active;
  }

  if (Object.keys(cleanedUpdates).length === 0) {
    throw new Error(
      'No product changes were provided.',
    );
  }

  /* Update product */
  const {
    data,
    error,
  } = await supabase
    .from('products')
    .update(cleanedUpdates)
    .eq('id', productId)
    .select('*')
    .single();

  if (error) {
    throw new Error(getFriendlyError(error));
  }

  /* Synchronize inventory unit */
  if (typeof updates.unit === 'string') {
    const unit = cleanUnit(updates.unit);

    const {
      error: inventoryError,
    } = await supabase
      .from('inventory')
      .update({
        unit,
        updated_at:
          new Date().toISOString(),
      })
      .eq('product_id', productId);

    if (inventoryError) {
      console.warn(
        'Product updated, but inventory unit could not be synchronized:',
        inventoryError,
      );
    }
  }

  return data as Product;
}

/* =========================================================
   DELETE PRODUCT
========================================================= */

export async function deleteProduct(
  productId: string,
): Promise<void> {
  const id = productId?.trim();

  if (!id) {
    throw new Error('Product ID is required.');
  }

  /* Verify product exists */
  const {
    data: product,
    error: productFetchError,
  } = await supabase
    .from('products')
    .select('id, name')
    .eq('id', id)
    .maybeSingle();

  if (productFetchError) {
    throw new Error(
      `Unable to check product. ${getFriendlyError(
        productFetchError,
      )}`,
    );
  }

  if (!product) {
    throw new Error(
      'Product not found. It may have already been deleted.',
    );
  }

  /* Delete inventory */
  const {
    error: inventoryDeleteError,
  } = await supabase
    .from('inventory')
    .delete()
    .eq('product_id', id);

  if (inventoryDeleteError) {
    throw new Error(
      `Unable to delete the inventory record for "${product.name}". ${getFriendlyError(
        inventoryDeleteError,
      )}`,
    );
  }

  /* Delete product */
  const {
    data: deletedRows,
    error: productDeleteError,
  } = await supabase
    .from('products')
    .delete()
    .eq('id', id)
    .select('id');

  if (productDeleteError) {
    const message =
      productDeleteError.message?.toLowerCase() ??
      '';

    if (
      message.includes('foreign key') ||
      message.includes('violates') ||
      message.includes('referenced')
    ) {
      throw new Error(
        `Product "${product.name}" cannot be permanently deleted because another record is using it. ${getFriendlyError(
          productDeleteError,
        )}`,
      );
    }

    throw new Error(
      `Unable to delete product "${product.name}". ${getFriendlyError(
        productDeleteError,
      )}`,
    );
  }

  if (
    !deletedRows ||
    deletedRows.length === 0
  ) {
    throw new Error(
      'The product was not deleted. Your database Row Level Security (RLS) policy may not allow DELETE operations.',
    );
  }

  /* Verify deletion */
  const {
    data: remainingProduct,
    error: verifyError,
  } = await supabase
    .from('products')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (verifyError) {
    throw new Error(
      `The product deletion was submitted, but it could not be verified. ${getFriendlyError(
        verifyError,
      )}`,
    );
  }

  if (remainingProduct) {
    throw new Error(
      `Product "${product.name}" still exists in the database.`,
    );
  }
}

/* =========================================================
   SEARCH PRODUCTS
========================================================= */

export async function searchProducts(
  query: string,
): Promise<Product[]> {
  const searchTerm =
    query.trim().toLowerCase();

  const products = await fetchProducts(true);

  if (!searchTerm) {
    return products;
  }

  return products.filter(
    (product) => {
      const name =
        product.name?.toLowerCase() ?? '';

      const category =
        product.category?.toLowerCase() ?? '';

      const unit =
        product.unit?.toLowerCase() ?? '';

      return (
        name.includes(searchTerm) ||
        category.includes(searchTerm) ||
        unit.includes(searchTerm)
      );
    },
  );
}

/* =========================================================
   SEED PRODUCTS
========================================================= */

export const SEED_PRODUCTS = [
  {
    name: 'Blade',
    category: 'BEEF CUTS',
    unit: 'kg',
  },
  {
    name: 'Brisket',
    category: 'BEEF CUTS',
    unit: 'kg',
  },
  {
    name: 'Chuck',
    category: 'BEEF CUTS',
    unit: 'kg',
  },
  {
    name: 'Rump',
    category: 'BEEF CUTS',
    unit: 'kg',
  },
  {
    name: 'Sirloin',
    category: 'BEEF CUTS',
    unit: 'kg',
  },
  {
    name: 'Fillet',
    category: 'BEEF CUTS',
    unit: 'kg',
  },
  {
    name: 'Pork Spare Ribs',
    category: 'PORK CUTS',
    unit: 'kg',
  },
  {
    name: 'Pork Chops',
    category: 'PORK CUTS',
    unit: 'kg',
  },
  {
    name: 'Pork Head',
    category: 'PORK CUTS',
    unit: 'kg',
  },
  {
    name: 'Pork Trotters',
    category: 'PORK CUTS',
    unit: 'kg',
  },
  {
    name: 'Pork Rashers',
    category: 'PORK CUTS',
    unit: 'kg',
  },
  {
    name: 'Beef Quarter',
    category: 'QUARTERS',
    unit: 'kg',
  },
  {
    name: 'Pork Quarter',
    category: 'QUARTERS',
    unit: 'kg',
  },
  {
    name: 'Sausages',
    category: 'PROCESSED PRODUCTS',
    unit: 'kg',
  },
  {
    name: 'Minced Meat',
    category: 'PROCESSED PRODUCTS',
    unit: 'kg',
  },
] as const;