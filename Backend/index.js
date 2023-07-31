// Import necessary modules
require('dotenv').config()
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const ejs = require('ejs');
const session = require('express-session');
// For user loggin/signing
const client = require('./db_init');
const db = require('./db');
// For file uploads
const multer = require('multer');
const fs = require('fs');
const AWS = require('aws-sdk');
const file_manager = require('./file_manager');

// Create an app and specify port
const app = express();
const port = 3000;

// Set up the session middleware
app.use(session({
    secret: 'huhuhaha',
    resave: false,
    saveUninitialized: true
}));
// Express 4.6+ doesn't require body-parser middleware
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"))

//--------------------------------/  USER LOGIN ENDPOINTS   /--------------------------------//
// API endpoint for user registration
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const registrationResult = await db.registerUser(username, email, password);

    if (registrationResult) {
        req.session.username = username // Save the username in session
        res.redirect('/interface');
    } else {
        res.redirect(`/register?error=Registration failed`);
    }
});

// API endpoint for user login 
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const loginResult = await db.loginUser(username, password);

    if (loginResult.success) {
        req.session.username = username // Save the username in session
        res.redirect('/interface');
    } else {
        res.redirect(`/login?error=${loginResult.message}`);
    }
});

// Middleware to check if the user is authenticated (logged in)
const isAuthenticated = (req, res, next) => {
    // Exclude /login, /signup and debugging routes from authentication
    if (['/login', '/register', '/users', '/folder-v', '/file-v', '/list', '/'].includes(req.path)) {
        return next();
    }
    if (req.session.username) {
        // User is authenticated, set the username in res.locals for availability in all views
        res.locals.username = req.session.username;
        return next();
    } else {
        // User is not authenticated, redirect to login page 
        res.redirect('/login');
    }
};
// Use the isAuthenticated middleware for all routes except /login and /signup
app.use(isAuthenticated);

// Serve the registration form
app.get('/register', (req, res) => {
    const errorMessage = req.query.error || '';
    const infoMessage = req.query.info || '';
    res.render(path.resolve('Frontend', 'register.ejs'), { error: errorMessage, info:infoMessage });
});

// Serve the login form
app.get('/login', (req, res) => {
    const errorMessage = req.query.error || '';
    const infoMessage = req.query.info || '';
    res.render(path.resolve('Frontend', 'login.ejs'), { error: errorMessage, info:infoMessage });
});

// Serve the interface
app.get('/interface', async (req, res) => {
    const result = await s3.listObjects({ Bucket: bucket }).promise();
    const fileList = result.Contents.map(item => item.Key);
    // Filter the fileList to include only objects starting with `username/`
    const usernameFiles = fileList.filter(file => file.startsWith(req.session.username + '/'));
    const errorMessage = req.query.error || '';
    const infoMessage = req.query.info || '';
    res.render(path.resolve('Frontend', 'interface.ejs'), { error: errorMessage, info:infoMessage, files:usernameFiles});
});

app.get('/', (req, res) => {
    res.render(path.resolve('Frontend', 'main.ejs'));
})

// API endpoints to Get users
app.get('/users', async (req, res) => {
    const output = await db.showUsers();
    res.send(output)
})

// API endpoint to delete users
app.get('/delete/:username', async (req, res) => {
    const delete_result = await db.deleteUserByName(req.params.username);
    if (delete_result.success) {
        res.json({ message: 'Succesfully deleted', user: delete_result.user });
    } else {
        res.status(401).json({ message: delete_result.message });
    }
})

//--------------------------------/  S3 UPLOADING ENDPOINTS   /--------------------------------//

const bucket = 'fm-bucket';
const region = 'ap-southeast-2';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// Configure AWS SDK
const s3 = new AWS.S3({
    region, accessKeyId, secretAccessKey,
})

// API endpoint for folder upload 
app.post('/folders', async (req, res) => {
    try {
        const { foldername } = req.body;
        const username = req.session.username;
        // We need to confirm same user does not have same folder already
        const not_exists = await file_manager.checkFolder(username, foldername);
        if (!not_exists) { // already created 
            res.redirect(`/interface?error=Folder (${foldername}) already exists`);
            return;
        }
        // Add this folder as username/foldername/ to s3 bucket 
        const folderpath = username + '/' + foldername + '/'
        const params = { Bucket: bucket, Key: folderpath, Body: `${Date.now}-${foldername}` };
        const data = await s3.putObject(params).promise();
        console.log('Folder created successfully:', foldername);
        const etag = data.ETag;
        // Add this folder to folders table
        const result = await file_manager.uploadFolder(username, foldername, etag);
        res.redirect(`/interface?info=${foldername} created`);
    } catch (error) {
        console.error('Error uploading the folder:', error);
    }
})

