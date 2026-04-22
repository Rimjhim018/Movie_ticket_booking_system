require('dotenv').config();
const mysql = require('mysql2/promise');

async function testLogin() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_PORT:', process.env.DB_PORT);
    console.log('DB_NAME:', process.env.DB_NAME);

    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'movie_booking',
      port: process.env.DB_PORT || 3306
    });

    // Test 1: Check if admin exists
    console.log('\n📋 Checking for admin user...');
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', ['admin@cinema.com']);
    
    if (rows.length === 0) {
      console.log('❌ Admin user NOT found in database!');
    } else {
      console.log('✅ Admin user found!');
      console.log('User data:', rows[0]);
    }

    // Test 2: Check all users
    console.log('\n📋 All users in database:');
    const [allUsers] = await pool.query('SELECT user_id, name, email, role FROM users');
    console.log(allUsers);

    // Test 3: Test password
    const bcrypt = require('bcryptjs');
    if (rows.length > 0) {
      console.log('\n🔐 Testing password...');
      const passwordToTest = 'admin123';
      const passwordHash = rows[0].password;
      const match = await bcrypt.compare(passwordToTest, passwordHash);
      console.log('Password:', passwordToTest);
      console.log('Hash in DB:', passwordHash);
      console.log('Does password match?', match ? '✅ YES' : '❌ NO');
    }

    process.exit(0);
  } catch(error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testLogin();
