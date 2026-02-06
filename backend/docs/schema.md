# Esquema de Base de Datos

## Catalogo

### users
- `id` (PK)
- `email` (unique)
- `first_name`
- `last_name`
- `password_hash`
- `google_id`
- `avatar_url`
- `email_verified_at`
- `role`
- `is_active`
- `created_at`, `updated_at`

### admin_2fa_challenges
- `id` (PK)
- `user_id` (unique, FK -> users.id)
- `code_hash`
- `expires_at`
- `attempts`
- `locked_until`
- `created_at`, `updated_at`

### email_verifications
- `id` (PK)
- `user_id` (FK -> users.id)
- `code_hash`
- `expires_at`
- `created_at`

### user_addresses
- `id` (PK)
- `user_id` (unique, FK -> users.id)
- `receiver_name`
- `phone`
- `address_line1`
- `address_line2`
- `country`
- `city`
- `district`
- `postal_code`
- `reference`
- `created_at`, `updated_at`

### carts
- `id` (PK)
- `user_id` (unique, FK -> users.id)
- `created_at`, `updated_at`

### cart_items
- `id` (PK)
- `cart_id` (FK -> carts.id)
- `product_variant_id` (FK -> product_variants.id)
- `quantity`
- `created_at`, `updated_at`

### orders
- `id` (PK)
- `user_id` (FK -> users.id)
- `order_status`
- `payment_status`
- `subtotal_cents`
- `shipping_cost_cents`
- `total_cents`
- `discount_code`
- `discount_percentage`
- `discount_amount_cents`
- `stripe_session_id`
- `stripe_payment_intent_id`
- `payment_email_sent_at`
- `shipped_email_sent_at`
- `delivered_email_sent_at`
- `created_at`, `updated_at`

### order_items
- `id` (PK)
- `order_id` (FK -> orders.id)
- `product_variant_id` (FK -> product_variants.id)
- `sku`
- `product_name`
- `variant_name`
- `price_cents`
- `quantity`
- `created_at`, `updated_at`

### discount_codes
- `id` (PK)
- `code` (unique)
- `percentage`
- `min_subtotal_cents`
- `max_uses`
- `used_count`
- `is_active`
- `starts_at`
- `expires_at`
- `created_at`, `updated_at`

### discount_redemptions
- `id` (PK)
- `discount_code_id` (FK -> discount_codes.id)
- `order_id` (FK -> orders.id)
- `user_id` (FK -> users.id)
- `created_at`

### categories
- `id` (PK)
- `name`
- `slug` (unique)
- `description`
- `is_active`
- `created_at`, `updated_at`

### products
- `id` (PK)
- `category_id` (FK -> categories.id)
- `name`
- `slug` (unique)
- `description`
- `is_active`
- `created_at`, `updated_at`

### product_variants
- `id` (PK)
- `product_id` (FK -> products.id)
- `sku` (unique)
- `variant_name`
- `price_cents`
- `weight_grams`
- `size_label`
- `created_at`, `updated_at`

### inventory
- `id` (PK)
- `product_variant_id` (FK -> product_variants.id)
- `stock`
- `reserved`
- `updated_at`
