const fs = require('fs');
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

function writeFile(dir, file, data) {
	let cleanDir = cleanPath(dir);
	let cleanFile = cleanPath(file);

	if (!fs.existsSync(cleanDir)) {
		fs.mkdirSync(cleanDir, { recursive: true });
	}
	fs.writeFileSync(`${cleanDir}/${cleanFile}`, data, function (err) {
		if (err != null) console.log(err);
		return err != null;
	});
}

function readFile(file) {
	let fileContent;
	try {
		fileContent = fs.readFileSync(cleanPath(file), 'utf8');
	}
	catch (err) {
		fileContent = false;
	}

	return fileContent;
}

function loadConfig() {
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
			"NF": "https://novelfull.com/"
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
			"redownload": false // TODO: redownload all chapters, repack into volumes with completedVolumeChapterCount, do not send via email, intended for completed series archiving
		},
		"novels": []
	};

	let configRead = readFile('./novelConfig.conf');

	if (configRead) {
		config = JSON.parse(configRead);
		transporter = nodemailer.createTransport({
			service: config['emailProvider'], // no need to set host or port etc.
			auth: {
				user: config['emailUsername'],
				pass: config['emailPassword']
			}
		});
		writeFile('.', 'novelConfig.conf', JSON.stringify(config, null, 4));
	}
	else {
		writeFile('.', 'novelConfig.conf', JSON.stringify(novelConfigDefault, null, 4));
		config = novelConfigDefault;
	}

	console.log(config)
}

function saveConfig() {
	writeFile('.', 'novelConfig.conf', JSON.stringify(config, null, 4));
}

async function convertEbook(dir, file, params = { "cover": false, "authors": false, "title": false }, format = 'html') {
	let file1Path = cleanPath(`${dir}/${file}.${format}`);
	let file2Path = cleanPath(`${dir}/${file}.${config['ebookFormat']}`);
	let convertParams = ' --use-auto-toc';
	//convertParams += format2 == 'epub' ? ' --epub-inline-toc' : '';
	convertParams += params['cover'] ? ` --cover "${params['cover']}"` : '';
	convertParams += params['authors'] ? ` --authors "${params['authors']}"` : '';
	convertParams += params['title'] ? ` --title "${params['title']}"` : '';

	exec(`${config['converterPath']} "${file1Path}" "${file2Path}"${convertParams}`, (error, stdout, stderr) => {
		if (error) {
			console.log(`error: ${error.message}`);
			return;
		}
		if (stderr) {
			console.log(`stderr: ${stderr}`);
			return;
		}
		console.log(`stdout: ${stdout}`);
	});
}


async function sendEbook(subject, ebookAttachments) { //(dir, ebook, format = 'epub') {
	if (config['sendEmail']) {
		let splicedAttachments = [];
		while (ebookAttachments.length > config['emailAttachments']) {
			splicedAttachments.push(ebookAttachments.splice(0, config['emailAttachments']))
		}
		if (ebookAttachments.length > 0) {
			splicedAttachments.push(ebookAttachments)
		}

		for (i = 0; i < splicedAttachments.length; ++i) {
			let message = {
				from: config['emailFromAddress'],
				to: config['emailToAddress'],
				subject: subject + ' part ' + i,
				text: subject + ' part ' + i,
				attachments: splicedAttachments[i]
			}

			await transporter.sendMail(message, (err) => {
				if (err)
					console.log(err);

				else
					console.log(`Sent volume ${ebook}`);
			});
		}
	}
}

