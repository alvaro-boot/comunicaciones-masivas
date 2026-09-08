CREATE TABLE IF NOT EXISTS com_followups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  contact_id INT NOT NULL,
  kind VARCHAR(20) NOT NULL,
  body TEXT NOT NULL,
  occurred_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_followups_user FOREIGN KEY (user_id) REFERENCES com_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_followups_contact FOREIGN KEY (contact_id) REFERENCES com_contacts(id) ON DELETE CASCADE,
  INDEX idx_followups_user (user_id),
  INDEX idx_followups_contact (contact_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
