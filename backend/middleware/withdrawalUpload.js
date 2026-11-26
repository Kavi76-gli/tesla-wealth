"use strict";

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDirectory = path.join(
    __dirname,
    "../uploads/withdrawal-documents"
);

fs.mkdirSync(uploadDirectory, {
    recursive: true
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDirectory);
    },

    filename: function (req, file, cb) {
        const safeName =
            `${Date.now()}-${require("crypto").randomUUID()}.pdf`;

        cb(null, safeName);
    }
});

const upload = multer({
    storage,

    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },

    fileFilter: function (req, file, cb) {
        const isPdf =
            file.mimetype === "application/pdf" &&
            path.extname(file.originalname).toLowerCase() === ".pdf";

        if (!isPdf) {
            return cb(
                new Error("Only PDF documents are allowed.")
            );
        }

        cb(null, true);
    }
});

module.exports = upload;