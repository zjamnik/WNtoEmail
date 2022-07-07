const fs = require('node:fs/promises');
const path = require('path');
const HTMLparser = require('node-html-parser');
const exec = require("child_process").execSync;
const nodemailer = require('nodemailer');

var transporter;
var config;

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

async function loadConfig() {
	let novelConfigDefault = {
		"downloadLocation": "",
		"converterPath": "ebook-convert.exe",
		"ebookFormat": "epub",
		"sendEmail": false,
		"emailToAddress": "",
		"emailFromAddress": "",
		"emailProvider": "",
		"emailUsername": "",
		"emailPassword": "",
		"emailAttachments": 25,
		"supportedHosting": {
			"NF": "https://novelfull.com/",
			"TNC": "https://thatnovelcorner.com/ external source, use with sendOnly = true"
		},
		"template": {
			"novelURL": "",
			"title": "",
			"author": "",
			"coverURL": "",
			"lastChapterURL": false,
			"lastVolume": 0,
			"completed": false,
			"hosting": "NF",
			"volumeChapterCount": 5,
			"completedVolumeChapterCount": 50,
			"redownload": false,
			"sendOnly": false, // TODO: only send epub files via email, for cases with external source of epub files or after "redownload"
			"sendOnlyRegex": "(?<volume>\\d*). (?<title>.*); (?<author>.*)" // TODO: metadata regex for extracting information from filename for external sources
		},
		"novels": []
	};

	try {
		config = JSON.parse(await readFile(`./novelConfig.conf`));
		transporter = nodemailer.createTransport({
			service: config['emailProvider'],
			auth: {
				user: config['emailUsername'],
				pass: config['emailPassword']
			}
		});
		await writeFile('.', 'novelConfig.conf', JSON.stringify(config, null, 4));
		await writeFile('.', 'novelConfig.bak.conf', JSON.stringify(config, null, 4));
	}
	catch (err) {
		await writeFile('.', 'novelConfig.conf', JSON.stringify(novelConfigDefault, null, 4));
		config = novelConfigDefault;
	}

	transporter = nodemailer.createTransport({
		service: config['emailProvider'],
		auth: {
			user: config['emailUsername'],
			pass: config['emailPassword']
		}
	});
}

async function saveConfig() {
	await writeFile(__dirname, 'novelConfig.conf', JSON.stringify(config, null, 4));
}

async function convertEbook(dir, file, params = { "cover": false, "authors": false, "title": false }, format = 'html') {
	let file1Path = cleanPath(`${dir}/${file}.${format}`);
	let file2Path = cleanPath(`${dir}/${file}.${config['ebookFormat']}`);
	let convertParams = ' --use-auto-toc';
	convertParams += config['ebookFormat'] == 'epub' ? ' --epub-inline-toc' : '';
	convertParams += params['cover'] ? ` --cover "${params['cover']}"` : '';
	convertParams += params['authors'] ? ` --authors "${params['authors']}"` : '';
	convertParams += params['title'] ? ` --title "${params['title']}"` : '';

	console.log(`Converting volume: ${file1Path}`);
	log(`Converting volume: ${file1Path}`);

	exec(`${config['converterPath']} "${file1Path}" "${file2Path}"${convertParams}`, (error, stdout, stderr) => {
		if (error) {
			console.log(`error: ${error.message}`);
			log(`error: ${error.message}`);
			return;
		}
		if (stderr) {
			console.log(`stderr: ${stderr}`);
			log(`stderr: ${stderr}`);
			return;
		}
		console.log(`stdout: ${stdout}`);
		log(`stdout: ${stdout}`);
	});
}


function sendEbook(subject, ebookAttachments) {
	if (config['sendEmail']) {
		let splicedAttachments = [];
		while (ebookAttachments.length > config['emailAttachments']) {
			splicedAttachments.push(ebookAttachments.splice(0, config['emailAttachments']))
		}
		if (ebookAttachments.length > 0) {
			splicedAttachments.push(ebookAttachments)
		}

		for (let i = 0; i < splicedAttachments.length; ++i) {
			let message = {
				from: config['emailFromAddress'],
				to: config['emailToAddress'],
				subject: subject + ' part ' + (i + 1),
				text: subject + ' part ' + (i + 1),
				attachments: splicedAttachments[i]
			}

			transporter.sendMail(message, (err) => {
				if (err)
					console.log(err);
				log(err);
			});

			console.log(`Sent volumes:`);
			log(`Sent volumes:`);
			splicedAttachments[i].forEach(elem => console.log(elem['filename']))
		}
	}
}

