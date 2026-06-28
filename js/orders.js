// ── Commandes ─────────────────────────────────────────────────────────────────

async function createOrder(customerData) {
  const cart = Cart.getAll();
  if (!cart.length) return { error: 'Panier vide' };

  const total = Cart.getTotal();

  // Créer la commande
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_first_name: customerData.firstName,
      customer_last_name: customerData.lastName,
      customer_email: customerData.email,
      customer_phone: customerData.phone,
      customer_address: customerData.address,
      customer_city: customerData.city,
      customer_comment: customerData.comment || null,
      total_amount: total,
      status: 'nouvelle'
    })
    .select()
    .single();

  if (orderError) return { error: orderError.message };

  // Créer les lignes de commande
  const items = cart.map(item => ({
    order_id: order.id,
    product_id: item.productId,
    product_name: item.name,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    unit_price: item.price,
    total_price: item.price * item.quantity
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(items);
  if (itemsError) return { error: itemsError.message };

  Cart.clear();
  return { order };
}

async function fetchOrders({ search, status, page = 1, limit = 20 } = {}) {
  let query = supabase
    .from('orders')
    .select('*, order_items(*, products(name))', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (search) {
    query = query.or(
      `customer_email.ilike.%${search}%,customer_last_name.ilike.%${search}%,customer_phone.ilike.%${search}%`
    );
  }

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) { console.error(error); return { orders: [], total: 0 }; }
  return { orders: data, total: count };
}

async function fetchOrderById(id) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

async function updateOrderStatus(id, status) {
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  return !error;
}

const STATUS_LABELS = {
  nouvelle:     { label: 'Nouvelle',     color: '#6C8EBF' },
  confirmee:    { label: 'Confirmée',    color: '#82B366' },
  preparation:  { label: 'En préparation', color: '#D6B656' },
  expediee:     { label: 'Expédiée',     color: '#9673A6' },
  livree:       { label: 'Livrée',       color: '#3D8B37' },
  annulee:      { label: 'Annulée',      color: '#B85450' }
};

function statusBadge(status) {
  const s = STATUS_LABELS[status] || { label: status, color: '#999' };
  return `<span class="status-badge" style="background:${s.color}20;color:${s.color};border-color:${s.color}40">${s.label}</span>`;
}
