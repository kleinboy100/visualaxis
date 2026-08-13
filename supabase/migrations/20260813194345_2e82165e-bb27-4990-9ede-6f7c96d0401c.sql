insert into public.categories (name, slug, description) values
  ('Sport', 'sport', 'Athletics, rugby, netball and more'),
  ('Cultural', 'cultural', 'Choir, drama and music events'),
  ('Formals', 'formals', 'Matric farewell and formal evenings'),
  ('Class Photos', 'class-photos', 'Class and team group photos')
on conflict (slug) do nothing;

insert into public.events (name, slug, location, event_date, published, category_id, cover_url)
select v.name, v.slug, v.location, v.event_date::date, true, c.id, v.cover
from (values
  ('Inter-House Athletics Day', 'inter-house-athletics-day', 'School Stadium', '2026-03-14', 'sport', '/api/public/preview/seed/athletics-1.jpg'),
  ('U16 Rugby vs Hillcrest', 'u16-rugby-vs-hillcrest', 'Main Field', '2026-05-09', 'sport', '/api/public/preview/seed/rugby-1.jpg'),
  ('Senior Choir Festival', 'senior-choir-festival', 'School Hall', '2026-06-20', 'cultural', '/api/public/preview/seed/choir-1.jpg'),
  ('Matric Farewell 2026', 'matric-farewell-2026', 'The Venue', '2026-08-01', 'formals', '/api/public/preview/seed/matric-1.jpg')
) as v(name, slug, location, event_date, cat, cover)
join public.categories c on c.slug = v.cat
on conflict (slug) do nothing;

insert into public.photos (event_id, title, code, preview_path, original_path, digital_price_cents, print_price_cents)
select e.id, v.title, v.code, v.p, v.p, 12000, 25000
from (values
  ('inter-house-athletics-day', '100m Final', 'ATH-001', 'seed/athletics-1.jpg'),
  ('inter-house-athletics-day', 'Relay Handover', 'ATH-002', 'seed/athletics-1.jpg'),
  ('inter-house-athletics-day', 'Finish Line', 'ATH-003', 'seed/athletics-1.jpg'),
  ('u16-rugby-vs-hillcrest', 'Breakaway Try', 'RUG-001', 'seed/rugby-1.jpg'),
  ('u16-rugby-vs-hillcrest', 'Scrum Time', 'RUG-002', 'seed/rugby-1.jpg'),
  ('senior-choir-festival', 'Opening Number', 'CHO-001', 'seed/choir-1.jpg'),
  ('senior-choir-festival', 'Full Choir', 'CHO-002', 'seed/choir-1.jpg'),
  ('matric-farewell-2026', 'Arrivals', 'MAT-001', 'seed/matric-1.jpg'),
  ('matric-farewell-2026', 'Group Portrait', 'MAT-002', 'seed/matric-1.jpg')
) as v(eslug, title, code, p)
join public.events e on e.slug = v.eslug;