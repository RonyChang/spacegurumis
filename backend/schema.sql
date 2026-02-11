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

COMMIT;
