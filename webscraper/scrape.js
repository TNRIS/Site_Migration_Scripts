import jsdom from 'jsdom';
const { JSDOM } = jsdom;
import fs from 'fs';
import puppeteer from 'puppeteer';

const HOME_PAGE = "https://tnris.org";
const browser = await puppeteer.launch();
const page = await browser.newPage();

// Load homepage.
try {
    await page.goto(HOME_PAGE);
} catch(err) {
    console.error("Error loading TNRIS Homepage.");
    throw err;
}

const HTML = await page.evaluate(() => document.querySelector('*').outerHTML);

const DOM = new JSDOM(HTML);

// Gather the document of the homepage.
const DOCUMENT = DOM.window.document;

// Store urls we found
let urls = ['/'];
let scraped_urls = ['/'];

let l = DOCUMENT.body.getElementsByTagName("a");

// If you are just testing, don't scrape the whole site. Just test with one if posssible.
const SKIP_NON_HOME_FOR_TEST = false;

await addlinks(l);

// Make sure each url was scraped once. If one isn't found scrape it.
await checkUrls();

// Keep checking until urls and scraped_urls are the same length

while(urls.length !== scraped_urls.length) {
    await checkUrls();
}


/**
 * Check each url on page, and add it to the url list if it hasn't been added yet.
 */
async function checkUrls() {
    for(let i = 0; i < urls.length; i++) {
        if(SKIP_NON_HOME_FOR_TEST) {
            break;
        }
        if(!scraped_urls.includes(urls[i])) {
            try {
                try {
                    await page.goto(`${HOME_PAGE}${urls[i]}`);
                } catch(err) {
                    console.error(err);
                    continue;
                }
                
                let html = await page.evaluate(() => document.querySelector('*').outerHTML);
                let dom = new JSDOM(html);

                // Gather the document of the homepage.
                let document = dom.window.document;
                let a_array = document.body.getElementsByTagName("a");
                addlinks(a_array);
            } catch(err) {
                console.error(`Error scraping: ${urls[i]}`);
            } finally {
                scraped_urls.push(urls[i]);
            }
        }
    }
}

/**
 * Read the list of links. If a link is not found in the urls array. Then add it.
 * @param string links a array of urls
 */
async function addlinks(links) {
    for(let i = 0; i < links.length; i++) {
        if(SKIP_NON_HOME_FOR_TEST) {
            break;
        }
        let href = links[i].href;
        if(href.startsWith('/')) {
            if(urls.includes(href)) {
                console.log(`${href} already exists`);
            } else {
                urls.push(href);
            }
            console.log("MATCH " + links[i].href);
        }
    }
}

console.log("SITE SUCCESSFULLY MAPPED. NOW RUNNING METADATA SCRAPER");

