ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS photo_path text,
  ADD COLUMN IF NOT EXISTS photo_original_path text,
  ADD COLUMN IF NOT EXISTS photo_title text,
  ADD COLUMN IF NOT EXISTS photo_code text;

UPDATE public.order_items oi
SET photo_path = p.preview_path,
    photo_original_path = p.original_path,
    photo_title = p.title,
    photo_code = p.code
FROM public.photos p
WHERE p.id = oi.photo_id AND oi.photo_path IS NULL;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_photo_id_fkey;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_photo_id_fkey
  FOREIGN KEY (photo_id) REFERENCES public.photos(id) ON DELETE RESTRICT;