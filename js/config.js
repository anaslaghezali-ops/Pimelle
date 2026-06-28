// ╔══════════════════════════════════════════╗
// ║  CONFIGURATION SUPABASE — À RENSEIGNER   ║
// ╚══════════════════════════════════════════╝
const SUPABASE_URL = 'VOTRE_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'VOTRE_SUPABASE_ANON_KEY';

// Client Supabase (chargé via CDN dans chaque HTML)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Utilitaires globaux ──────────────────────────────────────────────────────

function getImageUrl(path) {
  if (!path) return 'https://placehold.co/600x800/F2D7D9/8B6565?text=Lingerie';
  if (path.startsWith('http')) return path;
  const { data } = supabase.storage.from('products').getPublicUrl(path);
  return data.publicUrl;
}

function formatPrice(price) {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2
  }).format(price);
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

// Mise à jour du compteur panier dans la nav
function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem('lingerieCart') || '[]');
  const total = cart.reduce((sum, i) => sum + i.quantity, 0);
  document.querySelectorAll('.cart-badge').forEach(el => {
    el.textContent = total;
    el.style.display = total > 0 ? 'flex' : 'none';
  });
}

document.addEventListener('DOMContentLoaded', updateCartBadge);
