-- Authentication Database Schema
-- MySQL 8 + phpMyAdmin compatible
-- Module scope: users, profiles, refresh_tokens, login_histories

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS internship_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE internship_management;

DROP TABLE IF EXISTS login_histories;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('STUDENT', 'ENTERPRISE', 'ADMIN') NOT NULL,
  status ENUM('PENDING', 'ACTIVE', 'INACTIVE', 'LOCKED') NOT NULL DEFAULT 'PENDING',
  email_verified_at DATETIME NULL,
  password_changed_at DATETIME NULL,
  last_login_at DATETIME NULL,
  failed_login_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_status (status),
  KEY idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NULL,
  date_of_birth DATE NULL,
  gender ENUM('MALE', 'FEMALE', 'OTHER') NULL,
  address VARCHAR(255) NULL,
  bio TEXT NULL,
  avatar_url VARCHAR(500) NULL,
  avatar_s3_key VARCHAR(255) NULL,
  cv_url VARCHAR(500) NULL,
  cv_s3_key VARCHAR(255) NULL,
  cv_original_name VARCHAR(255) NULL,
  cv_mime_type VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_profiles_user_id (user_id),
  KEY idx_profiles_full_name (full_name),
  KEY idx_profiles_phone (phone),
  KEY idx_profiles_deleted_at (deleted_at),
  CONSTRAINT fk_profiles_user_id
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE refresh_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  jti CHAR(36) NOT NULL,
  device_name VARCHAR(150) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  replaced_by_token_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_tokens_jti (jti),
  UNIQUE KEY uq_refresh_tokens_token_hash (token_hash),
  KEY idx_refresh_tokens_user_id (user_id),
  KEY idx_refresh_tokens_expires_at (expires_at),
  KEY idx_refresh_tokens_revoked_at (revoked_at),
  KEY idx_refresh_tokens_deleted_at (deleted_at),
  CONSTRAINT fk_refresh_tokens_user_id
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_refresh_tokens_replaced_by_token_id
    FOREIGN KEY (replaced_by_token_id) REFERENCES refresh_tokens (id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE login_histories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  login_status ENUM('SUCCESS', 'FAILED') NOT NULL DEFAULT 'SUCCESS',
  login_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logout_at DATETIME NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  device_name VARCHAR(150) NULL,
  failure_reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_login_histories_user_id (user_id),
  KEY idx_login_histories_login_at (login_at),
  KEY idx_login_histories_login_status (login_status),
  KEY idx_login_histories_deleted_at (deleted_at),
  CONSTRAINT fk_login_histories_user_id
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
