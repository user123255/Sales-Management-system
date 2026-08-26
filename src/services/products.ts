

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
    (item) =>
      item.toLowerCase() === value.toLowerCase(),
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
    throw new Error(
      getFriendlyError(error),
    );
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
  const products =
    await fetchProducts(true);

  return products.reduce<
    Record<string, Product[]>
  >(
    (groups, product) => {
      const category =
        cleanCategory(
          product.category,
        );

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

  const {
    data,
    error,
  } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(
      getFriendlyError(error),
    );
  }

  return data as Product | null;
}

/* =========================================================
   CREATE PRODUCT
========================================================= */

/*
 * IMPORTANT:
 *
 * Creating a product does NOT create an inventory
 * record with quantity 0.
 *
 * The product exists in the products table only.
 *
 * Inventory is created when stock is actually added.
 */

export async function createProduct(input: {
  name: string;
  category: string;
  unit: string;
  is_active?: boolean;
}): Promise<Product> {
  const name =
    input.name.trim();

  const category =
    cleanCategory(
      input.category,
    );

  const unit =
    cleanUnit(
      input.unit,
    );

  const isActive =
    input.is_active !== false;

  if (!name) {
    throw new Error(
      'Product name is required.',
    );
  }

  if (!category) {
    throw new Error(
      'Product category is required.',
    );
  }

  if (!unit) {
    throw new Error(
      'Product unit is required.',
    );
  }

  /* -------------------------------------------------------
     CHECK DUPLICATE PRODUCT
  ------------------------------------------------------- */

  const {
    data: existingProducts,
    error:
      duplicateCheckError,
  } = await supabase
    .from('products')
    .select('id, name')
    .ilike('name', name);

  if (duplicateCheckError) {
    throw new Error(
      `Unable to check for duplicate products. ${getFriendlyError(
        duplicateCheckError,
      )}`,
    );
  }

  if (
    existingProducts &&
    existingProducts.length > 0
  ) {
    throw new Error(
      `A product named "${name}" already exists.`,
    );
  }

  /* -------------------------------------------------------
     CREATE PRODUCT ONLY
  ------------------------------------------------------- */

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
    throw new Error(
      getFriendlyError(error),
    );
  }

  if (!data?.id) {
    throw new Error(
      'Product was created, but no product ID was returned.',
    );
  }

  /*
   * DO NOT create inventory here.
   *
   * This prevents new products from automatically
   * appearing as "0 kg" inventory.
   */

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
      | 'name'
      | 'category'
      | 'unit'
      | 'is_active'
    >
  >,
): Promise<Product> {
  const productId =
    id?.trim();

  if (!productId) {
    throw new Error(
      'Product ID is required.',
    );
  }

  const cleanedUpdates: Record<
    string,
    unknown
  > = {};

  /* -------------------------------------------------------
     NAME
  ------------------------------------------------------- */

  if (
    typeof updates.name ===
    'string'
  ) {
    const name =
      updates.name.trim();

    if (!name) {
      throw new Error(
        'Product name cannot be empty.',
      );
    }

    /*
     * Check whether another product
     * already has this name.
     */
    const {
      data: duplicates,
      error:
        duplicateError,
    } = await supabase
      .from('products')
      .select('id, name')
      .ilike('name', name)
      .neq('id', productId);

    if (duplicateError) {
      throw new Error(
        `Unable to check product name. ${getFriendlyError(
          duplicateError,
        )}`,
      );
    }

    if (
      duplicates &&
      duplicates.length > 0
    ) {
      throw new Error(
        `A product named "${name}" already exists.`,
      );
    }

    cleanedUpdates.name =
      name;
  }

  /* -------------------------------------------------------
     CATEGORY
  ------------------------------------------------------- */

  if (
    typeof updates.category ===
    'string'
  ) {
    const category =
      cleanCategory(
        updates.category,
      );

    if (!category) {
      throw new Error(
        'Product category cannot be empty.',
      );
    }

    cleanedUpdates.category =
      category;
  }

  /* -------------------------------------------------------
     UNIT
  ------------------------------------------------------- */

  if (
    typeof updates.unit ===
    'string'
  ) {
    const unit =
      cleanUnit(
        updates.unit,
      );

    if (!unit) {
      throw new Error(
        'Product unit cannot be empty.',
      );
    }

    cleanedUpdates.unit =
      unit;
  }

  /* -------------------------------------------------------
     ACTIVE STATUS
  ------------------------------------------------------- */

  if (
    typeof updates.is_active ===
    'boolean'
  ) {
    cleanedUpdates.is_active =
      updates.is_active;
  }

  if (
    Object.keys(
      cleanedUpdates,
    ).length === 0
  ) {
    throw new Error(
      'No product changes were provided.',
    );
  }

  /* -------------------------------------------------------
     UPDATE PRODUCT
  ------------------------------------------------------- */

  const {
    data,
    error,
  } = await supabase
    .from('products')
    .update(
      cleanedUpdates,
    )
    .eq('id', productId)
    .select('*')
    .single();

  if (error) {
    throw new Error(
      getFriendlyError(error),
    );
  }

  /* -------------------------------------------------------
     SYNCHRONIZE EXISTING INVENTORY UNIT
  ------------------------------------------------------- */

  if (
    typeof updates.unit ===
    'string'
  ) {
    const unit =
      cleanUnit(
        updates.unit,
      );

    const {
      error:
        inventoryError,
    } = await supabase
      .from('inventory')
      .update({
        unit,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'product_id',
        productId,
      );

    /*
     * Inventory may not exist.
     * That is perfectly valid.
     */
    if (inventoryError) {
      console.warn(
        'Product updated, but existing inventory unit could not be synchronized:',
        inventoryError,
      );
    }
  }

  return data as Product;
}

/* =========================================================
   DELETE PRODUCT
========================================================= */

/*
 * PERMANENT DELETE FLOW
 *
 * 1. Verify product exists.
 * 2. Remove product reference from historical order_items.
 * 3. Delete inventory records.
 * 4. Delete the product.
 * 5. Verify the product no longer exists.
 *
 * Historical orders are NOT deleted.
 * Their product_id becomes NULL while their
 * stored product information remains available.
 */

export async function deleteProduct(
  productId: string,
): Promise<void> {
  const id =
    productId?.trim();

  if (!id) {
    throw new Error(
      'Product ID is required.',
    );
  }

  /* -------------------------------------------------------
     VERIFY PRODUCT
  ------------------------------------------------------- */

  const {
    data: product,
    error:
      productFetchError,
  } = await supabase
    .from('products')
    .select(
      'id, name, category, unit',
    )
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

  /* -------------------------------------------------------
     UNLINK HISTORICAL ORDER ITEMS
  ------------------------------------------------------- */

  /*
   * Do NOT delete order_items.
   *
   * Historical orders must remain.
   *
   * product_id is made NULL so the product can
   * be permanently removed from products.
   */

  const {
    error:
      orderItemsError,
  } = await supabase
    .from('order_items')
    .update({
      product_id: null,
    })
    .eq(
      'product_id',
      id,
    );

  if (orderItemsError) {
    const message =
      orderItemsError.message
        ?.toLowerCase() ??
      '';

    /*
     * If the table/column is not accessible
     * because of RLS, give a clear message.
     */
    if (
      message.includes(
        'row-level security',
      ) ||
      message.includes(
        'permission',
      ) ||
      message.includes(
        'policy',
      )
    ) {
      throw new Error(
        `The product "${product.name}" could not be permanently deleted because the database does not allow updating its historical order references. Check the order_items UPDATE RLS policy.`,
      );
    }

    throw new Error(
      `Unable to unlink historical orders for "${product.name}". ${getFriendlyError(
        orderItemsError,
      )}`,
    );
  }

  /* -------------------------------------------------------
     DELETE INVENTORY
  ------------------------------------------------------- */

  const {
    error:
      inventoryDeleteError,
  } = await supabase
    .from('inventory')
    .delete()
    .eq(
      'product_id',
      id,
    );

  if (inventoryDeleteError) {
    throw new Error(
      `Unable to delete inventory for "${product.name}". ${getFriendlyError(
        inventoryDeleteError,
      )}`,
    );
  }

  /* -------------------------------------------------------
     DELETE PRODUCT
  ------------------------------------------------------- */

  const {
    data: deletedRows,
    error:
      productDeleteError,
  } = await supabase
    .from('products')
    .delete()
    .eq(
      'id',
      id,
    )
    .select('id');

  if (productDeleteError) {
    const message =
      productDeleteError.message
        ?.toLowerCase() ??
      '';

    if (
      message.includes(
        'foreign key',
      ) ||
      message.includes(
        'violates',
      ) ||
      message.includes(
        'referenced',
      )
    ) {
      throw new Error(
        `Product "${product.name}" is still referenced by another database record. The historical order reference should be removed before deleting the product. ${getFriendlyError(
          productDeleteError,
        )}`,
      );
    }

    if (
      message.includes(
        'row-level security',
      ) ||
      message.includes(
        'permission',
      ) ||
      message.includes(
        'policy',
      )
    ) {
      throw new Error(
        `The product "${product.name}" could not be permanently deleted because your Supabase DELETE policy does not allow deleting products.`,
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

  /* -------------------------------------------------------
     VERIFY PRODUCT IS GONE
  ------------------------------------------------------- */

  const {
    data: remainingProduct,
    error:
      verifyError,
  } = await supabase
    .from('products')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (verifyError) {
    throw new Error(
      `The product was deleted, but deletion could not be verified. ${getFriendlyError(
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

  const products =
    await fetchProducts(true);

  if (!searchTerm) {
    return products;
  }

  return products.filter(
    (product) => {
      const name =
        product.name
          ?.toLowerCase() ??
        '';

      const category =
        product.category
          ?.toLowerCase() ??
        '';

      const unit =
        product.unit
          ?.toLowerCase() ??
        '';

      return (
        name.includes(
          searchTerm,
        ) ||
        category.includes(
          searchTerm,
        ) ||
        unit.includes(
          searchTerm,
        )
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