// API endpoint for subfolder upload 
app.post('/subfolders', async (req, res) => {
    try {
        const { parent_folder_name, sub_folder_name } = req.body;
        const username = req.session.username;

        // Confirm if user has a necessary parent folder ? 
        const not_exists = await file_manager.checkFolder(username, parent_folder_name);
        if (not_exists) { // Not exists? create one first
            res.redirect(`/folders-interface?error=You need to create a parent folder (${parent_folder_name}) first`);
            return;
        }

        // Confirm if user doesnt already have that subfolder inside given folder ?
        const sub_not_exists = await file_manager.checkSubFolder(username, sub_folder_name, parent_folder_name);
        if (!sub_not_exists) { // same subf exists ? 
            res.redirect(`/subfolders-interface?error=${sub_folder_name} already exists in ${parent_folder_name}`);
            return;
        }
        // Add this folder as username/parentfolder/subfolder to s3 bucket
        const folderpath = `${username}/${parent_folder_name}/${sub_folder_name}/`;
        const params = { Bucket: bucket, Key: folderpath, Body: `${Date.now}-${sub_folder_name}` };
        const data = await s3.putObject(params).promise();
        console.log('Folder created successfully:', sub_folder_name);
        const etag = data.ETag;
        // Add this to folders table
        const result = await file_manager.uploadFolder(username, sub_folder_name,
            etag, parent_folder_name);
        res.redirect(`/interface?info=${parent_folder_name}/${sub_folder_name} created`);
    } catch (error) {
        console.error('Error uploading the subfolder:', error);
    }
})

// multer middleware to temporarily store file 
// (First we need to verify then upload it)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        return cb(null, 'Backend/uploads');
    },
    filename: (req, file, cb) => {
        // No need to make it unique, as we will be removing it
        // from uploads/ after sending it to s3 bucket
        return cb(null, file.originalname);
    },
})
const upload = multer({storage});

app.post('/files', upload.single('uploadhere'), async (req, res) => {
    // console.log(req.file);
    // console.log("Successfuly uploaded at ", req.file.location)
    try {
        const { parent_folder_name, sub_folder_name, file_name } = req.body;
        const username = req.session.username;
        let folder_path = username + '/';
        let curr_final_folder_name = null;
        if(parent_folder_name){ // User has given a parent folder
            // Confirm if user has a necessary parent folder ? 
            const not_exists = await file_manager.checkFolder(username, parent_folder_name);
            if (not_exists) { // Not exists? create one first
                res.redirect(`/files-interface?error=Parent folder (${parent_folder_name}/) does not exist`);
                return;
            } else { // folder exists, so we update the path
                folder_path += parent_folder_name + '/';
                curr_final_folder_name = parent_folder_name; // Currently this is our final folder
            }
            if(sub_folder_name){ // User has also given a subfolder 
                // Confirm if user has necessary subfolder ?
                const sub_not_exists = await file_manager.checkSubFolder(username, sub_folder_name, parent_folder_name);
                if (sub_not_exists) { // Not exists ? create one first 
                    res.redirect(`/files-interface?error=${sub_folder_name}/ does not exist in ${parent_folder_name}/`);
                    return;
                } else { // Subfolder exists, so we update path
                    folder_path += sub_folder_name + '/';
                    curr_final_folder_name = sub_folder_name; // Update curr final folder
                }
            }
        } else if(sub_folder_name) { // Only subfolder name given
            res.redirect(`/files-interface?error=You have given a subfolder name, but no parent folder name !/`);
            return;
        }
        // This is the final file_name
        const final_file_name = !file_name ? req.file.originalname : file_name;
        // Confirm if user doesnt already have that file inside given subfolder ?
        const file_not_exists = await file_manager.checkFile(final_file_name, username, curr_final_folder_name );
        if (!file_not_exists) { // same file exists ? 
            if(curr_final_folder_name){
                res.redirect(`/files-interface?error=${final_file_name} already exists in ${curr_final_folder_name}`);
                return;
            }
            res.redirect(`/files-interface?error=${final_file_name} already exists at root level`);
            return;
        }
        // This is final folder_path 
        folder_path +=  final_file_name; 
        const upload_stored_path = path.resolve('Backend/uploads', req.file.originalname)
        const filecontent = fs.createReadStream(upload_stored_path);
        // upload file to s3 bucket with its content --> 
        const params = { Bucket: bucket, Key: folder_path, Body: filecontent };
        const data = await s3.putObject(params).promise();
        console.log('File uploaded successfully to...', folder_path);
        const etag = data.ETag;
        const file_stats = fs.statSync(upload_stored_path);
        const size = file_stats.size;
        // Add this to files table 
        const result = await file_manager.uploadFile(final_file_name, username, size,
                                                     etag, curr_final_folder_name);        
        res.redirect(`/interface?info=File ${final_file_name} successfuly uploaded`);
    } catch (error) {
        console.log("Error while uploading file: ", error);
    } finally {
        // Remove the file from s3 bucket, which had to be added
        const stored_path = path.resolve('Backend/uploads', req.file.originalname)
        fs.unlink(stored_path, (err) => {
            if (err) console.error('Error while deleting the file:', err);
            else console.log('File has been successfully removed from disk storage.');
          });
    }
})

