const categoriesSeeding = `
INSERT IGNORE INTO categories (id, name, image, parent_id, is_one_time, is_periodic, is_units, created_at, updated_at, deleted_at) 
VALUES 
  (2, 'Place', '636e59ca40caf.png', 0, 0, 0, 0, '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (3, 'Thing', '636e59eb81ddd.png', 0, 0, 0, 0, '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (4, 'Event', '636e57c48b62d.png', 1, 1, 0, 0, '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (5, 'Vehicle', '636e5a09d71ff.png', 1, 0, 1, 0, '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (6, 'Wearables', '636e59aceaab9.png', 1, 0, 1, 0, '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (7, 'Digital/Media', '636e574abca3c.png', 1, 0, 1, 0, '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (8, 'Other', '636e594c8953c.png', 1, 1, 0, 0, '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (9, 'Building', '636e571f43280.png', 2, 0, 1, 0, '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (10, 'Fence', '636e587025022.png', 2, 0, 1, 0, '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (11, 'Fixture/Outdoor Structure', '636e58bac1ab8.png', 2, 0, 1, 0, '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (12, 'Other', '636e59369a88d.png', 2, 1, 0, 0, '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (13, 'Window', '636e5a67def69.png', 9, 0, 1, 0, '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (14, 'Door', '636e579d22ecb.png', 9, 0, 1, 0, '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (15, 'Interior wall', '636e590be642c.png', 9, 0, 1, 0, '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (16, 'Exterior wall', '636e5837c9640.png', 9, 0, 1, 0, '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (17, 'Pizza Box', '64300b8bdfe5c.png', 3, 0, 0, 1, NULL, NULL, NULL),
  (18, 'Other', '636e594c8953c.png', 3, 0, 0, 1, NULL, NULL, NULL)
  ON DUPLICATE KEY UPDATE id = id
`;

export default categoriesSeeding;