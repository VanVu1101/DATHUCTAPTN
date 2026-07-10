-- Migration: Add missing notification columns and make report content/userId nullable
-- 1) Add columns to notifications if they don't exist
ALTER TABLE `notifications`
  ADD COLUMN IF NOT EXISTS `type` VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `data` JSON NULL,
  ADD COLUMN IF NOT EXISTS `read` TINYINT(1) NOT NULL DEFAULT 0;

-- 2) Ensure index on userId exists
CREATE INDEX IF NOT EXISTS `idx_notifications_userId` ON `notifications` (`userId`);

-- 3) Make `reports.content` and `reports.userId` nullable to allow admin placeholder entries
ALTER TABLE `reports`
  MODIFY COLUMN `content` TEXT NULL,
  MODIFY COLUMN `userId` INT NULL;

-- Note: Running the down migration should be done with care; see the .js migration for reversible steps.
