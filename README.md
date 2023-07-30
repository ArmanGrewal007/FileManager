# FileManager

File-Manager app using `Node.js` + `Express.js` in backend which sends file to a private `AWS S3 bucket`.

## 🚀 How to run?

1. Clone the repo to your local machine.
2. `Node.js` and `npm` must be installed.
3. Open your project in VSCode for better experience.
4. Run `npm install` to install all necessary modules
5. `awscli` must be installed to setup AWS environment variables with ease (*recommended*)
    1. For mac run - `brew install awscli`
    2. For windows you have to install it from [AWS official website](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
    3. After installing run `aws configure` in VSCode's terminal and specify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, which can be obtained from **`Backend/.env`** file.
    4. Alternatively you can `export AWS_ACCESS_KEY_ID="id_provided_there"` and `export AWS_ACCESS_KEY_ID="id_provided_there"` in the VSCode's terminal, if you don't want to use AWS' cli.
6. `pgadmin 4` (PostgreSQL GUI) should be installed and should have a server and a database on it. One must go to **`Backend/db_init.js`** and configure your database first. (Note: App will create the tables itself, one only needs to setup the database)
7.  App is ready to run (by default on [https://localhost:3000](http://localhost:3000/)) --> run the command `npm start` to fire up 🚀

> **NOTE**
About AWS S3 credentials - *I have setup the AccessKey and SecretAccessKey using custom IAM policy, they provide limited flexibility (enough for this small project), and key will expire on Aug 16, 2023 EOD (UTC timezone)*

##  🛠 App structure

App structure is bifurcated into Fronted and Backend folders.

### Frontend 
It contains several HTML files, i.e. all the files served using our backend. <br>
I haven't used any frontend library, maybe will update it in future ✔

### Backend 
It contains all necessary JavaScript files, that maintain all the functionality.

### Basic overview of all contents 

| Sr no. | File/Folder name | Description |
| -- | -- | -- |
| 1 | **db_init.js** | PostgresSQL database setup and tables initialization |
| 2 | **db.js** | All methods related to user login/register (*users* table) |
| 3 | **file_manager.js** | All methods related to *folders* and *files* tables |
| 4 | **index.js** | Main file that contains all necessary API endpoints | 
| 5 | **.env** | Environment variable configuration file | 
| 6 | **uploads/** | Folder which stores files temporarily (for validation checks) before pushing them to s3 bucket |

### Detailed overview of all contents 

#### 1. db_init.js 

Uses the `pg` package to setup connection to our database. <br>
We have 3 tables in our database - 
<table>
<tr><th colspan="4" align="center"> users </th></tr>
<tr><th> id </th> <th> username </th> <th> email </th> <th> password_hash </th> </tr> 
<tr><td> user id </td><td> Registered user </td><td> Email of that user </td><td> Hashed password of that user (using bcrypt) </td> </tr>
</table>

<table>
<tr><th colspan="6" align="center"> folders </th></tr>
<tr><th> id </th> <th> name </th> <th> created_by </th> <th> parent_foler </th> <th> s3_object_key </th> <th> created_at </th> </tr> 
<tr><td> folder id </td><td> folder name </td><td> Username of user who created that folder </td><td> Parent folder id (<code>null</code> if there is no parent) </td> <td> Unique key to identify object in s3 bucket </td> <td> Timestamp of creation</td> </tr>
</table>

<table>
<tr><th colspan="7" align="center"> files </th></tr>
<tr><th> id </th> <th> name </th> <th> size </th> <th> uploaded_by </th> <th> parent_foler </th> <th> s3_object_key </th> <th> created_at </th> </tr> 
<tr><td> file id </td><td> file name </td> <th> size in bytes </th><td> Username of user who created that file </td><td> Parent folder id (<code>null</code> if there is no parent) </td> <td> Unique key to identify object in s3 bucket </td> <td> Timestamp of creation</td> </tr>
</table>

`initialize_tables()` creates these 3 necessary tables, if they are not already created.

#### 2. db.js 

`register_user(username, email, password)` Registers the user by adding it to *users* table <br>
`login_user(username, password)` Logs the user in by confirming its username and matching provided password with password from *users* table
<br>
`showUsers()` Debugging function to `SELECT * FROM users`.
