
CREATE TABLE public.complaint_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.complaint_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaint_categories TO authenticated;
GRANT ALL ON public.complaint_categories TO service_role;

ALTER TABLE public.complaint_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories"
  ON public.complaint_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert categories"
  ON public.complaint_categories FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update categories"
  ON public.complaint_categories FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete categories"
  ON public.complaint_categories FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_complaint_categories_updated_at
  BEFORE UPDATE ON public.complaint_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_message_templates_updated_at();

INSERT INTO public.complaint_categories (name, description, sort_order) VALUES
  ('fasilitas', 'Keluhan terkait sarana dan prasarana kampus seperti gedung, ruangan kuliah, AC, toilet, listrik, air, kebersihan, dan fasilitas fisik lainnya.', 1),
  ('akademik', 'Keluhan terkait proses perkuliahan seperti dosen, jadwal kuliah, nilai, KRS, mata kuliah, ujian, dan urusan akademik lainnya.', 2),
  ('administrasi', 'Keluhan terkait pelayanan administrasi seperti surat menyurat, legalisir, dokumen kemahasiswaan, transkrip, dan proses administratif kampus.', 3),
  ('keuangan', 'Keluhan terkait biaya kuliah (UKT/SPP), beasiswa, pembayaran, tunggakan, dan urusan keuangan mahasiswa.', 4),
  ('pelanggaran', 'Laporan pelanggaran kedisiplinan, kode etik, SPI (Saluran Pengaduan Internal), atau DUMAS (pengaduan masyarakat).', 5),
  ('ppid', 'Permintaan informasi publik melalui Pejabat Pengelola Informasi dan Dokumentasi (PPID) kampus.', 6),
  ('lainnya', 'Keluhan atau laporan lain yang tidak masuk ke kategori di atas.', 7);
