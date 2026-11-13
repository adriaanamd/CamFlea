-- CamFlea local/demo seed data.
-- Run with: supabase db reset --workdir camflea-supabase
-- Auth users must be created through the Supabase Admin Auth API before this SQL runs.
-- This file then resolves those API-created users by their seeded email addresses.

BEGIN;

CREATE TEMP TABLE seed_demo_users (
  user_id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  school TEXT NOT NULL,
  program TEXT NOT NULL,
  year_level TEXT NOT NULL
) ON COMMIT DROP;

-- DEMO USERS BEGIN
INSERT INTO seed_demo_users (user_id, email, first_name, last_name, school, program, year_level)
VALUES
  ('10000000-0000-0000-0000-000000000001'::uuid, 'alexa.santos@camflea.com', 'Alexa', 'Santos', 'Camarines State University', 'BS Information Technology', '3rd Year'),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'ben.delacruz@camflea.com', 'Ben', 'Dela Cruz', 'Camarines State University', 'BS Computer Science', '4th Year'),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'carla.mendoza@camflea.com', 'Carla', 'Mendoza', 'Camarines State University', 'BS Business Administration', '2nd Year'),
  ('10000000-0000-0000-0000-000000000004'::uuid, 'diego.navarro@camflea.com', 'Diego', 'Navarro', 'Camarines State University', 'BS Civil Engineering', '3rd Year'),
  ('10000000-0000-0000-0000-000000000005'::uuid, 'ella.reyes@camflea.com', 'Ella', 'Reyes', 'Camarines State University', 'BS Psychology', '1st Year'),
  ('10000000-0000-0000-0000-000000000006'::uuid, 'felix.cruz@camflea.com', 'Felix', 'Cruz', 'Camarines State University', 'BS Accountancy', '4th Year'),
  ('10000000-0000-0000-0000-000000000007'::uuid, 'grace.villanueva@camflea.com', 'Grace', 'Villanueva', 'Camarines State University', 'BS Education', '3rd Year'),
  ('10000000-0000-0000-0000-000000000008'::uuid, 'hugo.ramos@camflea.com', 'Hugo', 'Ramos', 'Camarines State University', 'BS Architecture', '2nd Year'),
  ('10000000-0000-0000-0000-000000000009'::uuid, 'isla.garcia@camflea.com', 'Isla', 'Garcia', 'Camarines State University', 'BS Nursing', '3rd Year'),
  ('10000000-0000-0000-0000-000000000010'::uuid, 'jiro.aquino@camflea.com', 'Jiro', 'Aquino', 'Camarines State University', 'BS Information Systems', '2nd Year'),
  ('10000000-0000-0000-0000-000000000011'::uuid, 'kira.bautista@camflea.com', 'Kira', 'Bautista', 'Camarines State University', 'BS Biology', '1st Year'),
  ('10000000-0000-0000-0000-000000000012'::uuid, 'liam.flores@camflea.com', 'Liam', 'Flores', 'Camarines State University', 'BS Hospitality Management', '4th Year');
-- DEMO USERS END

CREATE TEMP TABLE seed_demo_user_map (
  seed_id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO seed_demo_user_map (seed_id, user_id)
SELECT seed.user_id, auth_user.id
FROM seed_demo_users AS seed
JOIN auth.users AS auth_user ON auth_user.email = seed.email;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM seed_demo_user_map) <> (SELECT COUNT(*) FROM seed_demo_users) THEN
    RAISE EXCEPTION 'Demo Auth users are incomplete; create all seeded accounts through the Supabase Admin Auth API first.';
  END IF;
END
$$;

INSERT INTO public.student_profiles (
  user_id,
  first_name,
  last_name,
  email,
  school,
  program,
  year_level,
  bio
)
SELECT
  user_map.user_id,
  seed.first_name,
  seed.last_name,
  seed.email,
  seed.school,
  seed.program,
  seed.year_level,
  '[DEMO DATA] Seed account for local development and QA.'
