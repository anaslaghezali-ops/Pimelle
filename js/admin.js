// ── Admin Auth ────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'admin-login.html';
    return false;
  }
  return true;
}

async function adminLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { session: data.session };
}

async function adminLogout() {
  await supabase.auth.signOut();
  window.location.href = 'admin-login.html';
}

// ── Gestion produits admin ────────────────────────────────────────────────────

async function adminCreateProduct(data) {
  const sizes = Array.isArray(data.sizes) ? data.sizes : data.sizes.split(',').map(s => s.trim());
  const colors = Array.isArray(data.colors) ? data.colors : data.colors.split(',').map(s => s.trim());

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      name: data.name,
      description: data.description,
      price: parseFloat(data.price),
      stock: parseInt(data.stock),
      category_id: data.category_id || null,
      sizes: sizes,
      colors: colors,
      is_active: data.is_active !== false,
      is_featured: data.is_featured === true
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { product };
}

async function adminUpdateProduct(id, data) {
  const sizes = Array.isArray(data.sizes) ? data.sizes : data.sizes.split(',').map(s => s.trim());
  const colors = Array.isArray(data.colors) ? data.colors : data.colors.split(',').map(s => s.trim());

  const { error } = await supabase
    .from('products')
    .update({
      name: data.name,
      description: data.description,
      price: parseFloat(data.price),
      stock: parseInt(data.stock),
      category_id: data.category_id || null,
      sizes,
      colors,
      is_active: data.is_active !== false,
      is_featured: data.is_featured === true,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) return { error: error.message };
  return { success: true };
}

async function adminDeleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  return !error;
}

async function uploadProductImage(file, productId, isCover = false) {
  const ext = file.name.split('.').pop();
  const path = `${productId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('products')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: uploadError.message };

  const { error: dbError } = await supabase.from('product_images').insert({
    product_id: productId,
    image_url: path,
    is_cover: isCover,
    sort_order: 0
  });
  if (dbError) return { error: dbError.message };
  return { path };
}

async function deleteProductImage(imageId, imagePath) {
  await supabase.storage.from('products').remove([imagePath]);
  await supabase.from('product_images').delete().eq('id', imageId);
}

async function adminFetchProducts({ search, categoryId, page = 1, limit = 20 } = {}) {
  let query = supabase
    .from('products')
    .select('*, categories(name)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search) query = query.ilike('name', `%${search}%`);
  if (categoryId) query = query.eq('category_id', categoryId);

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) return { products: [], total: 0 };
  return { products: data, total: count };
}

// ── Dashboard stats ───────────────────────────────────────────────────────────

async function fetchDashboardStats() {
  const [ordersRes, productsRes, revenueRes] = await Promise.all([
    supabase.from('orders').select('id, status, total_amount, created_at'),
    supabase.from('products').select('id, stock', { count: 'exact' }),
    supabase.from('orders').select('total_amount').eq('status', 'livree')
  ]);

  const orders = ordersRes.data || [];
  const products = productsRes.data || [];
  const revenue = (revenueRes.data || []).reduce((s, o) => s + Number(o.total_amount), 0);

  return {
    totalOrders: orders.length,
    newOrders: orders.filter(o => o.status === 'nouvelle').length,
    totalProducts: productsRes.count || 0,
    lowStock: products.filter(p => p.stock <= 5).length,
    revenue
  };
}
