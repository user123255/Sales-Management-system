import {
  supabase,
  getFriendlyError,
} from '../lib/supabase';

export type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

/* =========================================================
   FETCH PRODUCTS
========================================================= */

export async function fetchProducts(
  activeOnly = true
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
    query = query.eq(
      'is_active',
      true
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }

  return (data || []) as Product[];
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

  return products.reduce(
    (
      acc,
      product
    ) => {
      if (!acc[product.category]) {
        acc[product.category] = [];
      }

      acc[product.category].push(
        product
      );

      return acc;
    },
    {} as Record<
      string,
      Product[]
    >
  );
}

/* =========================================================
   FETCH SINGLE PRODUCT
========================================================= */

export async function fetchProductById(
  productId: string
): Promise<Product | null> {
  if (!productId?.trim()) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from('products')
    .select('*')
    .eq(
      'id',
      productId
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }

  return data as Product | null;
}

/* =========================================================
   CREATE PRODUCT
   Creates the product AND matching inventory record.
========================================================= */

export async function createProduct(
  input: {
    name: string;
    category: string;
    unit: string;
  }
): Promise<Product> {
  const name =
    input.name.trim();

  const category =
    input.category.trim();

  const unit =
    input.unit.trim();

  if (!name) {
    throw new Error(
      'Product name is required.'
    );
  }

  if (!category) {
    throw new Error(
      'Product category is required.'
    );
  }

  if (!unit) {
    throw new Error(
      'Product unit is required.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('products')
    .insert({
      name,
      category,
      unit,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }

  if (!data?.id) {
    throw new Error(
      'Product was created, but no product ID was returned.'
    );
  }

  /*
   * Create the matching inventory row.
   */

  const {
    error: inventoryError,
  } = await supabase
    .from('inventory')
    .insert({
      product_id: data.id,
      quantity: 0,
      unit,
      low_stock_threshold: 10,
    });

  if (inventoryError) {
    /*
     * Roll the product back if inventory creation fails.
     */

    await supabase
      .from('products')
      .delete()
      .eq(
        'id',
        data.id
      );

    throw new Error(
      `Product was created, but its inventory record could not be created. ${getFriendlyError(
        inventoryError
      )}`
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
      | 'name'
      | 'category'
      | 'unit'
      | 'is_active'
    >
  >
): Promise<Product> {
  if (!id?.trim()) {
    throw new Error(
      'Product ID is required.'
    );
  }

  const cleanedUpdates: Record<
    string,
    unknown
  > = {
    ...updates,
    updated_at:
      new Date().toISOString(),
  };

  if (
    typeof updates.name ===
    'string'
  ) {
    const name =
      updates.name.trim();

    if (!name) {
      throw new Error(
        'Product name cannot be empty.'
      );
    }

    cleanedUpdates.name =
      name;
  }

  if (
    typeof updates.category ===
    'string'
  ) {
    const category =
      updates.category.trim();

    if (!category) {
      throw new Error(
        'Product category cannot be empty.'
      );
    }

    cleanedUpdates.category =
      category;
  }

  if (
    typeof updates.unit ===
    'string'
  ) {
    const unit =
      updates.unit.trim();

    if (!unit) {
      throw new Error(
        'Product unit cannot be empty.'
      );
    }

    cleanedUpdates.unit =
      unit;
  }

  const {
    data,
    error,
  } = await supabase
    .from('products')
    .update(
      cleanedUpdates
    )
    .eq(
      'id',
      id
    )
    .select('*')
    .single();

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }

  /*
   * Keep inventory unit synchronized.
   */

  if (
    typeof updates.unit ===
    'string'
  ) {
    const {
      error: inventoryError,
    } = await supabase
      .from('inventory')
      .update({
        unit:
          updates.unit.trim(),
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'product_id',
        id
      );

    if (inventoryError) {
      console.warn(
        'Product updated, but inventory unit could not be synchronized:',
        inventoryError
      );
    }
  }

  return data as Product;
}

/* =========================================================
   DELETE PRODUCT
========================================================= */

/**
 * Permanently deletes:
 *
 * 1. The inventory record belonging to the product
 * 2. The product itself
 *
 * IMPORTANT:
 * The product can only be physically deleted if no other
 * database table is preventing the deletion through a
 * foreign-key relationship and the current user has DELETE
 * permission through RLS.
 */
export async function deleteProduct(
  productId: string
): Promise<void> {
  const id =
    productId?.trim();

  if (!id) {
    throw new Error(
      'Product ID is required.'
    );
  }

  /*
   * -------------------------------------------------------
   * 1. VERIFY PRODUCT EXISTS
   * -------------------------------------------------------
   */

  const {
    data: product,
    error: productFetchError,
  } = await supabase
    .from('products')
    .select(
      'id, name'
    )
    .eq(
      'id',
      id
    )
    .maybeSingle();

  if (productFetchError) {
    throw new Error(
      `Unable to check product. ${getFriendlyError(
        productFetchError
      )}`
    );
  }

  if (!product) {
    throw new Error(
      'Product not found. It may have already been deleted.'
    );
  }

  /*
   * -------------------------------------------------------
   * 2. DELETE INVENTORY RECORD
   * -------------------------------------------------------
   */

  const {
    error: inventoryDeleteError,
  } = await supabase
    .from('inventory')
    .delete()
    .eq(
      'product_id',
      id
    );

  if (inventoryDeleteError) {
    throw new Error(
      `Unable to delete the inventory record for "${product.name}". ${getFriendlyError(
        inventoryDeleteError
      )}`
    );
  }

  /*
   * -------------------------------------------------------
   * 3. DELETE PRODUCT
   * -------------------------------------------------------
   */

  const {
    data: deletedRows,
    error: productDeleteError,
  } = await supabase
    .from('products')
    .delete()
    .eq(
      'id',
      id
    )
    .select('id');

  if (productDeleteError) {
    const friendly =
      getFriendlyError(
        productDeleteError
      );

    /*
     * Give a more useful message for common database
     * dependency problems.
     */

    const message =
      productDeleteError.message
        ?.toLowerCase() || '';

    if (
      message.includes(
        'foreign key'
      ) ||
      message.includes(
        'violates'
      ) ||
      message.includes(
        'referenced'
      )
    ) {
      throw new Error(
        `Product "${product.name}" cannot be permanently deleted because it is being used by another record, such as an order. ${friendly}`
      );
    }

    throw new Error(
      `Unable to delete product "${product.name}". ${friendly}`
    );
  }

  /*
   * -------------------------------------------------------
   * 4. VERIFY THE DELETE
   * -------------------------------------------------------
   *
   * With Supabase/PostgREST, an empty returned array can
   * indicate that the DELETE was blocked by RLS.
   */

  if (
    !deletedRows ||
    deletedRows.length === 0
  ) {
    throw new Error(
      `Product "${product.name}" was not deleted. Your database Row Level Security (RLS) policy may not allow DELETE operations on the products table.`
    );
  }

  /*
   * -------------------------------------------------------
   * 5. FINAL VERIFICATION
   * -------------------------------------------------------
   */

  const {
    data: remainingProduct,
    error: verifyError,
  } = await supabase
    .from('products')
    .select('id')
    .eq(
      'id',
      id
    )
    .maybeSingle();

  if (verifyError) {
    throw new Error(
      `The product deletion was submitted, but it could not be verified. ${getFriendlyError(
        verifyError
      )}`
    );
  }

  if (remainingProduct) {
    throw new Error(
      `Product "${product.name}" still exists in the database. The delete operation was not completed.`
    );
  }
}

/* =========================================================
   SEARCH PRODUCTS
========================================================= */

export async function searchProducts(
  query: string
): Promise<Product[]> {
  const searchTerm =
    query
      .trim()
      .toLowerCase();

  const {
    data,
    error,
  } = await supabase
    .from('products')
    .select('*')
    .order('category', {
      ascending: true,
    })
    .order('name', {
      ascending: true,
    });

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }

  const products =
    (data || []) as Product[];

  if (!searchTerm) {
    return products;
  }

  return products.filter(
    (product) => {
      const name =
        product.name
          ?.toLowerCase() || '';

      const category =
        product.category
          ?.toLowerCase() || '';

      const unit =
        product.unit
          ?.toLowerCase() || '';

      return (
        name.includes(
          searchTerm
        ) ||
        category.includes(
          searchTerm
        ) ||
        unit.includes(
          searchTerm
        )
      );
    }
  );
}

/* =========================================================
   SEED PRODUCTS
========================================================= */

export const SEED_PRODUCTS = [
  {
    name: 'Blade',
    category: 'Beef Cuts',
    unit: 'kg',
  },
  {
    name: 'Brisket',
    category: 'Beef Cuts',
    unit: 'kg',
  },
  {
    name: 'Chuck',
    category: 'Beef Cuts',
    unit: 'kg',
  },
  {
    name: 'Rump',
    category: 'Beef Cuts',
    unit: 'kg',
  },
  {
    name: 'Sirloin',
    category: 'Beef Cuts',
    unit: 'kg',
  },
  {
    name: 'Fillet',
    category: 'Beef Cuts',
    unit: 'kg',
  },
  {
    name: 'Pork Spare Ribs',
    category: 'Pork Cuts',
    unit: 'kg',
  },
  {
    name: 'Pork Chops',
    category: 'Pork Cuts',
    unit: 'kg',
  },
  {
    name: 'Pork Head',
    category: 'Pork Cuts',
    unit: 'kg',
  },
  {
    name: 'Pork Trotters',
    category: 'Pork Cuts',
    unit: 'kg',
  },
  {
    name: 'Pork Rashers',
    category: 'Pork Cuts',
    unit: 'kg',
  },
  {
    name: 'Beef Quarter',
    category: 'Quarters',
    unit: 'kg',
  },
  {
    name: 'Pork Quarter',
    category: 'Quarters',
    unit: 'kg',
  },
  {
    name: 'Sausages',
    category: 'Processed Products',
    unit: 'kg',
  },
  {
    name: 'Minced Meat',
    category: 'Processed Products',
    unit: 'kg',
  },
];