var AWS = require("aws-sdk");
var fs = require('fs');
const spawn = require('child_process').spawn;
var Updatedb = require("./updatedb");
var nodemailer = require('nodemailer');
var sesTransport = require('nodemailer-ses-transport');
var SparkPost = require('sparkpost');
var sparky = new SparkPost();

var path_nas = '/tmp/videos/';

var SESCREDENTIALS = {
    accessKeyId: process.env.KEYID || '',
    secretAccessKey: process.env.SECRETKEYID || ''
};

// var transporter = nodemailer.createTransport(sesTransport({
//     accessKeyId: SESCREDENTIALS.accessKeyId,
//     secretAccessKey: SESCREDENTIALS.secretAccessKey,
//     region: 'us-west-2',
//     rateLimit: 5
// }));

exports.fileToConverted = function(fileName, fileId) {

    let s3bucket = new AWS.S3({
        accessKeyId: SESCREDENTIALS.accessKeyId,
        secretAccessKey: SESCREDENTIALS.secretAccessKey,
    });

    AWS.config.region = "us-west-2"; //us-west-2 is Oregon
    var response = {};

    var params = { Bucket: '4426-grupo1-videos/original', Key: fileName };
    var file = require('fs').createWriteStream(path_nas + fileName).once('finish', function() {
        converterVideo(file.path, fileId).then(() => {

            console.log(path_nas + fileId + ".mp4");
            fs.readFile(path_nas + fileId + ".mp4", function(err, data) {
                if (err) { throw err; }
                params = { Bucket: "4426-grupo1-videos/convertido", Key: fileId + ".mp4", Body: data };
                s3bucket.upload(params, function(err, data) {
                    if (err) {
                        console.log('error in callback');
                    }
                    console.log('success');

                    Updatedb.update(fileId, fileId + ".mp4", function() {

                        Updatedb.select(responseJson.fk_id_competition, function(item) {
                            console.log(item.address)
                            var emailText = "http://d10pkk829h9oy.cloudfront.net/public/" + item.address.S + "/" + responseJson.fk_id_competition;
                            // var mailOptions = {
                            //     from: 'oh.urrego@uniandes.edu.co',
                            //     to: responseJson.email,
                            //     subject: 'Tu video ya fue cargado EXITOSAMENTE!!',
                            //     text: 'Hola, te queremos decir que tu video ya fue procesado y cargado exitosamente. Revisalo en: http://d10pkk829h9oy.cloudfront.net/public/' + item.address.S + "/" + responseJson.fk_id_competition
                            // };

                            // transporter.sendMail(mailOptions, function(error, info) {
                            //     if (error) {
                            //         console.log(error);
                            //     } else {
                            //         console.log('Message sent: ' + info);
                            //     }
                            // });

                            sparky.transmissions.send({
                                    options: {
                                        sandbox: true
                                    },
                                    content: {
                                        from: 'testing@' + process.env.SPARKPOST_SANDBOX_DOMAIN, // 'testing@sparkpostbox.com'
                                        subject: 'Tu Video ya esta publicado',
                                        html: `<html><body><p> Hola, te queremos decir que tu video ya fue procesado y cargado exitosamente. Revisalo en: ${emailText} !</p></body></html>`
                                    },
                                    recipients: [
                                        { address: responseJson.email }
                                    ]
                                })
                                .then(data => {
                                    console.log('Woohoo! You just sent your first mailing!');
                                    console.log(data);
                                })
                                .catch(err => {
                                    console.log('Whoops! Something went wrong');
                                    console.log(err);
                                });

                        })

                    })

                });
            });

        });
    });
    s3bucket.getObject(params).createReadStream().pipe(file);
    console.log(file.path)

};

function converterVideo(pathReal, id) {
    const p = new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', ['-y', '-i', `${pathReal}`, '-codec:a', 'libfdk_aac', '-codec:v', 'libx264', '-profile:v', 'main', `${path_nas}${id}.mp4`]);
        ffmpeg.stderr.on('data', (data) => {
            console.log(`${data}`);
        });
        ffmpeg.on('close', (code) => {
            resolve();
        });
    });
    return p;
}