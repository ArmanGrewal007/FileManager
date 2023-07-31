const client = require('./db_init');

/**
 * Returns false if "username" has already created a "foldername"
 * @param {*} username 
 * @param {*} foldername 
 * @returns boolean
 */
async function checkFolder(username, foldername) {
    try {
        const checkFolderQuery = 'SELECT id FROM folders WHERE name = $1 AND created_by = $2';
        const { rowCount } = await client.query(checkFolderQuery, [foldername, username]);
        if (rowCount > 0) {
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error while checking folder:', error);
    }
}

/**
 * Utility to upload folder/subfolder to postgreql
 * @param {*} username 
 * @param {*} foldername 
 * @param {*} etag 
 * @param {*} parent_folder 
 * @returns 
 */
async function uploadFolder(username, foldername, etag, parent_folder=null) {
    try{
        let parent_folder_id = null;
        if(parent_folder){ // We have already confirmed that parent folder exists ! 
            const extract_parent_id = `SELECT id FROM folders WHERE name=$1`;
            const output = await client.query(extract_parent_id, [parent_folder]);
            parent_folder_id = output.rows[0].id;
        }
        const insertQuery = `INSERT INTO folders 
                             (name, created_by, parent_folder, s3_object_key)
                             VALUES ($1, $2, $3, $4)`
        const values = [foldername, username, parent_folder_id, etag];
        const result = await client.query(insertQuery, values);
        if(result.rowCount === 1)
            return true; 
        return false;
    }catch(error){
        console.error('Error while adding to folders table:', error);
    }
}

/**
 * Utility to check if "username" hasn't already created "parent_folder_name"/"sub_folder_name"
 * @param {*} username 
 * @param {*} sub_folder_name 
 * @param {*} parent_folder_name 
 * @returns 
 */
async function checkSubFolder(username, sub_folder_name, parent_folder_name){
    try{ // We have already confirmed that parent_folder_name exists
        // Query to extract parent_folder's id from its name
        const extract_parent_id = `SELECT id FROM folders WHERE name=$1`; 
        const output = await client.query(extract_parent_id, [parent_folder_name]);
        const parent_folder_id = output.rows[0].id;
        // Query to check if same subfolder exists in folder, and is created by username
        const checkFolderQuery = `SELECT id FROM folders WHERE name = $1 
                                   AND created_by = $2 AND parent_folder = $3`;
        const result = await client.query(checkFolderQuery, [sub_folder_name, username, parent_folder_id]);
        if(result.rowCount > 0)
            return false; 
        return true;
    } catch (error){
        console.log("Error while checking subfolder", error);
    }
}

/**
 * Utitlity to check if file doesn't already exists in that folder
 * @param {*} filename 
 * @param {*} username 
 * @param {*} sub_folder_name 
 * @returns 
 */
async function checkFile(filename, username, sub_folder_name=null){
    try { // Already checked that folders and subfolders exist
        // Query to extract sub_folder's id from its name
        let sub_folder_id = null;
        if(sub_folder_name){
            const extract_sub_id = `SELECT id FROM folders WHERE name=$1`; 
            const output = await client.query(extract_sub_id, [sub_folder_name]);
            sub_folder_id = output.rows[0].id;
        }
        // Query to check if same file exists in subfolder, and is created by username
        const checkFileQuery = `SELECT id FROM files WHERE name = $1 
                                   AND uploaded_by = $2 AND parent_folder = $3`;
        const result = await client.query(checkFileQuery, [filename, username, sub_folder_id]);
        // console.log("result is: ", result);
        if(result.rowCount > 0)
            return false; 
        return true;
    } catch (error) {
        console.log("Error while checking file", error);
    }
}

/**
 * Utility to upload subfolder/file to postgresql
 * @param {*} filename 
 * @param {*} username 
 * @param {*} size
 * @param {*} etag 
 * @param {*} sub_folder_name 
 */
async function uploadFile(filename, username, size, etag, sub_folder_name=null){
    try {
        let sub_folder_id = null;
        if(sub_folder_name){ // We have already confirmed that sub folder exists ! 
            const extract_sub_id = `SELECT id FROM folders WHERE name=$1`;
            const output = await client.query(extract_sub_id, [sub_folder_name]);
            sub_folder_id = output.rows[0].id;
        }
        const insertQuery = `INSERT INTO files 
                             (name, size, uploaded_by, parent_folder, s3_object_key)
                             VALUES ($1, $2, $3, $4, $5)`
        const values = [filename, size, username, sub_folder_id, etag];
        const result = await client.query(insertQuery, values);
        if(result.rowCount === 1)
            return true; 
        return false;
    } catch (error) {
        console.error('Error while adding to files table:', error);
    }
}

/**
 * Utility to delete file with specific parent folder and username
 * @param {*} filename 
 * @param {*} username 
 * @param {*} sub_folder_name 
 * @returns 
 */
async function deleteFile(filename, username, sub_folder_name=null){
    try {
        let sub_folder_id = null;
        if(sub_folder_name){ // We have already confirmed that sub folder exists ! 
            const extract_sub_id = `SELECT id FROM folders WHERE name=$1`;
            const output = await client.query(extract_sub_id, [sub_folder_name]);
            sub_folder_id = output.rows[0].id;
        }
        const deleteQuery = `DELETE FROM files WHERE name=$1 AND uploaded_by=$2 AND parent_folder=$3`
        const values = [filename, username, sub_folder_id];
        const result = await client.query(deleteQuery, values);
        if(result.rowCount === 1)
            return true; 
        return false;
    } catch (error) {
        console.error('Error while deleting from files table:', error);
    }
}
/**
 * Renames old_filename --> new_filename
 * @param {*} old_filename 
 * @param {*} new_filename 
 * @param {*} username 
 * @param {*} sub_folder_name 
 * @returns 
 */
async function renameFile(old_filename, new_filename, username, sub_folder_name){
    try {
        let sub_folder_id = null;
        if(sub_folder_name){ // We have already confirmed that sub folder exists ! 
            const extract_sub_id = `SELECT id FROM folders WHERE name=$1`;
            const output = await client.query(extract_sub_id, [sub_folder_name]);
            sub_folder_id = output.rows[0].id;
        }
        const renameQuery = `UPDATE files SET name=$1 WHERE name=$2 AND uploaded_by=$3 AND parent_folder=$4`
        const values = [new_filename, old_filename, username, sub_folder_id];
        const result = await client.query(renameQuery, values);
        if(result.rowCount === 1)
            return true; 
        return false;
    } catch (error) {
        console.error('Error while renaming from files table:', error);
    }
}

async function moveFile(filename, username, old_folder=null, new_folder=null){
    try {
        let old_folder_id = null;
        if(old_folder){ // We have already confirmed that old folder exists ! 
            const extract_old_id = `SELECT id FROM folders WHERE name=$1`;
            const output = await client.query(extract_old_id, [old_folder]);
            old_folder_id = output.rows[0].id;
        }
        let new_folder_id = null;
        if(new_folder){ // We have already confirmed that new folder exists ! 
            const extract_new_id = `SELECT id FROM folders WHERE name=$1`;
            const output = await client.query(extract_new_id, [new_folder]);
            new_folder_id = output.rows[0].id;
        }
        const moveQuery = `UPDATE files SET parent_folder=$1 WHERE name=$2 AND uploaded_by=$3 AND parent_folder=$4`
        const values = [new_folder_id, filename, username, username, old_folder_id];
        const result = await client.query(moveQuery, values);
        if(result.rowCount === 1)
            return true; 
        return false;
    } catch (error) {
        console.error('Error while moving within files table:', error);
    }
}

async function showFolders() {
    try {
        const query = 'SELECT * FROM folders';
        const output = client.query(query);
        return output;
    } catch (error) {
        console.error('Some error occured: ', error.message);
        return { success: false, message: "Can't fetch from folders db" }
    }
}

async function showFiles() {
    try {
        const query = 'SELECT * FROM files';
        const output = client.query(query);
        return output;
    } catch (error) {
        console.error('Some error occured: ', error.message);
        return { success: false, message: "Can't fetch from files db" }
    }
}

module.exports = {
    checkFolder, uploadFolder, showFolders, showFiles, checkSubFolder,
    uploadFile, checkFile, deleteFile, renameFile, moveFile
};