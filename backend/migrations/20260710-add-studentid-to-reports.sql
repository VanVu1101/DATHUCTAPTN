-- Migration: add studentId column to reports
ALTER TABLE `reports`
  ADD COLUMN `studentId` INT NULL AFTER `reviewerNote`;

-- Add index for faster lookup
CREATE INDEX idx_reports_studentId ON `reports` (`studentId`);
