# WNtoEmail
Node.js script to download new WebNovel chapters convert them to eBook and send to email. Mainly intended for sending to Kindle.
Script will pack your WebNovels into convenient eBooks, complete with cover image, metadata and table of contents. For ongoing series it will wait for a configured number of new chapters before sending a new volume to avoid spam.

# Dependencies
It's a Node.js project so install that.
Project is using `node-html-parser` and `nodemailer` libraries. It should be enough to:
```
npm install --save node-html-parser
npm install --save nodemailer
```

https://github.com/vercel/pkg for deploying to binary files.

I'm using fetch, which is an experimental feature, it might work differently on different versions. Script written on Node version `v18.4.0`
> ExperimentalWarning: The Fetch API is an experimental feature. This feature could change at any time

# Config
At first start it will create an empty config file `./novelConfig.conf`, adjust the setting according to comments below:
```
{
    "downloadLocation": "",                 // New chapter download location, "./Download" as an absolute
                                               // path recommended
    "converterPath": "ebook-convert.exe",   // Calibre eBook converter, I recommend adding it to you PATH,
                                               // NOT tested when it's not in PATH
    "ebookFormat": "epub",                  // Desired eBook format, Kindle started supporting epub so
                                               // that's default
    "sendEmail": false,                     // If the script should send eBooks via email
    "emailToAddress": "",                   // Email where to send your eBooks
    "emailFromAddress": "",                 // Important for Kindle deliveries, make sure you have it added
                                               // in Kindle settings
    "emailProvider": "",                    // Gmail works fine, just need to set up 2FA and an app password
    "emailUsername": "",                    // Username to your email account
    "emailPassword": "",                    // Password to your email account
    "emailAttachments": 25,                 // How many eBooks to attach to a single email
    "supportedHosting": {                   // Supported WN host sites, NOT configurable
        "NF": "https://novelfull.com/"
    },
    "template": {                           // Template for a WebNovel entry in "novels" below
        "novelURL": "",                     // WebNovel address, it's enough to copy this template to
                                               // "novels" and fill only this field to start
        "title": "",                        // Autofill
        "author": "",                       // Autofill
        "coverURL": "",                     // Autofill
        "lastChapterURL": false,            // Autofill; Can be used if not starting from the first chapter,
                                               // first chapter downloaded will be NEXT from this
        "lastVolume": 0,                    // Autofill; Can be used if not starting from the first chapter,
                                               // first eBook number created will be NEXT from this
        "completed": false,                 // Autofill; Set to false with settings above to download
                                               // chapters again; Set to true to skip checking the novel
        "hosting": "NF",                    // Hosting code, see "supportedHosting"
        "volumeChapterCount": 5,            // After how many new/unread chapters to send a new eBook,
                                               // ignored if WebNovel is completed
        "completedVolumeChapterCount": 50,  // How many chapters to pack per eBook
        "redownload": false                 // Redownload all chapters, repack into volumes, do not send via
                                               // email, intended for completed series archiving
        "sendOnly": false,                  // Only send epub files via email, for cases with external
                                               // source of epub files
        "sendOnlyRegex": ""(?<volume>\\d*). (?<title>.*); (?<author>.*)"" // Metadata regex for extracting
                                               // information from filename for external sources
    },
    "novels": [
                                            // Table of novels to process, insert the template structure
                                               // from above here
    ]
}
```
For some reason Amazon just forgets the cover and TOS on conversion from epub. Both features worked correctly with mobi, but that format is being phased out. From what I found, Amazon is being an ass about it and is ignoring built in metadata in favor of getting them from their book database. So sending books not bought from them is made intentionally inferior.

# Volume numbering
Let's assume WN series has 168 chapters and we're using default settings:
```
"volumeChapterCount": 5,
"completedVolumeChapterCount": 50,
```

For completed series it would create 4 volumes:
- Volume 1 - chapters 1 - 50
- Volume 2 - chapters 51 - 100
- Volume 3 - chapters 101 - 150
- Volume 4 - chapters 151 - 168

For ongoing series it would create 6 volumes:
- Volume 1 - chapters 1 - 50
- Volume 2 - chapters 51 - 100
- Volume 3 - chapters 101 - 150
- Volume 4 - chapters 151 - 155
- Volume 5 - chapters 156 - 160
- Volume 6 - chapters 161 - 165
- and a new volume for every 5 chapters released


# Usage
Grab the latest release and run the binary.

OR

Run the script directly from cloned project with Node.js.

Intended usage is with a Task Scheduler on Windows. There shouldn't be anything OS specific. Cron on Linux should work after modifying `"converterPath"` to an appropriate command, but that's untested.
At present there is no crash resiliency, if the program crashes for any reason `"lastChapterURL"`, `"lastVolume"` and `"completed"` config will not be consistent and needs to be corrected. There is a copy of config file created at the start.

## Send to Kindle
[Kindle help page](https://www.amazon.com/gp/help/customer/display.html?nodeId=GX9XLEVV8G4DB28H) can help you with setup. You need to assign the device you want to use an email address (there should already be one with some random ID, you can change it something more convenient) and add your email used for sending to the allowed list.
