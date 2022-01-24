const cors = require('cors');
const fs = require('fs');
const express = require('express');
const app = express();

//app.options('http://localhost:8000/flowstrates/scr/test', cors());

app.use(cors({ methods: ['POST'] }));
app.use(express.json());

const {randomUUID} = require('crypto');

app.post('/', function (req, res) {
    const randomID = randomUUID();

    const writer = fs.createWriteStream(__dirname + '/responses/' + randomID + '.txt');
    let fileContent = 'Versions order : ' + req.body.versionOrder + '\n\n/********************************************************/\n\n';
    fileContent += 'Findings VersionA\n\n';
    fileContent += req.body.findings['versionA'] + '/********************************************************/\n\n';
    fileContent += 'Findings VersionB\n\n';
    fileContent += req.body.findings['versionB'] + '/********************************************************/\n\n';
    fileContent += 'Qualitative evaluation\n\n';

    for (const radioGroup of req.body.qualitative) {
        fileContent += Object.keys(radioGroup)[0] + '\t' + Object.values(radioGroup)[0] + '\n';
    }
    fileContent += '\n/********************************************************/\n\nComments / bugs / improvements\n\n';
    fileContent += req.body.comments;
    writer.write(fileContent);

    res.status(200).end();
});

app.listen(8080, function () {
    console.log('server running ... on port 8080');
});