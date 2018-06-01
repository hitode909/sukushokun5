const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const iPhone = devices['iPhone 6'];

class Fetcher {
  async getBrowser() {
    if (this._browser) return this._browser;
    const puppeteerOptions = {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    };
    const browser = await puppeteer.launch(puppeteerOptions);
    this._browser = browser;
    return this._browser;
  }

  async closeBrowser() {
    const browser = await this.getBrowser();
    await browser.close();
  }

  // returns [[filename, buffer]]
  async capture(uri) {
    const result = [];
    await Promise.all([
      this.capturePC(uri, result),
      this.captureSP(uri, result)
    ]);
    return result;
  }

  async capturePC(uri, result) {
    const page = await this.visit(uri);
    const imgbuffer = await page.screenshot({ fullPage: true, type: 'png' });
    const title = await page.title();
    const content = await page.content();
    result.push({ type: 'pc', ext: 'png', description: title, buffer: imgbuffer, contentType: 'image/png' });
    await page.emulateMedia('screen');
    const pdfbuffer = await page.pdf();
    result.push({ type: 'pc', ext: 'pdf', description: title, buffer: pdfbuffer, contentType: 'application/pdf' });
    await page.close();
  }

  async captureSP(uri, result) {
    const page = await this.visit(uri, async (page) => { await page.emulate(iPhone); });
    const imgbuffer = await page.screenshot({ fullPage: true, type: 'png' });
    const title = await page.title();
    const content = await page.content();
    result.push({ type: 'sp', ext: 'png', description: title, buffer: imgbuffer, contentType: 'image/png' });
    await page.close();
  }

  async visit(uri, cb) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    if (cb) {
      await cb(page);
    }
    try {
      await page.goto(uri, { timeout: 60 * 1000, waitUntil: 'networkidle2' });
    } catch (error) {
      console.log(`ignoring error: ${error}`);
    }
    return page;
  }
};

module.exports = Fetcher;
