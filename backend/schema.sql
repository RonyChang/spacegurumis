-- spacegurumis backend schema additions
-- Product images (Cloudflare R2)

BEGIN;

CREATE TABLE IF NOT EXISTS product_images (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_key TEXT NOT NULL UNIQUE,
    public_url TEXT NOT NULL,
    content_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    alt_text TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_images_product_id_idx
    ON product_images(product_id);

CREATE INDEX IF NOT EXISTS product_images_product_id_sort_order_idx
    ON product_images(product_id, sort_order, id);

COMMIT;

