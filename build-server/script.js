const {exec} = require('child_process')
const path = require('path')
const fs = require('fs')
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3');
const mime = require('mime-types');

const s3Client = new S3Client({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: 'AKIA3ZLZNMOJF65EN7MT',
        secretAccessKey: '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'
    }
})

const PROJECT_ID = process.env.PROJECT_ID;


async function init(){
    console.log("Executing script.js");

    const outDirPath = path.join(__dirname, 'output');
    console.log(outDirPath);
    const p = exec(`cd ${outDirPath} && rm -rf node_modules package-lock.json && npm install && npm run build `);

    p.stdout.on('data', function(data){
        console.log(data.toString());
    })

    p.stdout.on('error', function(error){
        console.log('Error -' + error.toString());
    })

    // reading dist folder
    p.on('close', async function(){
        
        const distFolderPath = path.join(__dirname, 'output', 'dist')
        console.log(distFolderPath);
        const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true })
        console.log('Build completed!');


        for(const file of distFolderContents){
            // get the full path 
            const fileFolderPath = path.join(distFolderPath, file);
            // Skip upload for folder
            if(fs.lstatSync(fileFolderPath).isDirectory()) continue;

            // upload only file to S3
            console.log('Uploading - ', fileFolderPath);
            const command = new PutObjectCommand({
                Bucket: 'scaled-deployer',
                // Only upload to path as file name not full path
                Key: `__outputs/${PROJECT_ID}/${file}`,
                Body: fs.createReadStream(fileFolderPath),
                ContentType: mime.lookup(fileFolderPath)
            })

            await s3Client.send(command);
            console.log('Uploaded - ', fileFolderPath);
        }

        // Completed uploading 
        console.log('Done uploading!');
    })
}

init();