// Serving necessary sub-interfaces
app.get('/folders-interface', (req, res) => {
    const errorMessage = req.query.error || '';
    const infoMessage = req.query.info || '';
    res.render(path.resolve('Frontend', 'folderupload.ejs'), { error: errorMessage, info:infoMessage });
})
app.get('/subfolders-interface', (req, res) => {
    const errorMessage = req.query.error || '';
    const infoMessage = req.query.info || '';
    res.render(path.resolve('Frontend', 'subfolderupload.ejs'), { error: errorMessage, info:infoMessage });
})
app.get('/files-interface', (req, res) => {
    const errorMessage = req.query.error || '';
    const infoMessage = req.query.info || '';
    res.render(path.resolve('Frontend', 'fileupload.ejs'), { error: errorMessage, info:infoMessage });
})
// API endpoints to Get folders and files 
app.get('/folder-v', async (req, res) => {
    const output = await file_manager.showFolders();
    res.send(output)
})
app.get('/file-v', async (req, res) => {
    const output = await file_manager.showFiles();
    res.send(output)
})
// API endpoint to list files on from s3
app.get('/list', async (req, res) => {
    const result = await s3.listObjects({ Bucket: bucket }).promise();
    const response = result.Contents.map(item => item.Key);
    res.send(response);
})

//--------------------------------/  FILE MANAGEMENT ENDPOINTS   /--------------------------------//

// API endpoint for deleting files (s3.deleteObject)
app.post('/filedel', async (req, res) => {
    try {
        const { filename, parent_folder_name } = req.body;
        const username = req.session.username;
        const split_folders = parent_folder_name.split('/')
        const immediate_folder_name = split_folders[split_folders.length - 1];
        // Confirm if user has a necessary parent folder ? 
        const not_exists = await file_manager.checkFolder(username, immediate_folder_name);
        if (not_exists) { // Not exists? create one first
            res.redirect(`/interface?error=You need to create a parent folder (${immediate_folder_name}) first`);
            return;
        }
        // Check if file exists in that parent_folder ?
        const file_not_exists = await file_manager.checkFile(filename, username, immediate_folder_name );
        if (file_not_exists) { // file  deosnt exist ? 
            res.redirect(`/interface?error=${filename} does not exist in folder(${immediate_folder_name})`);
            return;
        }
        const filepath = username + "/" + parent_folder_name + "/" + filename;
        console.log("immediate folder is", immediate_folder_name);
        // delete that file 
        const data = await s3.deleteObject({Bucket:bucket, Key:filepath}).promise();
        console.log("Deleted successfully");
        // Also delete from postgresql table
        const result = await file_manager.deleteFile(filename, username, immediate_folder_name);
        res.redirect(`/interface?info=${filename} successfuly deleted`);
    } catch (error) {
        console.log("Error while deleting file", error);
    }
})

// API endpoint for renaming files (s3.copyObject and then delete prev)
app.post("/fileren", async (req, res) => {
    try {
        const { old_filename, parent_folder_path, new_filename} = req.body;
        const username = req.session.username;
        const split_folders = parent_folder_path.split('/')
        const immediate_folder = split_folders[split_folders.length - 1];
        // Confirm if user has a necessary parent folder ? 
        const not_exists = await file_manager.checkFolder(username, immediate_folder);
        if (not_exists) { // Not exists? create one first
            res.redirect(`/interface?error=There is no folder (${immediate_folder})`);
            return;
        }
        // Check if file exists in that parent_folder ?
        const file_not_exists = await file_manager.checkFile(old_filename, username, immediate_folder );
        if (file_not_exists) { // file  deosnt exist ? 
            res.redirect(`/interface?error=${old_filename} does not exist in folder(${immediate_folder})`);
            return;
        }
        // Check if new_file doesnt already exists in that folder ? 
        const file_not_exists_new = await file_manager.checkFile(new_filename, username, immediate_folder );
        if (!file_not_exists_new) { // file  already exists ? 
            res.redirect(`/interface?error=${new_filename} already exists in folder(${immediate_folder})`);
            return;
        }
        const filepath_old = username + "/" + parent_folder_path + "/" + old_filename;
        // IDK why we have to add /bucket prefix for copying, but it needed tremendous effort to find (crying)
        const filepath_old_for_copy = "/" + bucket + "/" + filepath_old
        const filepath_new = username + "/" + parent_folder_path + "/" + new_filename;
        // console.log(filepath_old)
        // console.log(filepath_new)
        // // Rename = make a copy and delete old one
        const data_new     = await s3.copyObject({Bucket:bucket, CopySource:filepath_old_for_copy, Key:filepath_new}).promise();
        const data_deleted = await s3.deleteObject({Bucket:bucket, Key:filepath_old}).promise();
        // Also need to update files 
        const result = await file_manager.renameFile(old_filename, new_filename, username, immediate_folder);
        res.redirect(`/interface?info=${old_filename} now renamed to ${new_filename}`);

    } catch (error) {
        console.log("Error while renaming file", error);
    }
})

