const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const scrapeFlights = async ({ origin, destination, departureDate }) => {
  const browser = await puppeteer.launch({
    headless: false, // Alterado para false para debug; mude para true quando resolver
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  try {
    console.log('Acessando o site...');
    await page.goto('https://seats.aero/search', { waitUntil: 'networkidle2' });
    await delay(6000);
    
    // Campo de Origem
    console.log('Preenchendo campo de origem...');
    const originSelector = 'input.vs__search[aria-labelledby="vs1__combobox"]';
    await page.waitForSelector(originSelector, { timeout: 30000 });
    await page.click(originSelector);
    for (const char of origin) {
      await page.keyboard.type(char, { delay: 200 });
    }
    await delay(1500);
    await page.keyboard.press('Enter');
    await delay(2000);
    
    // Campo de Destino
    console.log('Preenchendo campo de destino...');
    const destinationSelector = 'input.vs__search[aria-labelledby="vs2__combobox"]';
    await page.waitForSelector(destinationSelector, { timeout: 30000 });
    await page.click(destinationSelector);
    for (const char of destination) {
      await page.keyboard.type(char, { delay: 200 });
    }
    await delay(1500);
    await page.keyboard.press('Enter');
    await delay(2000);
    
    // Campo de Data
    console.log('Selecionando data...');
    const dateSelector = 'input[data-test-id="dp-input"]';
    await page.waitForSelector(dateSelector, { timeout: 30000 });
    await page.click(dateSelector);
    await delay(1000);
    
    const [year, month, day] = departureDate.split('-');
    
    // Seleciona o ano
    await page.click('button[data-dp-element="overlay-year"]');
    await delay(500);
    await page.click(`div[data-test-id="${year}"]`);
    await delay(1000);
    
    // Seleciona o mês
    await page.click('button[data-dp-element="overlay-month"]');
    await delay(500);
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    await page.click(`div[data-test-id="${monthNames[parseInt(month,10)-1]}"]`);
    await delay(1000);
    
    // Seleciona o dia
    const daySelector = 'div.dp__cell_inner.dp__pointer';
    const days = await page.$$(daySelector);
    for (const element of days) {
      const text = await page.evaluate(el => el.textContent.trim(), element);
      if (text === day) {
        await element.click();
        console.log(`Dia ${day} selecionado com sucesso.`);
        break;
      }
    }
    await delay(2000);
    
    // Botão de Search
    console.log('Clicando no botão "Search"...');
    const searchButtonSelector = 'button#submitSearch';
    await page.click(searchButtonSelector);
    await delay(3000);
    
    // Se houver alertas, capturá-los
    const alertSelector = '.alert.alert-warning';
    const alertExists = await page.$(alertSelector);
    if (alertExists) {
      const alertMessage = await page.evaluate(alert => alert.textContent.trim(), alertExists);
      console.log(`Alerta encontrado: ${alertMessage}`);
      return { result: alertMessage };
    }
    
    // Botão "Econômica" e botão de "mais informações" (ajuste se necessário)
    console.log('Tentando clicar no botão "Econômica"...');
    const economySelector = 'th[aria-label*="Economy"] span';
    await page.waitForSelector(economySelector, { timeout: 15000 });
    await page.click(economySelector);
    console.log('Botão "Econômica" clicado.');
    await delay(2000);
    
    console.log('Clicando no botão de mais informações...');
    const infoButtonSelector = 'button.open-modal-btn';
    await page.waitForSelector(infoButtonSelector, { timeout: 20000 });
    const infoButtons = await page.$$(infoButtonSelector);
    if (infoButtons.length > 0) {
      await infoButtons[0].click();
      console.log('Botão de mais informações clicado.');
      await delay(5000);
      
      console.log('Extraindo links do pop-up...');
      const linkSelector = '#bookingOptions a.dropdown-item';
      await page.waitForSelector(linkSelector, { timeout: 20000 });
      const links = await page.$$eval(linkSelector, elements =>
        elements.map(el => `Text: ${el.textContent.trim()}, Link: ${el.href}`)
      );
      console.log('Links extraídos com sucesso.');
      return { result: links };
    } else {
      console.error('Nenhum botão de mais informações encontrado.');
      return { result: 'Nenhum link de reserva encontrado.' };
    }
  } catch (error) {
    console.error('Erro durante o scraping:', error);
    throw error;
  } finally {
    console.log('Fechando o navegador...');
    await browser.close();
  }
};

module.exports = { scrapeFlights };
