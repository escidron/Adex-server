-- Expand sns_url column from varchar(255) to varchar(500)
-- 255 is technically sufficient for all supported platforms, but 500 gives comfortable headroom
-- for UTM tracking parameters users might accidentally include in a copied URL
ALTER TABLE sns_submissions MODIFY COLUMN sns_url varchar(500) NULL;
