const multer = require('multer');
const { insertFileToS3 } = require('../middleware/controller/uploadController');
const validation = require('../middleware/fileValidation');
// const service = require('../services/upload.service');

const router = require('express').Router();

const upload = multer({ dest: "uploads/" });


// =================================================== only sample code working well use it in your application==================

// ------------------------------ image upload using s3 storage bucker proccess;

//routes files; 

router.post("/avatar", upload.fields([{ name: "avatar", maxCount: 1 }]), validation.checkFile, insertFileToS3)


//middles wares; 

//validation file is valid or not;

const validation = {
    async checkFile(req, res, next) {
        try {
            console.log("in file upload validation middleware...")
            const image = req.files;
            console.log("image:", image);
            if (!image) {
                throw "image not found or not uploaded properly";
            }
            next();
        } catch (error) {
            res.status(422).send({ message: "Unable to upload image.." })
        }

    }
}

//----------------------------------------- upload to s3 bucket -------------------------------------

const gen_nano_id = require("../../helpers/nanoid_gen");
const { insertImage } = require("../upload/upload");


const controller = {

    async insertFileToS3(req, res, next) {
        try {
            const { fieldname, originalname, mimetype, filename, path } = req.files.avatar[0];
            console.log("image obj:", originalname);
            //get file extension type;
            const fileType = mimetype.split("/")[1] // ex:'image/jpeg' (jpeg)
            // console.log(fileType)
            //get nano id ;
            const nanoid = gen_nano_id();
            // 
            await insertImage(fieldname, path, fileType, nanoid,); // insertImage code is below ...check down
            console.log("uploaded successfuly");

            return res.status(200).send("image uploaded to AWS S3 bucket...")

        } catch (err) {
            console.log(err.message);
            return res.status(200).send({ message: err.message })
        }
    }
}
module.exports = controller;
//-------------------------------------------------- upload imaage function;


const fs = require('fs');

const AWS = require('aws-sdk');
const { deleteFileInLocal } = require('../../helpers/unLinkFile');



//s3 bucket config;
const s3 = new AWS.S3({
    accessKeyId: process.env.ATS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.ATS_S3_SECRET_ACCESS_KEY,
    signatureVersion: "v4",
    region: process.env.ATS_S3_REGION,
});


const upload_file_manipulation = {



    async insertImage(fieldname, localFilePath, fileType, nanoid) {
        try {
            console.log("In insert image");
            const fileStream = fs.createReadStream(localFilePath); //read access ;
            // ("/") creates folder in s3 then inside filder creates files with org storage size
            const fileUrl = `${nanoid} / ${fieldname}_${nanoid}.${fileType}`; //folder / avatar_ffwf4fewfwfeaw.jpeg;
            const params = {
                Bucket: process.env.ATS_S3_BUCKET_NAME,
                Key: fileUrl,
                Body: fileStream,
                //ACL:"public-read", //default private 
            }

            //insert to s3 bucket;
            s3.putObject(params, (err, data) => {
                if (err) {
                    console.log("err:", err.message);
                    return false;
                }
                //remove local file in uploads folder;
                deleteFileInLocal(localFilePath); // delete() in below check down
                return true;
            })
        } catch (error) {
            console.log(error.message)
        }
    }

}

module.exports = upload_file_manipulation;


////////////------------------------------ remove local folder uploads files after uploaded to s3;

const { unlink } = require('fs/promises');

// remove the file in the local folder after file inserted to s3 bucket; uploads;
const deleteFileInLocal = async (localFilePath) => {
    try {
        await unlink(localFilePath);
    } catch (error) {
        console.log("there was a error in deletion file", error.message)
    }
}

module.exports = { deleteFileInLocal };




