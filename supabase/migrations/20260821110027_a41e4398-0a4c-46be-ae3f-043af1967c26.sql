-- Owners can update their own orders (checkout id / status sync)
CREATE POLICY "orders_update_own" ON public.orders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Buyers can read the original files of photos in their paid orders
CREATE POLICY "buyers_read_purchased_originals" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'photo-originals'
    AND EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      JOIN public.photos p ON p.id = oi.photo_id
      WHERE o.user_id = auth.uid()
        AND o.status = 'paid'
        AND p.original_path = storage.objects.name
    )
  );

-- Admins manage roles; first signed-in user may claim admin when none exists
CREATE POLICY "roles_admin_write" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roles_claim_first_admin" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'admin'
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.role = 'admin')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;