# FileManager

File-Manager app using `Node.js` + `Express.js` in backend which sends file to a private `AWS S3 bucket`.

## 🚀 How to run?

1. Clone the repo to your local machine.
1. `Node.js` and `npm` must be installed.
2. Open your project in VSCode for better experience.
3. Run `npm install` to install all necessary modules
5. `awscli` must be installed to setup AWS environment variables with ease (*recommended*)
    1. For mac run - `brew install awscli`
    2. For windows you have to install it from [AWS official website](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
    3. After installing run `aws configure` in VSCode's terminal and specify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, which can be obtained from **`Backend/.env`** file.
    4. Alternatively you can `export AWS_ACCESS_KEY_ID="id_provided_there"` and `export AWS_ACCESS_KEY_ID="id_provided_there"` in the VSCode's terminal, if you don't want to use AWS' cli.
6. `pgadmin 4` (PostgreSQL GUI) should be installed and should have a server and a database on it. One can go to **`Backend/db_init.js`** and configure your database first. (Note: App will create the tables itself, one only needs to setup the database)
7.  Environment variables for `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` must be set. Values for them can be obtained from **`Backend/.env`** file. E.g. `export AWS_ACCESS_KEY_ID="id_provided_there"` and `export AWS_ACCESS_KEY_ID="id_provided_there"`
