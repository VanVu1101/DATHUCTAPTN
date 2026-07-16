-- Fix charset for schedules table to support Vietnamese
ALTER TABLE `schedules` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Fix individual columns
ALTER TABLE `schedules` MODIFY COLUMN `title` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
ALTER TABLE `schedules` MODIFY COLUMN `description` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;
ALTER TABLE `schedules` MODIFY COLUMN `location` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;
