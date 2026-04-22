-- ============================================
-- Movie Ticket Booking System - Database Setup
-- ============================================

CREATE DATABASE IF NOT EXISTS movie_booking;
USE movie_booking;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Movies Table
CREATE TABLE IF NOT EXISTS movies (
  movie_id INT AUTO_INCREMENT PRIMARY KEY,
  movie_title VARCHAR(200) NOT NULL,
  genre VARCHAR(100),
  duration INT COMMENT 'in minutes',
  release_date DATE,
  description TEXT,
  poster_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Showtimes Table
CREATE TABLE IF NOT EXISTS showtimes (
  showtime_id INT AUTO_INCREMENT PRIMARY KEY,
  movie_id INT NOT NULL,
  show_date DATE NOT NULL,
  show_time TIME NOT NULL,
  hall_number VARCHAR(20),
  total_seats INT DEFAULT 60,
  available_seats INT DEFAULT 60,
  price DECIMAL(10,2) DEFAULT 150.00,
  FOREIGN KEY (movie_id) REFERENCES movies(movie_id) ON DELETE CASCADE
);

-- Seats Table
CREATE TABLE IF NOT EXISTS seats (
  seat_id INT AUTO_INCREMENT PRIMARY KEY,
  showtime_id INT NOT NULL,
  seat_number VARCHAR(10) NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (showtime_id) REFERENCES showtimes(showtime_id) ON DELETE CASCADE
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  booking_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  showtime_id INT NOT NULL,
  seat_numbers VARCHAR(200) NOT NULL,
  total_price DECIMAL(10,2),
  booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('confirmed', 'cancelled') DEFAULT 'confirmed',
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (showtime_id) REFERENCES showtimes(showtime_id) ON DELETE CASCADE
);

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- Admin user (password: admin123)
INSERT INTO users (name, email, password, role) VALUES
('Admin', 'admin@cinema.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Sample Movies
INSERT INTO movies (movie_title, genre, duration, release_date, description, poster_url) VALUES
('Avatar: The Way of Water', 'Sci-Fi', 192, '2022-12-16', 'Jake Sully lives with his newfound family formed on the extrasolar moon Pandora.', 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg'),
('The Batman', 'Action', 176, '2022-03-04', 'When the Riddler, a sadistic serial killer, begins murdering key political figures in Gotham City, Batman is forced to investigate.', 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg'),
('Spider-Man: No Way Home', 'Action', 148, '2021-12-17', 'With Spider-Man''s identity now revealed, Peter asks Doctor Strange for help.', 'https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg'),
('Black Panther: Wakanda Forever', 'Action', 161, '2022-11-11', 'The people of Wakanda fight to protect their home from intervening world powers.', 'https://image.tmdb.org/t/p/w500/sv1xJUazXeYqALzczSZ3O6nkH75.jpg'),
('Doctor Strange in the Multiverse', 'Fantasy', 126, '2022-05-06', 'Doctor Strange teams up with a mysterious Scarlet Witch to face a powerful enemy.', 'https://image.tmdb.org/t/p/w500/9Gtg2DzBhmYamXBS1hKAhiwbBKS.jpg'),
('Top Gun: Maverick', 'Drama', 130, '2022-05-27', 'After thirty years, Maverick is still pushing the envelope as a top naval aviator.', 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg');

-- Sample Showtimes
INSERT INTO showtimes (movie_id, show_date, show_time, hall_number, total_seats, available_seats, price) VALUES
(1, '2026-04-20', '10:00:00', 'Hall 1', 60, 60, 200.00),
(1, '2026-04-20', '14:00:00', 'Hall 1', 60, 60, 200.00),
(1, '2026-04-20', '18:00:00', 'Hall 2', 60, 60, 250.00),
(2, '2026-04-20', '11:00:00', 'Hall 2', 60, 60, 180.00),
(2, '2026-04-20', '16:00:00', 'Hall 3', 60, 60, 180.00),
(3, '2026-04-21', '10:00:00', 'Hall 1', 60, 60, 170.00),
(3, '2026-04-21', '15:00:00', 'Hall 2', 60, 60, 170.00),
(4, '2026-04-21', '13:00:00', 'Hall 3', 60, 60, 190.00),
(5, '2026-04-22', '12:00:00', 'Hall 1', 60, 60, 160.00),
(6, '2026-04-22', '17:00:00', 'Hall 2', 60, 60, 175.00);

-- Generate seats for each showtime (A1-A10, B1-B10, C1-C10, D1-D10, E1-E10, F1-F10)
INSERT INTO seats (showtime_id, seat_number)
SELECT s.showtime_id, CONCAT(row_letter, col_num)
FROM showtimes s
JOIN (
  SELECT 'A' AS row_letter UNION SELECT 'B' UNION SELECT 'C'
  UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F'
) rows_t
JOIN (
  SELECT 1 AS col_num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
  UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
) cols_t;
