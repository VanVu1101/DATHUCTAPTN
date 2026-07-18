ALTER TABLE mentors
    ADD COLUMN ownerUserId INT NULL AFTER userId,
    ADD INDEX mentors_owner_user_idx (ownerUserId),
    ADD CONSTRAINT mentors_owner_user_fk
        FOREIGN KEY (ownerUserId) REFERENCES users(id) ON DELETE SET NULL;
