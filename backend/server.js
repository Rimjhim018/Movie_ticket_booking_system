// ============================================
// server.js — Movie Ticket Booking System Backend
// ============================================
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ── Database Connection ──────────────────────
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'movie_booking',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10
});

// ── Auth Middleware ──────────────────────────
const authenticate = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

// ══════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════

// Register
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields are required' });
  try {
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashed]);
    res.json({ message: 'Registration successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0)
      return res.status(400).json({ error: 'Invalid email or password' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ error: 'Invalid email or password' });
    const token = jwt.sign(
      { user_id: user.user_id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get profile
app.get('/api/profile', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?', [req.user.user_id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile
app.put('/api/profile', authenticate, async (req, res) => {
  const { name, password } = req.body;
  try {
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET name=?, password=? WHERE user_id=?', [name, hashed, req.user.user_id]);
    } else {
      await pool.query('UPDATE users SET name=? WHERE user_id=?', [name, req.user.user_id]);
    }
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// MOVIE ROUTES
// ══════════════════════════════════════════════

// Get all movies (with optional search/filter)
app.get('/api/movies', async (req, res) => {
  const { search, genre, sort } = req.query;
  let query = 'SELECT * FROM movies WHERE 1=1';
  const params = [];
  if (search) { query += ' AND movie_title LIKE ?'; params.push(`%${search}%`); }
  if (genre) { query += ' AND genre = ?'; params.push(genre); }
  if (sort === 'newest') query += ' ORDER BY release_date DESC';
  else if (sort === 'oldest') query += ' ORDER BY release_date ASC';
  else query += ' ORDER BY movie_id DESC';
  try {
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single movie
app.get('/api/movies/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM movies WHERE movie_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Movie not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add movie (admin)
app.post('/api/movies', authenticate, isAdmin, async (req, res) => {
  const { movie_title, genre, duration, release_date, description, poster_url } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO movies (movie_title, genre, duration, release_date, description, poster_url) VALUES (?,?,?,?,?,?)',
      [movie_title, genre, duration, release_date, description, poster_url]
    );
    res.json({ message: 'Movie added', movie_id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update movie (admin)
app.put('/api/movies/:id', authenticate, isAdmin, async (req, res) => {
  const { movie_title, genre, duration, release_date, description, poster_url } = req.body;
  try {
    await pool.query(
      'UPDATE movies SET movie_title=?, genre=?, duration=?, release_date=?, description=?, poster_url=? WHERE movie_id=?',
      [movie_title, genre, duration, release_date, description, poster_url, req.params.id]
    );
    res.json({ message: 'Movie updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete movie (admin)
app.delete('/api/movies/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM movies WHERE movie_id = ?', [req.params.id]);
    res.json({ message: 'Movie deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get genres
app.get('/api/genres', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT genre FROM movies');
    res.json(rows.map(r => r.genre));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// SHOWTIME ROUTES
// ══════════════════════════════════════════════

// Get showtimes for a movie
app.get('/api/showtimes/:movie_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM showtimes WHERE movie_id = ? AND show_date >= CURDATE() ORDER BY show_date, show_time',
      [req.params.movie_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add showtime (admin)
app.post('/api/showtimes', authenticate, isAdmin, async (req, res) => {
  const { movie_id, show_date, show_time, hall_number, total_seats, price } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO showtimes (movie_id, show_date, show_time, hall_number, total_seats, available_seats, price) VALUES (?,?,?,?,?,?,?)',
      [movie_id, show_date, show_time, hall_number, total_seats, total_seats, price]
    );
    // Generate seats
    const showtimeId = result.insertId;
    const rows = ['A','B','C','D','E','F'];
    const seatInserts = [];
    rows.forEach(row => {
      for (let i = 1; i <= Math.ceil(total_seats / 6); i++) {
        seatInserts.push([showtimeId, `${row}${i}`]);
      }
    });
    if (seatInserts.length > 0) {
      await pool.query('INSERT INTO seats (showtime_id, seat_number) VALUES ?', [seatInserts]);
    }
    res.json({ message: 'Showtime added', showtime_id: showtimeId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete showtime (admin)
app.delete('/api/showtimes/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM showtimes WHERE showtime_id = ?', [req.params.id]);
    res.json({ message: 'Showtime deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// SEATS ROUTES
// ══════════════════════════════════════════════

// Get seats for a showtime
app.get('/api/seats/:showtime_id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM seats WHERE showtime_id = ? ORDER BY seat_number',
      [req.params.showtime_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// BOOKING ROUTES
// ══════════════════════════════════════════════

// Create booking
app.post('/api/bookings', authenticate, async (req, res) => {
  const { showtime_id, seat_numbers } = req.body;
  if (!showtime_id || !seat_numbers || seat_numbers.length === 0)
    return res.status(400).json({ error: 'Showtime and seats are required' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Get showtime price
    const [[showtime]] = await conn.query('SELECT * FROM showtimes WHERE showtime_id = ?', [showtime_id]);
    if (!showtime) throw new Error('Showtime not found');

    // Check seats availability
    const [takenSeats] = await conn.query(
      'SELECT seat_number FROM seats WHERE showtime_id = ? AND seat_number IN (?) AND is_booked = TRUE',
      [showtime_id, seat_numbers]
    );
    if (takenSeats.length > 0)
      throw new Error(`Seats already booked: ${takenSeats.map(s => s.seat_number).join(', ')}`);

    // Mark seats as booked
    await conn.query(
      'UPDATE seats SET is_booked = TRUE WHERE showtime_id = ? AND seat_number IN (?)',
      [showtime_id, seat_numbers]
    );

    // Update available seats
    await conn.query(
      'UPDATE showtimes SET available_seats = available_seats - ? WHERE showtime_id = ?',
      [seat_numbers.length, showtime_id]
    );

    // Create booking
    const totalPrice = showtime.price * seat_numbers.length;
    const [result] = await conn.query(
      'INSERT INTO bookings (user_id, showtime_id, seat_numbers, total_price) VALUES (?,?,?,?)',
      [req.user.user_id, showtime_id, seat_numbers.join(','), totalPrice]
    );

    await conn.commit();
    res.json({ message: 'Booking confirmed!', booking_id: result.insertId, total_price: totalPrice });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Get user bookings
app.get('/api/bookings/my', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT b.*, m.movie_title, m.poster_url, s.show_date, s.show_time, s.hall_number, s.price
       FROM bookings b
       JOIN showtimes s ON b.showtime_id = s.showtime_id
       JOIN movies m ON s.movie_id = m.movie_id
       WHERE b.user_id = ?
       ORDER BY b.booking_date DESC`,
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel booking
app.put('/api/bookings/:id/cancel', authenticate, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[booking]] = await conn.query('SELECT * FROM bookings WHERE booking_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
    if (!booking) throw new Error('Booking not found');
    if (booking.status === 'cancelled') throw new Error('Already cancelled');

    const seatList = booking.seat_numbers.split(',');
    await conn.query('UPDATE seats SET is_booked=FALSE WHERE showtime_id=? AND seat_number IN (?)', [booking.showtime_id, seatList]);
    await conn.query('UPDATE showtimes SET available_seats=available_seats+? WHERE showtime_id=?', [seatList.length, booking.showtime_id]);
    await conn.query('UPDATE bookings SET status="cancelled" WHERE booking_id=?', [booking.booking_id]);

    await conn.commit();
    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ══════════════════════════════════════════════
// ADMIN ROUTES
// ══════════════════════════════════════════════

// Dashboard stats
app.get('/api/admin/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const [[{ total_users }]] = await pool.query('SELECT COUNT(*) as total_users FROM users WHERE role="user"');
    const [[{ total_movies }]] = await pool.query('SELECT COUNT(*) as total_movies FROM movies');
    const [[{ total_bookings }]] = await pool.query('SELECT COUNT(*) as total_bookings FROM bookings WHERE status="confirmed"');
    const [[{ revenue }]] = await pool.query('SELECT COALESCE(SUM(total_price),0) as revenue FROM bookings WHERE status="confirmed"');
    const [recent] = await pool.query(
      `SELECT b.booking_id, u.name, m.movie_title, b.seat_numbers, b.total_price, b.booking_date, b.status
       FROM bookings b JOIN users u ON b.user_id=u.user_id
       JOIN showtimes s ON b.showtime_id=s.showtime_id
       JOIN movies m ON s.movie_id=m.movie_id
       ORDER BY b.booking_date DESC LIMIT 10`
    );
    res.json({ total_users, total_movies, total_bookings, revenue, recent_bookings: recent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all users (admin)
app.get('/api/admin/users', authenticate, isAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user (admin)
app.delete('/api/admin/users/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE user_id = ? AND role != "admin"', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🎬 Server running on http://localhost:${PORT}`));
