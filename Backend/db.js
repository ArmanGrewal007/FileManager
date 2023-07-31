
////////////////////////    METHODS FOR USER LOG IN / SIGN IN   //////////////////////////////
// client/or pool of clients is already defined in db_in
const bcrypt = require('bcrypt');
const client = require('./db_init');

// I assume client is already connected here ????

/**
 * Register a new user
 * @param {*} username 
 * @param {*} email 
 * @param {*} password 
 * @returns boolean
 */
async function registerUser(username, email, password) {
  try {
    // Hash the password before storing it in the database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user data into the database
    const query = 'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)';
    const values = [username, email, hashedPassword];
    await client.query(query, values);
    return true; // Registration successful
  } catch (error) {
    console.error('Error registering user:', error.message);
    return false; // Registration failed
  }
}
exports.registerUser = registerUser


/**
 * Loggin in user
 * @param {*} username 
 * @param {*} password 
 * @returns boolean
 */
async function loginUser(username, password) {
  try {
    // Fetch the user from the database by username
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await client.query(query, [username]);

    if (result.rowCount === 0) {
      return { success: false, message: 'User not found' };
    }

    // Compare the provided password with the stored hashed password
    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return { success: false, message: 'Incorrect password' };
    }
    return { success: true, user: user };
  } catch (error) {
    console.error('Error logging in:', error.message);
    return { success: false, message: 'Login failed' };
  }
}
exports.loginUser = loginUser


// Function to showusers as JSON
async function showUsers(){
  try {
    const query = 'SELECT * FROM users';
    const output = client.query(query);
    return output;
  } catch (error) {
    console.error('Some error occured: ', error.message);
    return {success: false, message: "Can't fetch from users db"}
  }
}
exports.showUsers = showUsers


// Function to deleteUser 
async function deleteUserByName(username){
  try {
    const query = 'DELETE FROM users WHERE username = $1';
    const result = await client.query(query, [username]);

    if (result.rowCount === 0) { // If any rows were affected ?
      return { success: false, message: 'User not found' };
    }
    return { success: true, message: 'User deleted successfully' };
  } catch (error) {
    console.error('Some error occured: ', error.message);
    return {success: false, message: `Can't delete ${username} from db`}
  }
}
exports.deleteUserByName = deleteUserByName


// // Function to reset a user's password
// export async function resetPassword(username, newPassword) {
//   try {
//     // Hash the new password before updating it in the database
//     const hashedPassword = await bcrypt.hash(newPassword, 10);

//     // Update the user's password in the database
//     const query = 'UPDATE users SET password = $1 WHERE username = $2';
//     await client.query(query, [hashedPassword, username]);
//     return true; // Password reset successful
//   } catch (error) {
//     console.error('Error resetting password:', error.message);
//     return false; // Password reset failed
//   }
// }

process.on('exit', () => {
  client.end();
});


