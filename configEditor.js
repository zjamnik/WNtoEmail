const open = require('open');
const path = require('path');
const fs = require('node:fs/promises');
const express = require('express');
const bodyParser = require('body-parser');
const { read } = require('fs');

const html = express();
html.use(bodyParser.urlencoded({
    extended: true
}));

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function cleanPath(pathToClean) {
    let regex = /[<>:"|\?\*]/g;
    let cleanPath = path.normalize(pathToClean);

    let isAbsolute = path.isAbsolute(cleanPath);
    cleanPath = cleanPath.replace(regex, '');
    if (/^win/i.test(process.platform) && isAbsolute) {
        cleanPath = `${cleanPath.slice(0, 1)}:${cleanPath.slice(1)}`
    }

    return cleanPath;
}

function padNumber(num, len) {
    let strNum = num.toString();
    let negative = num < 0;
    if (negative) strNum = strNum.substr(1);

    while (strNum.length < len) {
        strNum = '0' + strNum;
    }

    return (negative ? '-' : '') + strNum;
}

function log(text) {
    let d = new Date();
    let dateTime = `${d.getFullYear()}.${padNumber((d.getMonth() + 1), 2)}.${padNumber(d.getDate(), 2)}_${padNumber(d.getHours(), 2)}:${padNumber(d.getMinutes(), 2)}:${padNumber(d.getSeconds(), 2)}.${padNumber(d.getMilliseconds(), 3)}`;
    fs.appendFile(cleanPath(`./WNtoEmail.log`), `${dateTime} ${text}\n`);
}

async function mkDir(dirPath) {
    try {
        await fs.access(cleanPath(dirPath));
    }
    catch (err) {
        await fs.mkdir(dirPath, { recursive: true });
    }
    await fs.access(cleanPath(dirPath));
}

async function writeFile(dir, file, data) {
    let cleanDir = cleanPath(dir);
    let cleanFile = cleanPath(file);

    await mkDir(dir);

    return fs.writeFile(`${cleanDir}/${cleanFile}`, data);
}

async function readFile(file, { format = 'utf8' } = {}) {
    return fs.readFile(cleanPath(file), format);
}

html.get('/', async function (req, res) {
    let configHTML = await genConfigHTML();

    res.status(200).send(configHTML);
});

html.post('/', async function (req, res) {
    console.log(req.body);
    let configHTML = await genConfigHTML();
    res.status(200).send(configHTML);
});


async function genConfigHTML() {
    let config = JSON.parse(await readFile('./novelConfig.conf'));

    let configHTML = await readFile('./novelConfig.html');
    let novelSettings = await readFile('./novelSettings.html');

    // .replace(/"/g, '\\"')
    configHTML = configHTML.replace(/---novelTemplate---/, novelSettings.replace(/\n/g, '\\n'));
    configHTML = configHTML.replace(/---index---/g, '---novelTemplateHTML---');
    configHTML = inflateNovelTemplate(configHTML, config['template']);
    configHTML = configHTML.replace(/---novels---/, '');

    configHTML = configHTML.replace(/---downloadLocation---/, config['downloadLocation']);
    configHTML = configHTML.replace(/---converterPath---/, config['converterPath']);
    configHTML = configHTML.replace(/---ebookFormat---/, config['ebookFormat']);
    configHTML = configHTML.replace(/---sendEmail---/, config['sendEmail'] ? 'checked' : '');
    configHTML = configHTML.replace(/---emailToAddress---/, config['emailToAddress']);
    configHTML = configHTML.replace(/---emailFromAddress---/, config['emailFromAddress']);
    configHTML = configHTML.replace(/---emailProvider---/, config['emailProvider']);
    configHTML = configHTML.replace(/---emailUsername---/, config['emailUsername']);
    configHTML = configHTML.replace(/---emailPassword---/, config['emailPassword']);
    configHTML = configHTML.replace(/---emailAttachments---/, config['emailAttachments']);
    configHTML = configHTML.replace(/---supportedHosting---/, JSON.stringify(config['supportedHosting']));
    configHTML = configHTML.replace(/---template---/, JSON.stringify(config['template']));
    // configHTML.replace(/------/, config['']);

    for (let i = 0; i < config['novels'].length; i++) {
        configHTML = configHTML.replace(/---novels---/, novelSettings);
        configHTML = configHTML.replace(/---index---/g, i);
        configHTML = inflateNovelTemplate(configHTML, config['novels'][i]);
    }

    configHTML = configHTML.replace(/---novels---/, '');
    return configHTML;
}

function inflateNovelTemplate(configHTML, novel) {
    configHTML = configHTML.replace(/---novelURL---/, novel['novelURL']);
    configHTML = configHTML.replace(/---title---/, novel['title']);
    configHTML = configHTML.replace(/---author---/, novel['author']);
    configHTML = configHTML.replace(/---coverURL---/, novel['coverURL']);
    configHTML = configHTML.replace(/---lastChapterURL---/, novel['lastChapterURL']);
    configHTML = configHTML.replace(/---lastVolume---/, novel['lastVolume']);
    configHTML = configHTML.replace(/---completed---/, novel['completed'] ? 'checked' : '');
    configHTML = configHTML.replace(/---hosting---/, novel['hosting']);
    configHTML = configHTML.replace(/---volumeChapterCount---/, novel['volumeChapterCount']);
    configHTML = configHTML.replace(/---completedVolumeChapterCount---/, novel['completedVolumeChapterCount']);
    configHTML = configHTML.replace(/---redownload---/, novel['redownload'] ? 'checked' : '');
    configHTML = configHTML.replace(/---sendOnly---/, novel['']);
    configHTML = configHTML.replace(/---sendOnlyRegex---/, novel['sendOnlyRegex']);
    console.log(novel['sendOnlyRegex']);
    // configHTML = configHTML.replace(/------/, novel['']);

    return configHTML;
}

async function main() {

    html.listen(8383);
    //open('http://localhost:8383');
}

main();