# WNtoEmail
Node.js script to download new WebNovel chapters convert them to eBook and send to email. Mainly intended for sending to Kindle.
Script will pack your WebNovels into convinient eBooks, complete with cover image, metadata and table of contents. For ongoing series if will wait for a configured number of new chapters before sending a new volume to avoid spam.

# Dependecies
It's a Node.js project so install that.
Project is using `node-html-parser` and `nodemailer` libraries. It should be enough to:
```
npm install --save node-html-parser
npm install --save nodemailer
```

# Config
At first start it will create an empty config file `./novelConfig.conf`, adjust the setting according to comments below
```
{
    "downloadLocation": "",                 // New chapter download location
    "converterPath": "ebook-convert.exe",   // Calibre eBook converter, I recommend adding it to you PATH, NOT tested when it's not in PATH
    "ebookFormat": "epub",                  // Desired eBook format, Kindle started supporting epub dso that's default
    "sendEmail": false,                     // If the script should send eBooks via email
    "emailToAddress": "",                   // Email where to send your eBooks
    "emailFromAddress": "",                 // Important for Kindle deliveries, make sure you have it added in Kindle settings
    "emailProvider": "",                    // Gmail works fine, just need to set up 2FA and an app password
    "emailUsername": "",                    // Usernam to your email account
    "emailPassword": "",                    // Password to your email account
    "emailAttachments": 25,                 // How many eBooks to attach to a single email
    "supportedHosting": {                   // Enum to show which WebNovel host sites are supported, NOT configurable
        "NF": "https://novelfull.com/"
    },
    "template": {                           // Template for a WebNovel entry in "novels" below
        "novelURL": "",                     // WebNovel address, it's enough to copy this template to "novels" and fill only this field to start
        "title": "",                        // Autofill
        "author": "",                       // Autofill
        "coverURL": "",                     // Autofill
        "lastChapterURL": false,            // Autofill; Can be used if not starting from the first chapter, first chapter downloaded will be NEXT from this
        "lastVolume": 0,                    // Autofill; Can be used if not starting from the first chapter, first eBook number created will be NEXT from this
        "completed": false,                 // Autofill; Set to false with settings above to download chapters again
        "hosting": "NF",                    // Hosting code, see "supportedHosting"
        "volumeChapterCount": 5,            // After how many new/unread chapters to send a new eBook, ignored if WebNovel is completed
        "completedVolumeChapterCount": 50,  // How many chapters to pack per eBook
        "redownload": false                 // TODO: redownload all chapters, repack into volumes with completedVolumeChapterCount, do not send via email, intended for completed series archiving
    },
    "novels": []                            // Table of 
}
```