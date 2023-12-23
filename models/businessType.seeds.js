const categoriesSeeding = `
INSERT IGNORE INTO business_type (id, business_type, created_at, updated_at, deleted_at) 
VALUES 
  (1, 'Restaurant/Bar', '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (2, 'Gas Station', '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (3, 'Gym/Fitness Center', '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (4, 'Sports/Recreation Center', '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (5, 'School', '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (6, 'Church', '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (7, 'Grocery Store', '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (8, 'Shopping Mall', '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (9, 'Retail', '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (10, 'Park', '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL),
  (11, 'Office Space', '2023-04-19 22:07:58', '2023-04-19 22:07:58', NULL)
  ON DUPLICATE KEY UPDATE id = id
`;

export default categoriesSeeding;