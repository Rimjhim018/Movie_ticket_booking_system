const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'admin123';
  const hash = await bcrypt.hash(password, 10);
  console.log('Password:', password);
  console.log('Generated Hash:', hash);
  console.log('\nCopy this hash and update the database with it!');
}

generateHash();