async function fetch_something(URL, hosting) {
	let fetchURL = await fetch(URL);

	if (fetchURL.ok) {
		let response = await fetchURL.text();

		let info;

		return info;
	}
	else return fetchURL.ok;
}

async function fetchNovelInfo(URL, hosting) {
	let fetchURL = await fetch(URL);

	if (fetchURL.ok) {
		let response = await fetchURL.text();

		let novelInfo = getNovelInfo(response, hosting);

		return novelInfo;
	}
	else return fetchURL.ok;

}

async function fetchChapter(URL, hosting) {
	let fetchURL = await fetch(URL);

	if (fetchURL.ok) {
		let response = await fetchURL.text();

		let nextChapterURL = getNextChapterURL(response, hosting);
		let chapterContent = getChapterContent(response, hosting);

		return [chapterContent, nextChapterURL];
	}
	else return fetchURL.ok;
}

function get(response, hosting) {
	let html = HTMLparser.parse(response);

	let info;

	switch (hosting) {
		case 'NF':
			info = html;
			break;

		default:
			info = false;
	}

	return info;
}

async function getNovelInfo(response, hosting) {
	let html = HTMLparser.parse(response);

	let info;

	switch (hosting) {
		case 'NF':
			let title = html.querySelector('h3.title').innerText;
			let author = html.querySelector('#truyen > div.csstransforms3d > div > div.col-xs-12.col-info-desc > div.col-xs-12.col-sm-4.col-md-4.info-holder > div.info > div:nth-child(1) > a:nth-child(2)').innerText;
			let completed = html.querySelector('#truyen > div.csstransforms3d > div > div.col-xs-12.col-info-desc > div.col-xs-12.col-sm-4.col-md-4.info-holder > div.info > div:nth-child(5) > a').innerText == "Completed";
			let firstChapterURL = html.querySelector('#list-chapter > div.row > div:nth-child(1) > ul > li:nth-child(1) > a').attrs['href'];
			let coverURL = html.querySelector('div.book > img').attrs['src'];
			info = [title, author, completed, 'https://novelfull.com' + firstChapterURL, 'https://novelfull.com' + coverURL];
			break;

		default:
			info = false;
	}

	return info;
}

function getNextChapterURL(response, hosting) {
	let html = HTMLparser.parse(response);

	let nextChapterURL;

	switch (hosting) {
		case 'NF':
			nextChapterURL = undefined == html.querySelector('a#next_chap').attrs['href'] ? false : 'https://novelfull.com' + html.querySelector('a#next_chap').attrs['href'];
			break;

		default:
			nextChapterURL = false;
	}

	return nextChapterURL;
}

function getChapterContent(response, hosting) {
	let html = HTMLparser.parse(response);

	let chapterContent = '';

	switch (hosting) {
		case 'NF':
			chapterContent += '<h1 class="chapter">' + html.querySelector('span.chapter-text').innerText + '</h3>';

			html.querySelectorAll('div#chapter-content p').forEach(element => {
				chapterContent += element.outerHTML;
			});
			break;

		default:
			chapterContent = false;
	}

	return chapterContent;
}