// API endpoint for moving files (s3.copyObject to another location and then delete prev)
// NOTE - WE HAVE THIS FLEXIBILITY HERE THAT SOURCE AND TARGET FOLDERS CAN BE SAME, 
// SO THIS UTILITY CAN ALSO BEHAVE LIKE RENAMING UTILITY
app.post('/filemove', async (req, res) => {
    try {
        const { filename, old_folder_path, new_folder_path } = req.body;
        const username = req.session.username;
        const split_folders_old = old_folder_path.split('/')
        const immediate_folder_old = split_folders_old[split_folders_old.length - 1];
        const split_folders_new = new_folder_path.split('/')
        const immediate_folder_new = split_folders_new[split_folders_new.length - 1];
        // Confirm if user has a necessary old folder ? 
        const not_exists_old = await file_manager.checkFolder(username, immediate_folder_old);
        if (not_exists_old) { // Not exists? create one first
            res.redirect(`/interface?error=There is no source folder (${immediate_folder_old})`);
            return;
        }
        // Check if file exists in that old_folder ?
        const file_not_exists_old = await file_manager.checkFile(filename, username, immediate_folder_old );
        if (file_not_exists_old) { // file  deosnt exist ? 
            res.redirect(`/interface?error=${filename} does not exist in folder(${immediate_folder_old})`);
            return;
        }
        // Confirm if user has a necessary new folder ? 
        const not_exists_new = await file_manager.checkFolder(username, immediate_folder_new);
        if (not_exists_new) { // Not exists? create one first
            res.redirect(`/interface?error=There is no target folder (${immediate_folder_new})`);
            return;
        }
        // Check if new_file doesnt already exists in that folder ? 
        const file_not_exists_new = await file_manager.checkFile(filename, username, immediate_folder_new );
        if (!file_not_exists_new) { // file  already exists ? 
            res.redirect(`/interface?error=${filename} already exists in folder(${immediate_folder_new})`);
            return;
        }
        // See the similarities with rename function ?? 
        const filepath_old = username + "/" + old_folder_path + "/" + filename;
        const filepath_old_for_copy = "/" + bucket + "/" + filepath_old;
        const filepath_new = username + "/" + new_folder_path + "/" + filename;
        // Rename = make a copy in new place and delete old one
        const data_new     = await s3.copyObject({Bucket:bucket, CopySource:filepath_old_for_copy, Key:filepath_new}).promise();
        const data_deleted = await s3.deleteObject({Bucket:bucket, Key:filepath_old}).promise();
        // Also need to update files table
        const result = await file_manager.moveFile(filename, username, immediate_folder_old, immediate_folder_new);
        res.redirect(`/interface?info=${filename} moved from ${old_folder_path} to ${new_folder_path}`);

    } catch (error) {
        console.log("Error while moving file", error);
    }
})
// Serve necessasry sub-interfaces 
app.get('/files-delete', (req, res) => {
    const errorMessage = req.query.error || '';
    const infoMessage = req.query.info || '';
    res.render(path.resolve('Frontend', 'fileDelete.ejs'), { error: errorMessage, info:infoMessage });
})
app.get('/files-rename', (req, res) => {
    const errorMessage = req.query.error || '';
    const infoMessage = req.query.info || '';
    res.render(path.resolve('Frontend', 'fileRename.ejs'), { error: errorMessage, info:infoMessage });
})
app.get('/files-move', (req, res) => {
    const errorMessage = req.query.error || '';
    const infoMessage = req.query.info || '';
    res.render(path.resolve('Frontend', 'fileMove.ejs'), { error: errorMessage, info:infoMessage });
})
// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
