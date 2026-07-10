-- Create notifications table
ALTER TABLE IF NOT EXISTS notifications RENAME TO notifications_old;
-- If table already exists, don't fail; migration scripts should be idempotent in this simple form.
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(100),
  data JSON,
  read TINYINT(1) DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId);