async function main() {
	await loadConfig();

	for (let i = 0; i < config['novels'].length; ++i) {
		let novel = clone(config['novels'][i]);
		let chapters = [];
		let nextChapterURL;

		if (novel['redownload']) {
			novel['completed'] = false;
			novel['lastChapterURL'] = false;
			novel['lastVolume'] = 0;
		}

		if (!novel['completed']) {
			let novelInfo = await fetchNovelInfo(novel['novelURL'], 'NF');

			novel['title'] = novelInfo[0];
			novel['author'] = novelInfo[1];
			novel['completed'] = novelInfo[2];
			novel['coverURL'] = novelInfo[4];

			config['novels'][i] = clone(novel);
			await saveConfig();

			if (!novel['lastChapterURL']) {
				novel['lastChapterURL'] = novelInfo[3];

				let chapter = await fetchChapter(novelInfo[3], 'NF');
				console.log('Downloaded chapter: ' + chapters.length + ' ' + novelInfo[3]);
				log('Downloaded chapter: ' + chapters.length + ' ' + novelInfo[3]);
				chapters.push(chapter);
			}

			let novelDir = `${config['downloadLocation']}/${novel['title']}`;

			const nextChapterURLtemp = await fetchChapter(novel['lastChapterURL'], 'NF');
			nextChapterURL = nextChapterURLtemp[1];

			while (nextChapterURL) {
				novel['lastChapterURL'] = nextChapterURL;
				let chapter = await fetchChapter(nextChapterURL, 'NF');
				console.log('Downloaded chapter: ' + chapters.length + ' ' + nextChapterURL);
				log('Downloaded chapter: ' + chapters.length + ' ' + nextChapterURL);
				chapters.push(chapter);
				nextChapterURL = chapter[1];
			}

			let startVol = novel['lastVolume'];
			let totalChapters = chapters.length;

			const maxVolume = novel['completed'] ? startVol + Math.ceil(totalChapters / novel['completedVolumeChapterCount']) : startVol + Math.floor(totalChapters / novel['completedVolumeChapterCount']);
			const maxVolLen = (novel['completed'] ? maxVolume :
				maxVolume + Math.floor((chapters.length - (maxVolume * novel['completedVolumeChapterCount'])) / novel['volumeChapterCount'])).toString().length;

			let ebookAttachments = [];

			for (let vol = startVol; vol < maxVolume; vol++) {
				let volContent = '';

				let chap;
				for (chap = 0; chap < novel['completedVolumeChapterCount'] && chap < chapters.length; chap++) {
					volContent += chapters[chap][0] + '\n';
				}

				novel['lastChapterURL'] = chapters[(chap - 2 < 0 ? 0 : chap - 2)][1];
				novel['lastVolume'] = vol + 1;
				config['novels'][i] = clone(novel);
				await saveConfig();

				let novelFileName = `${padNumber((vol + 1), maxVolLen)}. ${novel['title']}; ${novel['author']}`;

				await writeFile(novelDir, `${novelFileName}.html`, volContent);
				console.log(`Saved volume: ${novelFileName}`);
				log(`Saved volume: ${novelFileName}`);

				await convertEbook(novelDir, novelFileName, {
					cover: novel['coverURL'],
					authors: novel['author'],
					title: `${padNumber((vol + 1), maxVolLen)}. ${novel['title']}`
				});

				ebookAttachments.push({
					filename: cleanPath(`${novelFileName}.${config['ebookFormat']}`),
					path: cleanPath(`${novelDir}/${novelFileName}.${config['ebookFormat']}`)
				});

				chapters.splice(0, chap);
			}

			startVol = novel['lastVolume'];
			totalChapters = chapters.length;

			for (let vol = startVol; vol < startVol + Math.floor(totalChapters / novel['volumeChapterCount']); vol++) {
				let volContent = '';

				let chap;
				for (chap = 0; chap < novel['volumeChapterCount'] && chap < chapters.length; chap++) {
					volContent += chapters[chap][0] + '\n';
				}

				novel['lastChapterURL'] = chapters[(chap - 2 < 0 ? 0 : chap - 2)][1];
				novel['lastVolume'] = vol + 1;
				config['novels'][i] = clone(novel);
				await saveConfig();

				let novelFileName = `${padNumber((vol + 1), maxVolLen)}. ${novel['title']}; ${novel['author']}`;

				await writeFile(novelDir, `${novelFileName}.html`, volContent);
				console.log(`Saved volume: ${novelFileName}`);
				log(`Saved volume: ${novelFileName}`);

				await convertEbook(novelDir, novelFileName, {
					cover: novel['coverURL'],
					authors: novel['author'],
					title: `${padNumber((vol + 1), maxVolLen)}. ${novel['title']}`
				});

				ebookAttachments.push({
					filename: cleanPath(`${novelFileName}.${config['ebookFormat']}`),
					path: cleanPath(`${novelDir}/${novelFileName}.${config['ebookFormat']}`)
				});

				chapters.splice(0, chap);
			}
			if (!novel['redownload']) {
				sendEbook(novel['title'], ebookAttachments);
			}
			else {
				novel['redownload'] = false;
				config['novels'][i] = clone(novel);
				saveConfig();
			}
		}
	}
}

main();