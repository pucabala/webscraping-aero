const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const scrapeFlights = async ({ origin, destination, departureDate }) => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  try {
    console.log('Acessando o site...');
    await page.goto('https://seats.aero/search', { waitUntil: 'networkidle2' });
    
    // Aguarda um tempo extra para que o DOM seja renderizado completamente
    await delay(8000);
    
    // Usa waitForFunction para garantir que o input de origem esteja presente
    console.log('Aguardando o input de origem...');
    await page.waitForFunction(
      () => !!document.querySelector('input.vs__search[aria-labelledby="vs1__combobox"]'),
      { timeout: 60000 }
    );
    
    // Campo de Origem
    console.log('Preenchendo campo de origem...');
    const originSelector = 'input.vs__search[aria-labelledby="vs1__combobox"]';
    await page.click(originSelector);
    for (const char of origin) {
      await page.keyboard.type(char, { delay: 200 });
    }
    await delay(1500);
    await page.keyboard.press('Enter');
    await delay(2000);
    
    // Campo de Destino
    console.log('Aguardando o input de destino...');
    await page.waitForFunction(
      () => !!document.querySelector('input.vs__search[aria-labelledby="vs2__combobox"]'),
      { timeout: 60000 }
    );
    
    console.log('Preenchendo campo de destino...');
    const destinationSelector = 'input.vs__search[aria-labelledby="vs2__combobox"]';
    await page.click(destinationSelector);
    for (const char of destination) {
      await page.keyboard.type(char, { delay: 200 });
    }
    await delay(1500);
    await page.keyboard.press('Enter');
    await delay(2000);
    
    // Campo de Data
    console.log('Aguardando o input de data...');
    const dateSelector = 'input[data-test-id="dp-input"]';
    await page.waitForFunction(
      () => !!document.querySelector('input[data-test-id="dp-input"]'),
      { timeout: 60000 }
    );
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
    let dayFound = false;
    for (const element of days) {
      const text = await page.evaluate(el => el.textContent.trim(), element);
      if (text === day) {
        await element.click();
        console.log(`Dia ${day} selecionado com sucesso.`);
        dayFound = true;
        break;
      }
    }
    if (!dayFound) {
      console.warn(`Dia ${day} não foi encontrado.`);
    }
    await delay(2000);
    
    // Botão de Search
    console.log('Clicando no botão "Search"...');
    const searchButtonSelector = 'button#submitSearch';
    await page.waitForFunction(
      () => !!document.querySelector('button#submitSearch'),
      { timeout: 60000 }
    );
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
    
    // Botão "Econômica" e "mais informações" (se necessário, ajustar conforme o HTML)
    console.log('Tentando clicar no botão "Econômica"...');
    const economySelector = 'th[aria-label*="Economy"] span';
    await page.waitForFunction(
      () => !!document.querySelector('th[aria-label*="Economy"] span'),
      { timeout: 30000 }
    );
    await page.click(economySelector);
    console.log('Botão "Econômica" clicado.');
    await delay(2000);
    
    console.log('Clicando no botão de mais informações...');
    const infoButtonSelector = 'button.open-modal-btn';
    await page.waitForFunction(
      () => !!document.querySelector('button.open-modal-btn'),
      { timeout: 30000 }
    );
    const infoButtons = await page.$$(infoButtonSelector);
    if (infoButtons.length > 0) {
      await infoButtons[0].click();
      console.log('Botão de mais informações clicado.');
      await delay(5000);
      
      console.log('Extraindo links do pop-up...');
      const linkSelector = '#bookingOptions a.dropdown-item';
      await page.waitForFunction(
        () => !!document.querySelector('#bookingOptions a.dropdown-item'),
        { timeout: 30000 }
      );
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
