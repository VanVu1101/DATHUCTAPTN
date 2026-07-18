CREATE TABLE IF NOT EXISTS chat_conversations (
    id INT NOT NULL AUTO_INCREMENT,
    internshipId INT NOT NULL,
    studentUserId INT NOT NULL,
    mentorUserId INT NOT NULL,
    lastMessageAt DATETIME NULL,
    lastMessagePreview VARCHAR(255) NULL,
    studentLastReadAt DATETIME NULL,
    mentorLastReadAt DATETIME NULL,
    status ENUM('ACTIVE', 'ARCHIVED', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY chat_conversation_assignment_unique (internshipId, studentUserId, mentorUserId),
    KEY chat_conversations_student_last_message (studentUserId, lastMessageAt),
    KEY chat_conversations_mentor_last_message (mentorUserId, lastMessageAt),
    CONSTRAINT chat_conversations_internship_fk
        FOREIGN KEY (internshipId) REFERENCES internships(id) ON DELETE CASCADE,
    CONSTRAINT chat_conversations_student_user_fk
        FOREIGN KEY (studentUserId) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chat_conversations_mentor_user_fk
        FOREIGN KEY (mentorUserId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
    id INT NOT NULL AUTO_INCREMENT,
    conversationId INT NOT NULL,
    senderId INT NOT NULL,
    content TEXT NULL,
    type ENUM('TEXT', 'IMAGE', 'FILE', 'SYSTEM') NOT NULL DEFAULT 'TEXT',
    attachmentUrl VARCHAR(1000) NULL,
    attachmentKey VARCHAR(500) NULL,
    attachmentMime VARCHAR(100) NULL,
    attachmentSize INT NULL,
    attachmentName VARCHAR(255) NULL,
    status ENUM('SENT', 'DELIVERED', 'READ') NOT NULL DEFAULT 'SENT',
    isRecalled TINYINT(1) NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY chat_messages_conversation_created (conversationId, createdAt),
    KEY chat_messages_sender (senderId),
    CONSTRAINT chat_messages_conversation_fk
        FOREIGN KEY (conversationId) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    CONSTRAINT chat_messages_sender_fk
        FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
