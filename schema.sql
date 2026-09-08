CREATE TABLE IF NOT EXISTS com_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS com_settings (
  user_id INT PRIMARY KEY,
  ultramsg_instance VARCHAR(80) DEFAULT NULL,
  ultramsg_token VARCHAR(255) DEFAULT NULL,
  message_template TEXT,
  delay_ms INT DEFAULT 4000,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES com_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS com_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type_id INT NULL,
  conjunto VARCHAR(255) NOT NULL,
  nombre VARCHAR(190) NOT NULL,
  saludo VARCHAR(120) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  extras TEXT NULL,
  sent TINYINT(1) NOT NULL DEFAULT 0,
  sent_at DATETIME NULL,
  last_error TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contacts_user FOREIGN KEY (user_id) REFERENCES com_users(id) ON DELETE CASCADE,
  INDEX idx_contacts_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS com_send_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  contact_id INT NULL,
  phone VARCHAR(20),
  body TEXT,
  success TINYINT(1) NOT NULL DEFAULT 0,
  response_json TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES com_users(id) ON DELETE CASCADE,
  INDEX idx_logs_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
