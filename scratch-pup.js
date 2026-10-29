const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });

  console.log('Navigating to admin login...');
  await page.goto('http://localhost:3000/admin/login');
  
  // Actually, we can just use the demo login on /auth
  await page.goto('http://localhost:3000/auth');
  console.log('On auth page, clicking login as officer...');
  
  // wait for the button "Login as Officer (Demo)"
  await page.waitForSelector('button');
  const buttons = await page.$$('button');
  let clicked = false;
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text.includes('Officer (Demo)')) {
      await btn.click();
      clicked = true;
      break;
    }
  }
  if (!clicked) {
    console.log('Could not find Officer demo button, clicking the first submit button just in case');
    await buttons[0].click();
  }

  await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
  console.log('Navigated, current URL:', page.url());

  console.log('Going to /officer/map');
  await page.goto('http://localhost:3000/officer/map', { waitUntil: 'networkidle0' });
  
  console.log('Map page loaded. Waiting a bit for Leaflet errors...');
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
