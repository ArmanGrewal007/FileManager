const pkg = require("pg");
const { Client } = pkg;

// ENTER YOUR VALUES HERE
const client = new Client({
  host: 'localhost',
  user: 'postgres',
  password: 'password',
  host: 'localhost',
  port: 5432,
  database: 'file_manager_db',
});
module.exports = client;


// client.query(`SELECT * from users`, (err, res) => {
//   if (err) console.log(err.message);
//   else console.log(res.rows);
//   client.end();
// });

/**
 * Initializing tables - users, folders and files in your provided database.
 * NOTE - run this function only once for table creation
 */
async function initialize_tables() {
  try {
    client.connect();
    const check_connection = `SELECT count(*) AS table_count
                          FROM information_schema.tables
                          WHERE table_schema = 'public';`
    const result = await client.query(check_connection);
    const tableCount = parseInt(result.rows[0].table_count);
    process.stdout.write("Checking if tables are initialized...");
    if (tableCount === 3){
      console.log("Yes, they are.")
    }
    else {
      console.log("Tables are not initialized yet, initializing...");
      const creating_user_table = `CREATE TABLE "users" (
                                        id SERIAL PRIMARY KEY,
                                        username VARCHAR(50) UNIQUE NOT NULL,
                                        email VARCHAR(100) UNIQUE NOT NULL,
                                        password_hash TEXT NOT NULL
                                    );`;
      const creating_folders_table = `CREATE TABLE "folders" (
                                    id SERIAL PRIMARY KEY,
                                    name VARCHAR(100) NOT NULL,
                                    created_by TEXT REFERENCES users(username),
                                    parent_folder INTEGER REFERENCES folders(id) ON DELETE CASCADE,
                                    s3_object_key TEXT NOT NULL,
                                    created_at TIMESTAMPTZ DEFAULT NOW()
                                )`;
      const creating_files_table = `CREATE TABLE "files" (
                                    id SERIAL PRIMARY KEY,
                                    name VARCHAR(100) NOT NULL,
                                    size BIGINT NOT NULL,
                                    uploaded_by TEXT REFERENCES users(username),
                                    parent_folder INTEGER REFERENCES folders(id) ON DELETE CASCADE,
                                    s3_object_key TEXT NOT NULL,
                                    created_at TIMESTAMPTZ DEFAULT NOW()
                                )`;
      try {
        await client.query(creating_user_table);
        await client.query(creating_folders_table);
        await client.query(creating_files_table);
      } catch (error) {
        console.log("Error creating tables: ", error.message);
      }
    }
  } catch (error) {
      console.log("Error connecting to databse: ", error.message);
    } finally {
      // client.end();
    }
}

// Check if all 3 tables have been connected ? otherwise connnect them
initialize_tables();

// client.end();