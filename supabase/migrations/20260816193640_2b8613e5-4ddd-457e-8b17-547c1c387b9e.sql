ALTER TABLE public.events ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.events(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS events_parent_id_idx ON public.events(parent_id);

DELETE FROM public.order_items;
DELETE FROM public.orders;
DELETE FROM public.photos;
DELETE FROM public.events;

ALTER TABLE public.events DROP COLUMN IF EXISTS category_id;
DROP TABLE IF EXISTS public.categories CASCADE;

INSERT INTO public.events (name, slug, location, event_date, description, published)
VALUES ('Lerato Mahole Hockey Festival 2026', 'lerato-mahole-hockey-festival-2026', NULL, '2026-08-16', 'Official photo galleries for the Lerato Mahole Hockey Festival 2026.', true);

INSERT INTO public.events (name, slug, description, published, event_date, parent_id)
SELECT 'Boys', 'lerato-mahole-hockey-festival-2026-boys', 'Boys tournament photos.', true, '2026-08-16', e.id
FROM public.events e WHERE e.slug = 'lerato-mahole-hockey-festival-2026';

INSERT INTO public.events (name, slug, description, published, event_date, parent_id)
SELECT 'Girls', 'lerato-mahole-hockey-festival-2026-girls', 'Girls tournament photos.', true, '2026-08-16', e.id
FROM public.events e WHERE e.slug = 'lerato-mahole-hockey-festival-2026';