# FileManager

File-Manager app using `Node.js` + `Express.js` in backend (and bootstrapCSS + ejs in frontend😅) which sends file to a private `AWS S3 bucket`. Also maintains a `PostgreSQL` database side by side, for storing metadata and validation of file/folder uploads.

![Watch the video](https://img.youtube.com/vi/gcfDvRSu0qk/hqdefault.jpg)](https://www.youtube.com/embed/gcfDvRSu0qk)


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
    5. bucket name is - `fm-bucket` and region name is - `ap-southeast-2`
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
Has user logging and registering functionalities <br>
Functions --> <br>
- `register_user(username, email, password)` Registers the user by adding it to *users* table <br>
- `login_user(username, password)` Logs the user in by confirming its username and matching provided password with password from *users* table
<br>
- `showUsers()` Debugging function to SELECT * FROM users. 

#### 3. file_manager.js
**LOGIC :** <br>
> **🤔One user cannot create folder with same name twice., but two users can create folders with same names.**
 
*HOW I DID IT?* 👉 In s3 bucket, give all users their individual "home" folders (username arman will have a "arman/" folder), and add folders inside them ("arman/myfolder") and after succesful folder creation, add the foldername, username etc. to *folders* table. Also note that s3 allows user to upload same named objects again and again, and overwrites them. To prevent that we do a SQL query on our *folder* table to check if user has not already created folder with same name and then put the object on s3! <br>

> **🤔One user cannot create subfolder with same name inside a folder, but he can create subfolders with same name inside different folders**

*HOW I DID IT?* 👉 Similar to above approach we first check using SQL query if there isn't already a "folder", created by "user" and has same "parent folder" too. If all checks pass, put the object to s3 bucket, and later update the *folders* table too <br>

> **🤔One user cannot create file with same name inside a folder, but he can create a file with same name in different folders.** 

*HOW I DID IT?* 👉 Exact same approach, how files are to subfolders is analogous to how subfolders are to folders <br>

> **🤔User can create file without any folders** 

*HOW I DID IT?* 👉 parent_folder property of *files* table can also be <code>null</code>, and put the file directly in root folder "username/" <br>

Functions --> <br>
- `checkFolder(username, foldername)` Returns false if given "username" has already created a "foldername" <br>
- `checkSubFolder(username, sub_folder_name, parent_folder_name)` Returns false if "username" has already created a "parent_folder_name/sub_folder_name" <br>
- `checkFile(filename, username, sub_folder_name=null)` Returns false if "username" has already created a "sub_folder_name/filename". If sub_folder_name=null, we are in root directory, and we can't have same named files there too! <br>
- `uploadFolder(username, foldername, etag, parent_folder=null)` Update the *folders* table by uploading folder to it.<br>
- `uploadFile(filename, username, size, etag, sub_folder_name=null)` Update the *files* table by uploading file to it.<br>
- `deleteFile(filename, username, sub_folder_name=null)` Delete the "filename" uploaded by "username" in folder "sub_folder_name" <br>
- `renameFile(old_filename, new_filename, username, sub_folder_name)` Rename "old_filename" to "new_filename" <br>
- `moveFile(filename, username, old_folder, new_folder)` Moves file from "old_folder" to "new_folder" <br>
- `showFolders()` Debugging function to SELECT * FROM folders. <br>
- `showFiles()` Debugging function to SELECT * FROM files.  <br>

#### 4. index.js

This is our main JavaScript file, which inherits all the methods defined in previous files and calls them.

List of packages used --> <br>
- `express` Express.js to handle routing
- `multer` For taking files as input, and storing them temporarily in "uploads/" folder
- `path` To obtain absolute paths of files, for hosting them. Also used to find where multer has stored files temporarily, so that now they can be uploaded to s3 bucket
- `AWS.S3` To put the object on s3 bucket 

List of middleware used --> <br>
- `express-session` To setup a session and a variable req.session.username in it.
- `isAuthenticated()` Custom middleware for authentication. User can not enter subsequent routes, unless he is logged in
- `express.json()` Alternative to body-parser, so that we can extract data from HTML forms
- `morgan` For debugging puposes

List of API endpoints --> <br>
- `/register` To register the user and redirect to `/interface`
- `/login` To login the user and redirect to `/interface`
- `/interface` File manager interface that has 6 options - Add folder, subfolder and file, and delete, rename and move file. Also it has a list of files uploaded by currently logged in user (which is dynamically updated).
- `/folders-interface` Interface to input folder name 
- `/folders` To handle folder upload to s3 bucket
- `/subfolders-interface`Interface to input subfolder and parentfolder name 
- `/subfolders` To handle subolder upload to s3 bucket
- `/files-interface` Interface to browse files from local disk 
- `/files` To handle files upload to s3 bucket
- `/files-delete` Interface to delete files
- `/filedel` To handle file deletions from s3 bucket
- `/files-rename` Interface to rename files
- `/fileren` To rename files in s3 bucket
- `/files-move` Interface to move files
- `/filemove` To move files within s3 bucket
- `/users` (Debugger) To show all registered users 
- `/folders-v` (Debugger) To show all created folders
- `/file-v` (Debugger) To show all created files
- `/list` (Debugger) To show all uploaded content on s3 bucket



## Overall workflow -->  
1. User selects registeration interface, inputs username, email and sets a password.
    1. Validation that user is not already registered under the same name is done by SQL queries.
2. User selects login interface, inputs username and password.
    1. Validation that user exists in *users* table
    2. Validation that input password is matched with password_hash in *users* table
3. After Loggin/Registering user is redirected to File Manager Interface
    1. User can see the files/folders he has already uploaded. This list is dynamically updated every time this page is refreshed 
    1. User selects "Add folder", he is redirected to Add a new folder interface.
        1. User can add a new folder and is redirected back to File Manager Interface. Also it has validation checks that same user has not already created same folder
    2. User selects "Add folder", he is redirected to Add a new subfolder interface.
        1. User can add a new subfolder and is redirected back to File Manager Interface. Also it has validation checks that same user has not already created same subfolder inside parentfolder
    3. User selects "Add file", he is redirected to Upload file interface.
        1. User can browse for files in local disk
        2. User can check if he want file to contain original name, or should he give it a new name
        3. User can select the path where that file should be uploaded. Also it has validation checks that those folders and subfolders actually exists in our database
    4. User selects "Delete file", he is reditected to File deletion interface.
        1. User can give filename and path, clicking on delete will delete the file from *files* as well as s3 bucket
    5. User selects "Rename file", he is reditected to File renaming interface.
        1. User can give oldfilename, newfilename and path, clicking on reaname will reanme the file within *files* as well as on s3 bucket
    6. User selects "Move file", he is reditected to File moving interface.
        1. User can give filename, oldpath and new path, clicking on move will move the file to respective folder in s3 bucket, and will also do a respective update of *files* table    

> **WARNING**
> Note that you can only create subfolders inside folders, and can not create sub-subfolders. (Question requirement was only to make folder/subfolder). Although this can be easily achieved, I think we should save it for FileManager v2 😅