FROM seed_demo_users AS seed
JOIN seed_demo_user_map AS user_map ON user_map.seed_id = seed.user_id
ON CONFLICT (user_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  school = EXCLUDED.school,
  program = EXCLUDED.program,
  year_level = EXCLUDED.year_level,
  bio = EXCLUDED.bio,
  updated_at = TIMESTAMPTZ '2026-11-01 00:00:00+00';

INSERT INTO public.user_roles (user_id, role)
SELECT user_map.user_id, roles.role
FROM (
  VALUES
    ('10000000-0000-0000-0000-000000000001'::uuid, 'admin'),
    ('10000000-0000-0000-0000-000000000002'::uuid, 'moderator')
) AS roles(seed_id, role)
JOIN seed_demo_user_map AS user_map ON user_map.seed_id = roles.seed_id
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.marketplace_account_status (user_id, status, reason)
SELECT user_map.user_id, 'active', '[DEMO DATA] Local seed account'
FROM seed_demo_users AS seed
JOIN seed_demo_user_map AS user_map ON user_map.seed_id = seed.user_id
ON CONFLICT (user_id) DO UPDATE SET
  status = EXCLUDED.status,
  reason = EXCLUDED.reason,
  updated_at = TIMESTAMPTZ '2026-11-01 00:00:00+00';

CREATE TEMP TABLE seed_demo_listings (
  listing_id UUID PRIMARY KEY,
  seller_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  price_type TEXT NOT NULL,
  price NUMERIC(10, 2),
  price_min NUMERIC(10, 2),
  price_max NUMERIC(10, 2),
  meeting_place TEXT NOT NULL,
  status TEXT NOT NULL,
  listed_at TIMESTAMPTZ NOT NULL
) ON COMMIT DROP;

-- DEMO LISTINGS BEGIN
INSERT INTO seed_demo_listings (
  listing_id,
  seller_id,
  title,
  description,
  category,
  condition,
  price_type,
  price,
  price_min,
  price_max,
  meeting_place,
  status,
  listed_at
)
VALUES
  ('20000000-0000-0000-0000-000000000001'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '[DEMO DATA] Calculus textbook', '[DEMO DATA] New condition calculus textbook from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'New', 'single', 287, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-08-02T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000002'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, '[DEMO DATA] Python programming book', '[DEMO DATA] Like new condition python programming book from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'Like new', 'single', 424, NULL, NULL, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-08-03T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000003'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '[DEMO DATA] Chemistry lab coat', '[DEMO DATA] Good condition chemistry lab coat from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'Good', 'single', 561, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-08-04T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000004'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '[DEMO DATA] Graphing notebook set', '[DEMO DATA] Fair condition graphing notebook set from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'Fair', 'range', NULL, 372, 740, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-08-05T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000005'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '[DEMO DATA] Desk organizer', '[DEMO DATA] New condition desk organizer from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'New', 'single', 835, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-08-06T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000006'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '[DEMO DATA] Highlighter pack', '[DEMO DATA] Like new condition highlighter pack from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'Like new', 'single', 972, NULL, NULL, 'Gym gate', 'available', TIMESTAMPTZ '2026-08-07T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000007'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '[DEMO DATA] Mechanical pencil set', '[DEMO DATA] Good condition mechanical pencil set from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'Good', 'single', 1109, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-08-08T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000008'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '[DEMO DATA] USB flash drive', '[DEMO DATA] Fair condition usb flash drive from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'Fair', 'range', NULL, 544, 980, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-08-09T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000009'::uuid, '10000000-0000-0000-0000-000000000009'::uuid, '[DEMO DATA] Scientific calculator', '[DEMO DATA] New condition scientific calculator from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'New', 'single', 1383, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-08-10T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000010'::uuid, '10000000-0000-0000-0000-000000000010'::uuid, '[DEMO DATA] Binder starter kit', '[DEMO DATA] Like new condition binder starter kit from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'Like new', 'hidden', NULL, NULL, NULL, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-08-11T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000011'::uuid, '10000000-0000-0000-0000-000000000011'::uuid, '[DEMO DATA] Index cards bundle', '[DEMO DATA] Good condition index cards bundle from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'Good', 'single', 1657, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-08-12T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000012'::uuid, '10000000-0000-0000-0000-000000000012'::uuid, '[DEMO DATA] Art paper pad', '[DEMO DATA] Fair condition art paper pad from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'Fair', 'range', NULL, 716, 1220, 'Gym gate', 'available', TIMESTAMPTZ '2026-08-13T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000013'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '[DEMO DATA] Study lamp', '[DEMO DATA] New condition study lamp from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'New', 'single', 1931, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-08-14T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000014'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, '[DEMO DATA] Desk mat', '[DEMO DATA] Like new condition desk mat from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'Like new', 'single', 2068, NULL, NULL, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-08-15T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000015'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '[DEMO DATA] Sticky notes set', '[DEMO DATA] Good condition sticky notes set from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'Good', 'single', 2205, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-08-16T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000016'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '[DEMO DATA] Whiteboard marker pack', '[DEMO DATA] Fair condition whiteboard marker pack from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'Fair', 'range', NULL, 888, 1460, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-08-17T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000017'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '[DEMO DATA] Literature anthology', '[DEMO DATA] New condition literature anthology from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'New', 'single', 2479, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-08-18T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000018'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '[DEMO DATA] Engineering drawing set', '[DEMO DATA] Like new condition engineering drawing set from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'Like new', 'single', 2616, NULL, NULL, 'Gym gate', 'available', TIMESTAMPTZ '2026-08-19T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000019'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '[DEMO DATA] Laptop stand', '[DEMO DATA] Good condition laptop stand from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'Good', 'single', 2753, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-08-20T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000020'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '[DEMO DATA] Campus backpack', '[DEMO DATA] Fair condition campus backpack from a CamFlea student. Meet on campus to inspect before purchase.', 'Books & School Supplies', 'Fair', 'hidden', NULL, NULL, NULL, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-08-21T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000021'::uuid, '10000000-0000-0000-0000-000000000009'::uuid, '[DEMO DATA] Denim jacket', '[DEMO DATA] New condition denim jacket from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'New', 'single', 3027, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-08-22T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000022'::uuid, '10000000-0000-0000-0000-000000000010'::uuid, '[DEMO DATA] Canvas tote bag', '[DEMO DATA] Like new condition canvas tote bag from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'Like new', 'single', 3164, NULL, NULL, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-08-23T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000023'::uuid, '10000000-0000-0000-0000-000000000011'::uuid, '[DEMO DATA] Running shoes', '[DEMO DATA] Good condition running shoes from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'Good', 'single', 3301, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-08-24T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000024'::uuid, '10000000-0000-0000-0000-000000000012'::uuid, '[DEMO DATA] Vintage varsity jacket', '[DEMO DATA] Fair condition vintage varsity jacket from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'Fair', 'range', NULL, 1232, 1940, 'Gym gate', 'available', TIMESTAMPTZ '2026-08-25T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000025'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '[DEMO DATA] Bucket hat', '[DEMO DATA] New condition bucket hat from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'New', 'single', 225, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-08-26T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000026'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, '[DEMO DATA] Minimalist wallet', '[DEMO DATA] Like new condition minimalist wallet from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'Like new', 'single', 362, NULL, NULL, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-08-27T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000027'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '[DEMO DATA] Silver hoop earrings', '[DEMO DATA] Good condition silver hoop earrings from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'Good', 'single', 499, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-08-28T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000028'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '[DEMO DATA] Cotton hoodie', '[DEMO DATA] Fair condition cotton hoodie from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'Fair', 'range', NULL, 1404, 2180, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-08-29T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000029'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '[DEMO DATA] Black belt', '[DEMO DATA] New condition black belt from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'New', 'single', 773, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-08-30T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000030'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '[DEMO DATA] Sunglasses', '[DEMO DATA] Like new condition sunglasses from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'Like new', 'hidden', NULL, NULL, NULL, 'Gym gate', 'available', TIMESTAMPTZ '2026-08-31T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000031'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '[DEMO DATA] Corduroy overshirt', '[DEMO DATA] Good condition corduroy overshirt from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'Good', 'single', 1047, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-09-01T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000032'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '[DEMO DATA] Crossbody sling bag', '[DEMO DATA] Fair condition crossbody sling bag from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'Fair', 'range', NULL, 1576, 2420, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-09-02T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000033'::uuid, '10000000-0000-0000-0000-000000000009'::uuid, '[DEMO DATA] Floral scarf', '[DEMO DATA] New condition floral scarf from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'New', 'single', 1321, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-09-03T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000034'::uuid, '10000000-0000-0000-0000-000000000010'::uuid, '[DEMO DATA] Crew socks bundle', '[DEMO DATA] Like new condition crew socks bundle from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'Like new', 'single', 1458, NULL, NULL, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-09-04T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000035'::uuid, '10000000-0000-0000-0000-000000000011'::uuid, '[DEMO DATA] Rain jacket', '[DEMO DATA] Good condition rain jacket from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'Good', 'single', 1595, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-09-05T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000036'::uuid, '10000000-0000-0000-0000-000000000012'::uuid, '[DEMO DATA] Canvas sneakers', '[DEMO DATA] Fair condition canvas sneakers from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'Fair', 'range', NULL, 1748, 2660, 'Gym gate', 'available', TIMESTAMPTZ '2026-09-06T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000037'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '[DEMO DATA] Knit cardigan', '[DEMO DATA] New condition knit cardigan from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'New', 'single', 1869, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-09-07T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000038'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, '[DEMO DATA] Watch strap', '[DEMO DATA] Like new condition watch strap from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'Like new', 'single', 2006, NULL, NULL, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-09-08T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000039'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '[DEMO DATA] Hair claw set', '[DEMO DATA] Good condition hair claw set from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'Good', 'single', 2143, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-09-09T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000040'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '[DEMO DATA] Formal polo shirt', '[DEMO DATA] Fair condition formal polo shirt from a CamFlea student. Meet on campus to inspect before purchase.', 'Clothes & Accessories', 'Fair', 'hidden', NULL, NULL, NULL, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-09-10T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000041'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '[DEMO DATA] Wireless mouse', '[DEMO DATA] New condition wireless mouse from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'New', 'single', 2417, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-09-11T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000042'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '[DEMO DATA] Mechanical keyboard', '[DEMO DATA] Like new condition mechanical keyboard from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'Like new', 'single', 2554, NULL, NULL, 'Gym gate', 'available', TIMESTAMPTZ '2026-09-12T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000043'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '[DEMO DATA] USB desk fan', '[DEMO DATA] Good condition usb desk fan from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'Good', 'single', 2691, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-09-13T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000044'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '[DEMO DATA] Bluetooth speaker', '[DEMO DATA] Fair condition bluetooth speaker from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'Fair', 'range', NULL, 292, 640, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-09-14T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000045'::uuid, '10000000-0000-0000-0000-000000000009'::uuid, '[DEMO DATA] Phone tripod', '[DEMO DATA] New condition phone tripod from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'New', 'single', 2965, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-09-15T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000046'::uuid, '10000000-0000-0000-0000-000000000010'::uuid, '[DEMO DATA] Laptop cooling pad', '[DEMO DATA] Like new condition laptop cooling pad from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'Like new', 'single', 3102, NULL, NULL, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-09-16T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000047'::uuid, '10000000-0000-0000-0000-000000000011'::uuid, '[DEMO DATA] Noise cancelling headphones', '[DEMO DATA] Good condition noise cancelling headphones from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'Good', 'single', 3239, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-09-17T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000048'::uuid, '10000000-0000-0000-0000-000000000012'::uuid, '[DEMO DATA] HDMI adapter', '[DEMO DATA] Fair condition hdmi adapter from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'Fair', 'range', NULL, 464, 880, 'Gym gate', 'available', TIMESTAMPTZ '2026-09-18T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000049'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '[DEMO DATA] Power bank', '[DEMO DATA] New condition power bank from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'New', 'single', 163, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-09-19T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000050'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, '[DEMO DATA] Ring light', '[DEMO DATA] Like new condition ring light from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'Like new', 'hidden', NULL, NULL, NULL, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-09-20T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000051'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '[DEMO DATA] Webcam', '[DEMO DATA] Good condition webcam from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'Good', 'single', 437, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-09-21T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000052'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '[DEMO DATA] Portable hard drive', '[DEMO DATA] Fair condition portable hard drive from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'Fair', 'range', NULL, 636, 1120, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-09-22T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000053'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '[DEMO DATA] Phone stand', '[DEMO DATA] New condition phone stand from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'New', 'single', 711, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-09-23T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000054'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '[DEMO DATA] USB C hub', '[DEMO DATA] Like new condition usb c hub from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'Like new', 'single', 848, NULL, NULL, 'Gym gate', 'available', TIMESTAMPTZ '2026-09-24T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000055'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '[DEMO DATA] Smart light bulb', '[DEMO DATA] Good condition smart light bulb from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'Good', 'single', 985, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-09-25T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000056'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '[DEMO DATA] Drawing tablet', '[DEMO DATA] Fair condition drawing tablet from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'Fair', 'range', NULL, 808, 1360, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-09-26T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000057'::uuid, '10000000-0000-0000-0000-000000000009'::uuid, '[DEMO DATA] Calculator watch', '[DEMO DATA] New condition calculator watch from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'New', 'single', 1259, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-09-27T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000058'::uuid, '10000000-0000-0000-0000-000000000010'::uuid, '[DEMO DATA] Charging cable bundle', '[DEMO DATA] Like new condition charging cable bundle from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'Like new', 'single', 1396, NULL, NULL, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-09-28T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000059'::uuid, '10000000-0000-0000-0000-000000000011'::uuid, '[DEMO DATA] Compact digital camera', '[DEMO DATA] Good condition compact digital camera from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'Good', 'single', 1533, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-09-29T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000060'::uuid, '10000000-0000-0000-0000-000000000012'::uuid, '[DEMO DATA] Earbuds case', '[DEMO DATA] Fair condition earbuds case from a CamFlea student. Meet on campus to inspect before purchase.', 'Gadgets & Electronics', 'Fair', 'hidden', NULL, NULL, NULL, 'Gym gate', 'available', TIMESTAMPTZ '2026-09-30T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000061'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '[DEMO DATA] Basketball', '[DEMO DATA] New condition basketball from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'New', 'single', 1807, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-10-01T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000062'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, '[DEMO DATA] Yoga mat', '[DEMO DATA] Like new condition yoga mat from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'Like new', 'single', 1944, NULL, NULL, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-10-02T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000063'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '[DEMO DATA] Badminton racket pair', '[DEMO DATA] Good condition badminton racket pair from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'Good', 'single', 2081, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-10-03T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000064'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '[DEMO DATA] Hiking daypack', '[DEMO DATA] Fair condition hiking daypack from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'Fair', 'range', NULL, 1152, 1840, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-10-04T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000065'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '[DEMO DATA] Reusable water bottle', '[DEMO DATA] New condition reusable water bottle from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'New', 'single', 2355, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-10-05T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000066'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '[DEMO DATA] Jump rope', '[DEMO DATA] Like new condition jump rope from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'Like new', 'single', 2492, NULL, NULL, 'Gym gate', 'available', TIMESTAMPTZ '2026-10-06T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000067'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '[DEMO DATA] Football', '[DEMO DATA] Good condition football from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'Good', 'single', 2629, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-10-07T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000068'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '[DEMO DATA] Tennis racket', '[DEMO DATA] Fair condition tennis racket from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'Fair', 'range', NULL, 1324, 2080, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-10-08T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000069'::uuid, '10000000-0000-0000-0000-000000000009'::uuid, '[DEMO DATA] Camping lantern', '[DEMO DATA] New condition camping lantern from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'New', 'single', 2903, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-10-09T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000070'::uuid, '10000000-0000-0000-0000-000000000010'::uuid, '[DEMO DATA] Cycling helmet', '[DEMO DATA] Like new condition cycling helmet from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'Like new', 'hidden', NULL, NULL, NULL, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-10-10T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000071'::uuid, '10000000-0000-0000-0000-000000000011'::uuid, '[DEMO DATA] Resistance bands', '[DEMO DATA] Good condition resistance bands from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'Good', 'single', 3177, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-10-11T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000072'::uuid, '10000000-0000-0000-0000-000000000012'::uuid, '[DEMO DATA] Picnic blanket', '[DEMO DATA] Fair condition picnic blanket from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'Fair', 'range', NULL, 1496, 2320, 'Gym gate', 'available', TIMESTAMPTZ '2026-10-12T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000073'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '[DEMO DATA] Skateboard', '[DEMO DATA] New condition skateboard from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'New', 'single', 3451, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-10-13T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000074'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, '[DEMO DATA] Gym gloves', '[DEMO DATA] Like new condition gym gloves from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'Like new', 'single', 238, NULL, NULL, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-10-14T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000075'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '[DEMO DATA] Foldable umbrella', '[DEMO DATA] Good condition foldable umbrella from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'Good', 'single', 375, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-10-15T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000076'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '[DEMO DATA] Foam roller', '[DEMO DATA] Fair condition foam roller from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'Fair', 'range', NULL, 1668, 2560, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-10-16T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000077'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '[DEMO DATA] Frisbee', '[DEMO DATA] New condition frisbee from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'New', 'single', 649, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-10-17T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000078'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '[DEMO DATA] Swim goggles', '[DEMO DATA] Like new condition swim goggles from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'Like new', 'single', 786, NULL, NULL, 'Gym gate', 'available', TIMESTAMPTZ '2026-10-18T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000079'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '[DEMO DATA] Trail sandals', '[DEMO DATA] Good condition trail sandals from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'Good', 'single', 923, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-10-19T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000080'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '[DEMO DATA] Portable hammock', '[DEMO DATA] Fair condition portable hammock from a CamFlea student. Meet on campus to inspect before purchase.', 'Sports & Outdoors', 'Fair', 'hidden', NULL, NULL, NULL, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-10-20T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000081'::uuid, '10000000-0000-0000-0000-000000000009'::uuid, '[DEMO DATA] Hand painted tote', '[DEMO DATA] New condition hand painted tote from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'New', 'single', 1197, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-10-21T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000082'::uuid, '10000000-0000-0000-0000-000000000010'::uuid, '[DEMO DATA] Crochet flower bouquet', '[DEMO DATA] Like new condition crochet flower bouquet from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'Like new', 'single', 1334, NULL, NULL, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-10-22T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000083'::uuid, '10000000-0000-0000-0000-000000000011'::uuid, '[DEMO DATA] Clay trinket dish', '[DEMO DATA] Good condition clay trinket dish from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'Good', 'single', 1471, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-10-23T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000084'::uuid, '10000000-0000-0000-0000-000000000012'::uuid, '[DEMO DATA] Sticker sheet collection', '[DEMO DATA] Fair condition sticker sheet collection from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'Fair', 'range', NULL, 212, 540, 'Gym gate', 'available', TIMESTAMPTZ '2026-10-24T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000085'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '[DEMO DATA] Mini art print set', '[DEMO DATA] New condition mini art print set from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'New', 'single', 1745, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-10-25T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000086'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, '[DEMO DATA] Beaded keychain', '[DEMO DATA] Like new condition beaded keychain from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'Like new', 'single', 1882, NULL, NULL, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-10-26T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000087'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '[DEMO DATA] Handmade bookmark', '[DEMO DATA] Good condition handmade bookmark from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'Good', 'single', 2019, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-10-27T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000088'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '[DEMO DATA] Resin coaster set', '[DEMO DATA] Fair condition resin coaster set from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'Fair', 'range', NULL, 384, 780, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-10-28T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000089'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '[DEMO DATA] Origami paper bundle', '[DEMO DATA] New condition origami paper bundle from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'New', 'single', 2293, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-10-29T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000090'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '[DEMO DATA] Vinyl record sleeve', '[DEMO DATA] Like new condition vinyl record sleeve from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'Like new', 'hidden', NULL, NULL, NULL, 'Gym gate', 'available', TIMESTAMPTZ '2026-10-30T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000091'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '[DEMO DATA] Enamel pin set', '[DEMO DATA] Good condition enamel pin set from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'Good', 'single', 2567, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-10-31T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000092'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '[DEMO DATA] Watercolor postcard set', '[DEMO DATA] Fair condition watercolor postcard set from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'Fair', 'range', NULL, 556, 1020, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-11-01T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000093'::uuid, '10000000-0000-0000-0000-000000000009'::uuid, '[DEMO DATA] Woven wall hanging', '[DEMO DATA] New condition woven wall hanging from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'New', 'single', 2841, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-11-02T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000094'::uuid, '10000000-0000-0000-0000-000000000010'::uuid, '[DEMO DATA] Pressed flower frame', '[DEMO DATA] Like new condition pressed flower frame from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'Like new', 'single', 2978, NULL, NULL, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-11-03T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000095'::uuid, '10000000-0000-0000-0000-000000000011'::uuid, '[DEMO DATA] Desk terrarium', '[DEMO DATA] Good condition desk terrarium from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'Good', 'single', 3115, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-11-04T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000096'::uuid, '10000000-0000-0000-0000-000000000012'::uuid, '[DEMO DATA] Knitted plush toy', '[DEMO DATA] Fair condition knitted plush toy from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'Fair', 'range', NULL, 728, 1260, 'Gym gate', 'available', TIMESTAMPTZ '2026-11-05T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000097'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '[DEMO DATA] Calligraphy starter set', '[DEMO DATA] New condition calligraphy starter set from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'New', 'single', 3389, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-11-06T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000098'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, '[DEMO DATA] Clay charm set', '[DEMO DATA] Like new condition clay charm set from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'Like new', 'single', 176, NULL, NULL, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-11-07T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000099'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '[DEMO DATA] Postcard collection', '[DEMO DATA] Good condition postcard collection from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'Good', 'single', 313, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-11-08T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000100'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '[DEMO DATA] Hand lettered sign', '[DEMO DATA] Fair condition hand lettered sign from a CamFlea student. Meet on campus to inspect before purchase.', 'Crafted & Collectibles', 'Fair', 'hidden', NULL, NULL, NULL, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-11-09T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000101'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '[DEMO DATA] Dorm storage crate', '[DEMO DATA] New condition dorm storage crate from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'New', 'single', 587, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-11-10T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000102'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '[DEMO DATA] Electric kettle', '[DEMO DATA] Like new condition electric kettle from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'Like new', 'single', 724, NULL, NULL, 'Gym gate', 'available', TIMESTAMPTZ '2026-11-11T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000103'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '[DEMO DATA] Desk mirror', '[DEMO DATA] Good condition desk mirror from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'Good', 'single', 861, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-11-12T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000104'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '[DEMO DATA] Table fan', '[DEMO DATA] Fair condition table fan from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'Fair', 'range', NULL, 1072, 1740, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-11-13T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000105'::uuid, '10000000-0000-0000-0000-000000000009'::uuid, '[DEMO DATA] Rice cooker', '[DEMO DATA] New condition rice cooker from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'New', 'single', 1135, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-11-14T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000106'::uuid, '10000000-0000-0000-0000-000000000010'::uuid, '[DEMO DATA] Folding chair', '[DEMO DATA] Like new condition folding chair from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'Like new', 'single', 1272, NULL, NULL, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-11-15T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000107'::uuid, '10000000-0000-0000-0000-000000000011'::uuid, '[DEMO DATA] Laundry hamper', '[DEMO DATA] Good condition laundry hamper from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'Good', 'single', 1409, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-11-16T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000108'::uuid, '10000000-0000-0000-0000-000000000012'::uuid, '[DEMO DATA] Cork board', '[DEMO DATA] Fair condition cork board from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'Fair', 'range', NULL, 1244, 1980, 'Gym gate', 'available', TIMESTAMPTZ '2026-11-17T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000109'::uuid, '10000000-0000-0000-0000-000000000001'::uuid, '[DEMO DATA] Extension cord', '[DEMO DATA] New condition extension cord from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'New', 'single', 1683, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-11-18T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000110'::uuid, '10000000-0000-0000-0000-000000000002'::uuid, '[DEMO DATA] Mini bookshelf', '[DEMO DATA] Like new condition mini bookshelf from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'Like new', 'hidden', NULL, NULL, NULL, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-11-19T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000111'::uuid, '10000000-0000-0000-0000-000000000003'::uuid, '[DEMO DATA] Reusable food container set', '[DEMO DATA] Good condition reusable food container set from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'Good', 'single', 1957, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-11-20T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000112'::uuid, '10000000-0000-0000-0000-000000000004'::uuid, '[DEMO DATA] Bedside caddy', '[DEMO DATA] Fair condition bedside caddy from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'Fair', 'range', NULL, 1416, 2220, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-11-21T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000113'::uuid, '10000000-0000-0000-0000-000000000005'::uuid, '[DEMO DATA] Umbrella rack', '[DEMO DATA] New condition umbrella rack from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'New', 'single', 2231, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-11-22T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000114'::uuid, '10000000-0000-0000-0000-000000000006'::uuid, '[DEMO DATA] Travel adapter', '[DEMO DATA] Like new condition travel adapter from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'Like new', 'single', 2368, NULL, NULL, 'Gym gate', 'available', TIMESTAMPTZ '2026-11-23T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000115'::uuid, '10000000-0000-0000-0000-000000000007'::uuid, '[DEMO DATA] Floor cushion', '[DEMO DATA] Good condition floor cushion from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'Good', 'single', 2505, NULL, NULL, 'Main Library lobby', 'available', TIMESTAMPTZ '2026-11-24T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000116'::uuid, '10000000-0000-0000-0000-000000000008'::uuid, '[DEMO DATA] Plant pot set', '[DEMO DATA] Fair condition plant pot set from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'Fair', 'range', NULL, 1588, 2460, 'Student Union entrance', 'available', TIMESTAMPTZ '2026-11-25T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000117'::uuid, '10000000-0000-0000-0000-000000000009'::uuid, '[DEMO DATA] Thermal lunch bag', '[DEMO DATA] New condition thermal lunch bag from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'New', 'single', 2779, NULL, NULL, 'Engineering building atrium', 'available', TIMESTAMPTZ '2026-11-26T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000118'::uuid, '10000000-0000-0000-0000-000000000010'::uuid, '[DEMO DATA] Wall clock', '[DEMO DATA] Like new condition wall clock from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'Like new', 'single', 2916, NULL, NULL, 'Arts building foyer', 'available', TIMESTAMPTZ '2026-11-27T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000119'::uuid, '10000000-0000-0000-0000-000000000011'::uuid, '[DEMO DATA] Cleaning kit', '[DEMO DATA] Good condition cleaning kit from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'Good', 'single', 3053, NULL, NULL, 'Canteen patio', 'available', TIMESTAMPTZ '2026-11-28T01:00:00+00'),
  ('20000000-0000-0000-0000-000000000120'::uuid, '10000000-0000-0000-0000-000000000012'::uuid, '[DEMO DATA] Bicycle lock', '[DEMO DATA] Fair condition bicycle lock from a CamFlea student. Meet on campus to inspect before purchase.', 'Other', 'Fair', 'hidden', NULL, NULL, NULL, 'Gym gate', 'available', TIMESTAMPTZ '2026-11-29T01:00:00+00');
-- DEMO LISTINGS END

INSERT INTO public.marketplace_listings (
  id,
  seller_id,
  title,
  description,
  category,
  condition,
  price_type,
  price,
  price_min,
  price_max,
  photos,
  meeting_place,
  status,
  created_at,
  updated_at
)
SELECT
  listing_id,
  user_map.user_id,
  title,
  description,
  category,
  condition,
  price_type,
  price,
  price_min,
  price_max,
  ARRAY[]::TEXT[],
  meeting_place,
  status,
  listed_at,
  listed_at
FROM seed_demo_listings AS listing
JOIN seed_demo_user_map AS user_map ON user_map.seed_id = listing.seller_id
ON CONFLICT (id) DO UPDATE SET
  seller_id = EXCLUDED.seller_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  condition = EXCLUDED.condition,
  price_type = EXCLUDED.price_type,
  price = EXCLUDED.price,
  price_min = EXCLUDED.price_min,
  price_max = EXCLUDED.price_max,
  photos = EXCLUDED.photos,
  meeting_place = EXCLUDED.meeting_place,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

COMMIT;