// Loop through each of the url's then create an output.txt file with metadata for each. 
for(let i = 0; i < urls.length; i++) {
    
    // Store log for the page.
    let output = "";

    // Increment these ints when api is referenced. 
    let datahub_refs = 0;
    let api_refs = 0;
    let cdn_refs = 0;

    // Page timer storage.
    let startTime = performance.now();
    let endTime = performance.now();

    // Load page the page into puppeteer.
    try {
        startTime = performance.now();
        await page.goto(`${HOME_PAGE}${urls[i]}`);
        endTime = performance.now();
        await wait(); // We need to wait here so that any needed javascript can execute in puppeteer.
    } catch(err) {
        console.error(err);
        continue;
    }

    // Create a DOM 
    let html = await page.evaluate(() => document.querySelector('*').outerHTML);
    let dom = new JSDOM(html);

    // Log the Page url.
    output += `Page: ${HOME_PAGE + urls[i]}\n`;
    output += `######################\n`;

    // Log the download time.
    output += `Download Time ms: ${endTime - startTime}\n`
    output += `######################\n\n`;

    // Log the title 
    const TITLE = dom.window.document.getElementsByTagName("title")[0].text
    output += `Title: ${TITLE} \n`;
    output += `######################\n\n`;

    // Log each meta tag.
    output += `MetaData: \n`
    output += `######################\n`;
    for(let j = 0; j < dom.window.document.getElementsByTagName("meta").length; j++) {
        output += dom.window.document.getElementsByTagName("meta")[j].outerHTML + '\n'
    }
    output += '\n';

    // Log each image and their alt text. Track how many images come from the api.
    output += `Images and alt text\n`;
    output += `######################\n`;

    let img = dom.window.document.getElementsByTagName("img");
    for(let j = 0; j < img.length; j++) {
        if(j!=0)
            output += '\n'

        output += 'src: ' + img[j].src + '\n';
        output += 'alt text: ' + img[j].alt + '\n';

        if(img[j].src.includes("cdn.tnris.org")) {
            cdn_refs++;
        } else if(img[j].src.includes("api.tnris.org")) {
            api_refs++;
        } else if(img[j].src.includes("data.tnris.org")) {
            datahub_refs++;
        }
    }

    // Log each hyperlink. Track how many hyperlinks reference api.
    output += '\n';
    output += `Hyperlinks\n`;
    output += `######################\n`;

    let alinks = dom.window.document.getElementsByTagName("a");
    for(let j = 0; j < alinks.length; j++) {
        output += "href: " + alinks[j].href + "\n";
        if(alinks[j].href.includes("cdn.tnris.org")) {
            cdn_refs++;
        } else if(alinks[j].href.includes("api.tnris.org")) {
            api_refs++;
        } else if(alinks[j].href.includes("data.tnris.org")) {
            datahub_refs++;
        }
    }

    // Log api call information for the page.
    output += '\n';
    output += 'Service references\n';
    output += '######################\n';
    output += `API: ${api_refs}\n`;
    output += `CDN: ${cdn_refs}\n`;
    output += `DATAHUB: ${datahub_refs}\n`;

    // Count how many different image filetypes are on the page.
    output += '\n';
    output += 'Filetypes\n';
    output += `######################\n`;

    let filetypes = "";

    // Add image types
    for(let j = 0; j < img.length; j++) {
        let dotsplit = img[j].src.split('.')

        let type = dotsplit[dotsplit.length-1];
        if(type) {
            if(!filetypes.includes(type)) {
                if(j != 0) {
                    filetypes += ", ";
                }

                filetypes += type;
            }
        }
    }
    output += filetypes;

    //Filename will default to the title if one is setup. Otherwise use the URL.
    let fname = TITLE.length > 0 ? `${TITLE} url_${i}` : `urls[i]_url_${i}`;

    await write_file(fname, output)
}

/**
 * Write the logfile for the page. 
 * @param string fname The file name.
 * @param string output The text in the body for the text file..
 * @return Promise To await until file is completely written to disk.
 */
function write_file(fname, output) {
    return new Promise(function(resolve, reject) {
        try {
            // Replace space with underscore
            fname = fname.replace(/ /gi, '_');

            // Remove all non alphanumeric characters from filename
            fname = fname.replace(/[^a-z0-9_]/gi, '');
            fname += '.txt'

            //Write to the scrapes folder
            if (!fs.existsSync('./metadata')){
                fs.mkdirSync('./metadata');
            }

            fs.writeFile(`./metadata/${fname}`, output, function(err) {
                if(err) {
                    console.log("Error writing output.txt");
                    reject(err)
                } else {
                    resolve("success");
                }
            });
        } catch(err) {
            reject(err);
        }
    });
}

/**
 * Call after loading a page to give the javascript some time to load images if needed.
 * @return Promise To await 2 seconds.
 */
function wait() {
    return new Promise(function(resolve, reject) {
        try{ 
            setTimeout(function() {
                resolve("Done");
            }, 2000)
        } catch(err) {
            reject(err)
        }
    })
}