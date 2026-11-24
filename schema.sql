CREATE DATABASE IF NOT EXISTS chat_app;
USE chat_app;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chats (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_a_id VARCHAR(100) NOT NULL,
  user_b_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chats_user_a FOREIGN KEY (user_a_id) REFERENCES users(id),
  CONSTRAINT fk_chats_user_b FOREIGN KEY (user_b_id) REFERENCES users(id),
  UNIQUE KEY unique_direct_chat (user_a_id, user_b_id),
  INDEX chats_user_a_idx (user_a_id), INDEX chats_user_b_idx (user_b_id)
);
