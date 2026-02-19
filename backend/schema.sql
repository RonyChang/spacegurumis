-- spacegurumis backend schema additions
-- Product images (Cloudflare R2)

BEGIN;

CREATE TABLE IF NOT EXISTS product_variant_images (
    id BIGSERIAL PRIMARY KEY,
    product_variant_id BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    image_key TEXT NOT NULL UNIQUE,
    public_url TEXT NOT NULL,
    content_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    alt_text TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_variant_images_variant_id_idx
    ON product_variant_images(product_variant_id);

CREATE INDEX IF NOT EXISTS product_variant_images_variant_id_sort_order_idx
    ON product_variant_images(product_variant_id, sort_order, id);

CREATE TABLE IF NOT EXISTS category_images (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    image_key TEXT NOT NULL UNIQUE,
    public_url TEXT NOT NULL,
    content_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    alt_text TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT category_images_category_unique UNIQUE (category_id)
);

CREATE INDEX IF NOT EXISTS category_images_category_id_sort_order_idx
    ON category_images(category_id, sort_order, id);

-- Migration helper:
-- If legacy table product_images exists, migrate only products that have exactly one variant.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'product_images'
    ) THEN
        INSERT INTO product_variant_images (
            product_variant_id,
            image_key,
            public_url,
            content_type,
            byte_size,
            alt_text,
            sort_order,
            created_at,
            updated_at
        )
        SELECT
            only_variant.product_variant_id,
            pi.image_key,
            pi.public_url,
            pi.content_type,
            pi.byte_size,
            pi.alt_text,
            pi.sort_order,
            pi.created_at,
            pi.updated_at
        FROM product_images pi
        JOIN (
            SELECT
                pv.product_id,
                MIN(pv.id) AS product_variant_id
            FROM product_variants pv
            GROUP BY pv.product_id
            HAVING COUNT(*) = 1
        ) only_variant
            ON only_variant.product_id = pi.product_id
        ON CONFLICT (image_key) DO NOTHING;
    END IF;
END $$;

-- Product scope cardinality hardening:
-- Keep one deterministic legacy row per product in product_images and then enforce uniqueness.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'product_images'
    ) THEN
        WITH ranked AS (
            SELECT
                id,
                product_id,
                ROW_NUMBER() OVER (
                    PARTITION BY product_id
                    ORDER BY sort_order ASC, id ASC
                ) AS rn
            FROM product_images
        )
        DELETE FROM product_images pi
        USING ranked r
        WHERE pi.id = r.id
          AND r.rn > 1;

        EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS product_images_product_id_unique_idx ON product_images(product_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS product_images_product_id_sort_order_idx ON product_images(product_id, sort_order, id)';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS site_assets (
    id BIGSERIAL PRIMARY KEY,
    slot VARCHAR(120) NOT NULL,
    title VARCHAR(160),
    alt_text TEXT,
    image_key TEXT NOT NULL UNIQUE,
    public_url TEXT NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT site_assets_slot_not_blank CHECK (char_length(btrim(slot)) > 0),
    CONSTRAINT site_assets_window_valid CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at <= ends_at)
);

CREATE INDEX IF NOT EXISTS site_assets_slot_idx
    ON site_assets(slot);

CREATE INDEX IF NOT EXISTS site_assets_slot_order_idx
    ON site_assets(slot, sort_order, id);

CREATE INDEX IF NOT EXISTS site_assets_slot_active_window_idx
    ON site_assets(slot, is_active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
    ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx
    ON password_reset_tokens(expires_at);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_used_at_idx
    ON password_reset_tokens(user_id, used_at);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'order_items'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS order_items_product_variant_id_order_id_idx ON order_items(product_variant_id, order_id)';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'orders'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS orders_payment_order_status_updated_at_idx ON orders(payment_status, order_status, updated_at DESC, id)';
    END IF;
END $$;

COMMIT;