async function fetch_smth(URL, hosting) {
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
	loadConfig();

	// let novelDirConvert = 'C:/Users/mateu/bin/LightNovel/' + 'Warlock of the Magus World';
	// let fileName = ((1 + 1) < 10 ? '0' + (1 + 1) : (1 + 1)) + '. ' + 'The Wizard World' + '; ' + 'Get Lost'; 
	// let fileName = `${(1 + 1) < 10 ? '0' + (1 + 1) : (1 + 1)}. ${'The Wizard World'}; ${'Get Lost'}`; 
	// let fileName = `21. Warlock of the Magus World; The Plagiarist`; 
	// convertEbook(novelDirConvert, fileName);
	// await sendEbook(novelDirConvert, fileName);

	for (i = 0; i < config['novels'].length; ++i) {
		let novel = clone(config['novels'][i]);
		let chapters = [];
		let nextChapterURL;

		if (!novel['completed']) {
			let novelInfo = await fetchNovelInfo(novel['novelURL'], 'NF');

			novel['title'] = novelInfo[0];
			novel['author'] = novelInfo[1];
			novel['completed'] = novelInfo[2];
			novel['coverURL'] = novelInfo[4];

			config['novels'][i] = clone(novel);
			saveConfig();

			if (!novel['lastChapterURL']) {
				novel['lastChapterURL'] = novelInfo[3];

				let chapter = await fetchChapter(novelInfo[3], 'NF');
				console.log('Download chapter ' + chapters.length + ' ' + novelInfo[3]);
				chapters.push(chapter);
			}

			let novelDir = `${config['downloadLocation']}/${novel['title']}`;

			const nextChapterURLtemp = await fetchChapter(novel['lastChapterURL'], 'NF');
			nextChapterURL = nextChapterURLtemp[1];

			while (nextChapterURL) {
				novel['lastChapterURL'] = nextChapterURL;
				let chapter = await fetchChapter(nextChapterURL, 'NF');
				console.log('Download chapter ' + chapters.length + ' ' + nextChapterURL);
				chapters.push(chapter);
				nextChapterURL = chapter[1];
			}

			// writeFile(novelDir, 'chapters.json`, JSON.stringify(chapters))
			//chapters = JSON.parse(readFile("C:\\Users\\mateu\\bin\\LightNovel\\chapters.json"))

			let startVol = novel['lastVolume'];
			let totalChapters = chapters.length;

			const maxVolume = novel['completed'] ? startVol + 1 + Math.floor(totalChapters / novel['completedVolumeChapterCount']) : startVol + Math.floor(totalChapters / novel['completedVolumeChapterCount']);

			let ebookAttachments = [];
			for (vol = startVol; vol < maxVolume; vol++) {
				let volContent = '';

				for (chap = 0; chap < novel['completedVolumeChapterCount'] && chap < chapters.length; chap++) {
					volContent += chapters[chap][0] + '\n';
				}

				novel['lastChapterURL'] = chapters[(chap - 2 < 0 ? 0 : chap - 2)][1];
				novel['lastVolume'] = vol + 1;
				config['novels'][i] = clone(novel);
				saveConfig();

				let novelFileName = `${(vol + 1) < 10 ? '0' + (vol + 1) : (vol + 1)}. ${novel['title']}; ${novel['author']}`;

				writeFile(novelDir, `${novelFileName}.html`, volContent);
				console.log(`Saved volume: ${novelFileName}`);

				await convertEbook(novelDir, novelFileName, {
					cover: novel['coverURL'],
					authors: novel['author'],
					title: `${(vol + 1) < 10 ? '0' + (vol + 1) : (vol + 1)}. ${novel['title']}`
				});

				ebookAttachments.push({
					name: cleanPath(`${novelFileName}.${config['ebookFormat']}`),
					path: cleanPath(`${novelDir}/${novelFileName}.${config['ebookFormat']}`)
				});

				chapters.splice(0, chap);
			}
			await sendEbook(novel['title'], ebookAttachments);

			ebookAttachments = [];
			startVol = novel['lastVolume'];
			totalChapters = chapters.length;

			for (vol = startVol; vol < startVol + Math.floor(totalChapters / novel['volumeChapterCount']); vol++) {
				let volContent = '';

				for (chap = 0; chap < novel['volumeChapterCount'] && chap < chapters.length; chap++) {
					volContent += chapters[chap][0] + '\n';
				}

				novel['lastChapterURL'] = chapters[(chap - 2 < 0 ? 0 : chap - 2)][1];
				novel['lastVolume'] = vol + 1;
				config['novels'][i] = clone(novel);
				saveConfig();

				let novelFileName = `${(vol + 1) < 10 ? '0' + (vol + 1) : (vol + 1)}. ${novel['title']}; ${novel['author']}`;

				writeFile(novelDir, `${novelFileName}.html`, volContent);
				console.log(`Saved volume: ${novelFileName}`);

				await convertEbook(novelDir, novelFileName, {
					cover: novel['coverURL'],
					authors: novel['author'],
					title: `${(vol + 1) < 10 ? '0' + (vol + 1) : (vol + 1)}. ${novel['title']}`
				});

				ebookAttachments.push({
					name: cleanPath(`${novelFileName}.${config['ebookFormat']}`),
					path: cleanPath(`${novelDir}/${novelFileName}.${config['ebookFormat']}`)
				});

				chapters.splice(0, chap);
			}
			await sendEbook(novel['title'], ebookAttachments);
		}
	}
}

main();