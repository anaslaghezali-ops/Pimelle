// ── Produits ─────────────────────────────────────────────────────────────────

async function fetchFeaturedProducts(limit = 8) {
  const { data, error } = await supabase
    .from('products')
    .select(`*, product_images(image_url, is_cover), categories(name)`)
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error(error); return []; }
  return data;
}

async function fetchProducts({ categoryId, search, sort, page = 1, limit = 12 } = {}) {
  let query = supabase
    .from('products')
    .select(`*, product_images(image_url, is_cover), categories(name)`, { count: 'exact' })
    .eq('is_active', true);

  if (categoryId) query = query.eq('category_id', categoryId);
  if (search) query = query.ilike('name', `%${search}%`);

  switch (sort) {
    case 'price_asc':  query = query.order('price', { ascending: true });  break;
    case 'price_desc': query = query.order('price', { ascending: false }); break;
    case 'newest':     query = query.order('created_at', { ascending: false }); break;
    default:           query = query.order('created_at', { ascending: false });
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) { console.error(error); return { products: [], total: 0 }; }
  return { products: data, total: count };
}

async function fetchProductById(id) {
  const { data, error } = await supabase
    .from('products')
    .select(`*, product_images(id, image_url, is_cover, sort_order), categories(id, name)`)
    .eq('id', id)
    .single();
  if (error) { console.error(error); return null; }
  return data;
}

async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');
  if (error) { console.error(error); return []; }
  return data;
}

function getCoverImage(product) {
  const images = product.product_images || [];
  const cover = images.find(i => i.is_cover) || images[0];
  return cover ? getImageUrl(cover.image_url) : getImageUrl(null);
}

function renderProductCard(product) {
  const img = getCoverImage(product);
  const cat = product.categories?.name || '';
  return `
    <article class="product-card" data-id="${product.id}">
      <a href="produit.html?id=${product.id}" class="product-card__img-wrap">
        <img src="${img}" alt="${product.name}" loading="lazy" class="product-card__img">
        <div class="product-card__overlay">
          <span class="btn btn--ghost btn--sm">Voir le produit</span>
        </div>
      </a>
      <div class="product-card__body">
        <p class="product-card__cat">${cat}</p>
        <h3 class="product-card__name">
          <a href="produit.html?id=${product.id}">${product.name}</a>
        </h3>
        <p class="product-card__price">${formatPrice(product.price)}</p>
      </div>
    </article>`;
}
