-- Phase 4 Migration: Philippine Administrative Location Dataset Seed
-- Tala Platform

-- Insert Major Philippine Regions
INSERT INTO public.regions (code, name) VALUES
('NCR', 'National Capital Region (NCR)'),
('CAR', 'Cordillera Administrative Region (CAR)'),
('R01', 'Region I (Ilocos Region)'),
('R03', 'Region III (Central Luzon)'),
('R04A', 'Region IV-A (CALABARZON)'),
('R06', 'Region VI (Western Visayas)'),
('R07', 'Region VII (Central Visayas)'),
('R10', 'Region X (Northern Mindanao)'),
('R11', 'Region XI (Davao Region)')
ON CONFLICT (code) DO NOTHING;

-- Insert Representative Provinces
INSERT INTO public.provinces (region_id, code, name)
SELECT r.id, 'MM', 'Metro Manila' FROM public.regions r WHERE r.code = 'NCR'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.provinces (region_id, code, name)
SELECT r.id, 'BEN', 'Benguet' FROM public.regions r WHERE r.code = 'CAR'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.provinces (region_id, code, name)
SELECT r.id, 'ILN', 'Ilocos Norte' FROM public.regions r WHERE r.code = 'R01'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.provinces (region_id, code, name)
SELECT r.id, 'LAG', 'Laguna' FROM public.regions r WHERE r.code = 'R04A'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.provinces (region_id, code, name)
SELECT r.id, 'CEB', 'Cebu' FROM public.regions r WHERE r.code = 'R07'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.provinces (region_id, code, name)
SELECT r.id, 'DAV', 'Davao del Sur' FROM public.regions r WHERE r.code = 'R11'
ON CONFLICT (code) DO NOTHING;

-- Insert Representative Cities/Municipalities
INSERT INTO public.cities_municipalities (province_id, code, name, latitude, longitude)
SELECT p.id, 'QC', 'Quezon City', 14.6760, 121.0437 FROM public.provinces p WHERE p.code = 'MM'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.cities_municipalities (province_id, code, name, latitude, longitude)
SELECT p.id, 'MNL', 'Manila', 14.5995, 120.9842 FROM public.provinces p WHERE p.code = 'MM'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.cities_municipalities (province_id, code, name, latitude, longitude)
SELECT p.id, 'BAG', 'Baguio City', 16.4023, 120.5960 FROM public.provinces p WHERE p.code = 'BEN'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.cities_municipalities (province_id, code, name, latitude, longitude)
SELECT p.id, 'LAO', 'Laoag City', 18.1960, 120.5927 FROM public.provinces p WHERE p.code = 'ILN'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.cities_municipalities (province_id, code, name, latitude, longitude)
SELECT p.id, 'CEU', 'Cebu City', 10.3157, 123.8854 FROM public.provinces p WHERE p.code = 'CEB'
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.cities_municipalities (province_id, code, name, latitude, longitude)
SELECT p.id, 'DVO', 'Davao City', 7.1907, 125.4553 FROM public.provinces p WHERE p.code = 'DAV'
ON CONFLICT (code) DO NOTHING;
