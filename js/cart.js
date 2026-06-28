// ── Gestion du panier (localStorage) ────────────────────────────────────────

const Cart = (() => {
  const KEY = 'lingerieCart';

  function getAll() {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  }

  function save(cart) {
    localStorage.setItem(KEY, JSON.stringify(cart));
    updateCartBadge();
  }

  function addItem(product, size, color, quantity = 1) {
    const cart = getAll();
    const id = `${product.id}_${size}_${color}`;
    const idx = cart.findIndex(i => i.id === id);
    if (idx >= 0) {
      cart[idx].quantity += quantity;
    } else {
      cart.push({
        id,
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.cover_image || null,
        size,
        color,
        quantity
      });
    }
    save(cart);
    return cart;
  }

  function updateQuantity(id, quantity) {
    const cart = getAll();
    const idx = cart.findIndex(i => i.id === id);
    if (idx >= 0) {
      if (quantity <= 0) {
        cart.splice(idx, 1);
      } else {
        cart[idx].quantity = quantity;
      }
    }
    save(cart);
    return cart;
  }

  function removeItem(id) {
    const cart = getAll().filter(i => i.id !== id);
    save(cart);
    return cart;
  }

  function clear() {
    localStorage.removeItem(KEY);
    updateCartBadge();
  }

  function getTotal() {
    return getAll().reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  function getCount() {
    return getAll().reduce((sum, i) => sum + i.quantity, 0);
  }

  return { getAll, addItem, updateQuantity, removeItem, clear, getTotal, getCount };
})();
