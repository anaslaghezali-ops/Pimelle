# Dentelle — Boutique Lingerie E-commerce

Stack : HTML · CSS · JavaScript Vanilla · Supabase

---

## Structure du projet

```
dentelle/
├── index.html               Page d'accueil
├── boutique.html            Catalogue produits
├── produit.html             Fiche produit
├── panier.html              Panier
├── commande.html            Formulaire de commande
├── confirmation.html        Confirmation commande
├── admin-login.html         Connexion admin
├── admin-dashboard.html     Tableau de bord
├── admin-produits.html      Gestion produits (CRUD + images)
├── admin-commandes.html     Gestion commandes
├── css/
│   ├── style.css            Design front-office
│   └── admin.css            Design back-office
├── js/
│   ├── config.js            ← RENSEIGNER les variables ici
│   ├── cart.js              Gestion panier (localStorage)
│   ├── products.js          Requêtes produits/catégories
│   ├── orders.js            Requêtes commandes
│   └── admin.js             Auth + CRUD admin
└── sql/
    └── schema.sql           Schéma Supabase complet
```

---

## Étape 1 — Créer le projet Supabase

1. Aller sur [supabase.com](https://supabase.com) → **New project**
2. Choisir un nom, un mot de passe fort, une région proche (ex: EU West)
3. Attendre la création (~1 min)

---

## Étape 2 — Configurer la base de données

Dans Supabase → **SQL Editor** → **New query** :

1. Copier **tout le contenu** de `sql/schema.sql`
2. Coller et cliquer **Run**

Cela crée automatiquement :
- Toutes les tables (`categories`, `products`, `product_images`, `orders`, `order_items`, `admin_users`)
- Toutes les relations (clés étrangères)
- Toutes les policies RLS
- Les triggers `updated_at`
- Des données d'exemple (6 catégories, 3 produits)

---

## Étape 3 — Créer le bucket Storage

Dans Supabase → **Storage** → **New bucket** :

- Nom : `products`
- Public bucket : **OUI** (cocher)
- Cliquer **Save**

Puis dans **Policies** du bucket, ajouter :

```sql
-- Lecture publique
CREATE POLICY "Public read products"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- Upload authentifié uniquement
CREATE POLICY "Auth upload products"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

-- Delete authentifié uniquement
CREATE POLICY "Auth delete products"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products');
```

---

## Étape 4 — Créer le compte administrateur

Dans Supabase → **Authentication** → **Users** → **Add user** :

- Email : votre email admin
- Password : mot de passe fort
- Cliquer **Create user**

Copier l'**UUID** de l'utilisateur créé.

Puis dans **SQL Editor** :

```sql
INSERT INTO admin_users (id, email, full_name)
VALUES ('UUID-COPIÉ-ICI', 'votre@email.com', 'Votre Nom');
```

---

## Étape 5 — Renseigner les variables

Ouvrir `js/config.js` et remplacer les deux valeurs :

```js
const SUPABASE_URL = 'https://XXXXXX.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

Ces valeurs se trouvent dans Supabase → **Settings** → **API** :
- **Project URL** → `SUPABASE_URL`
- **anon public** key → `SUPABASE_ANON_KEY`

---

## Étape 6 — Déployer sur GitHub Pages

```bash
# Créer un repo GitHub (ex: dentelle-shop)
git init
git add .
git commit -m "Initial commit — Dentelle boutique"
git remote add origin https://github.com/VOTRE_USER/dentelle-shop.git
git push -u origin main
```

Dans GitHub → Settings → Pages :
- Source : **Deploy from branch**
- Branch : `main` / `/ (root)`
- Cliquer **Save**

URL du site : `https://VOTRE_USER.github.io/dentelle-shop/`

---

## Utilisation

### Front-office (clientes)
| Page | URL |
|------|-----|
| Accueil | `index.html` |
| Catalogue | `boutique.html` |
| Fiche produit | `produit.html?id=UUID` |
| Panier | `panier.html` |
| Commande | `commande.html` |
| Confirmation | `confirmation.html` |

### Back-office (admin)
| Page | URL |
|------|-----|
| Connexion | `admin-login.html` |
| Dashboard | `admin-dashboard.html` |
| Produits | `admin-produits.html` |
| Commandes | `admin-commandes.html` |

---

## Statuts de commande

`nouvelle` → `confirmee` → `preparation` → `expediee` → `livree`

(ou `annulee` à tout moment)

---

## Notes techniques

- **Panier** : stocké 100% en `localStorage`, aucun compte client requis
- **Images** : stockées dans Supabase Storage (bucket `products`)
- **Auth** : uniquement pour l'administrateur (Supabase Auth)
- **RLS** : activé sur toutes les tables — les clientes ne peuvent que créer des commandes
- **Compatible** : GitHub Pages, Netlify, tout hébergement statique
