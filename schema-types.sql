CREATE TABLE IF NOT EXISTS com_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  template TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_types_user FOREIGN KEY (user_id) REFERENCES com_users(id) ON DELETE CASCADE,
  INDEX idx_types_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS com_type_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type_id INT NOT NULL,
  field_key VARCHAR(40) NOT NULL,
  label VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_fields_type FOREIGN KEY (type_id) REFERENCES com_types(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_type_key (type_id, field_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
