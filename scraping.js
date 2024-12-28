const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
];

const runScraper = async () => {
  const origin = "GRU";
  const destination = "JFK";
  const departureDate = "2025-02-13";

  const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(randomUserAgent);
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
  });

  try {
    // Acessar o site
    await page.goto('https://seats.aero/search', { waitUntil: 'networkidle2' });

    // Simular movimento do mouse antes de verificar o captcha
    console.log("Movendo o mouse para simular comportamento humano...");
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(Math.random() * 800);
      const y = Math.floor(Math.random() * 600);
      await page.mouse.move(x, y, { steps: 10 });
      await delay(Math.random() * 1000 + 500); // Pausa aleatória
    }

    // Aguarde a presença do captcha
    console.log("Verificando se o captcha está presente...");
    const captchaSelector = 'div.cb-c label.cb-lb input[type="checkbox"]';
    try {
      await page.waitForSelector(captchaSelector, { timeout: 10000 });
      console.log("Captcha detectado! Tentando clicar...");
      await page.click(captchaSelector);
      console.log("Checkbox do captcha clicado.");
      await delay(5000); // Aguarde o processamento
    } catch (err) {
      console.log("Nenhum captcha encontrado. Continuando...");
    }

    // Preencher origem
    await page.waitForSelector('input.vs__search[aria-labelledby="vs1__combobox"]');
    await page.click('input.vs__search[aria-labelledby="vs1__combobox"]');
    for (const char of origin) await page.keyboard.type(char, { delay: 200 });
    await delay(1500);
    await page.keyboard.press('Enter');
    await delay(2000);

    // Preencher destino
    await page.waitForSelector('input.vs__search[aria-labelledby="vs2__combobox"]');
    await page.click('input.vs__search[aria-labelledby="vs2__combobox"]');
    for (const char of destination) await page.keyboard.type(char, { delay: 200 });
    await delay(1500);
    await page.keyboard.press('Enter');
    await delay(2000);

    // Selecionar data
    const [year, month, day] = departureDate.split('-');
    await page.waitForSelector('input[data-test-id="dp-input"]');
    await page.click('input[data-test-id="dp-input"]');
    await delay(1000);

    await page.click('button[data-dp-element="overlay-year"]');
    await delay(500);
    await page.click(`div[data-test-id="${year}"]`);
    await delay(1000);

    await page.click('button[data-dp-element="overlay-month"]');
    await delay(500);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    await page.click(`div[data-test-id="${monthNames[parseInt(month, 10) - 1]}"]`);
    await delay(1000);

    const daySelector = `div.dp__cell_inner.dp__pointer`;
    const days = await page.$$(daySelector);
    for (const element of days) {
      const text = await page.evaluate((el) => el.textContent.trim(), element);
      if (text === day) {
        await element.click();
        console.log(`Dia ${day} selecionado com sucesso.`);
        break;
      }
    }
    await delay(2000);

    await page.click('button#submitSearch');
    console.log("Botão 'Buscar' clicado.");
    await delay(3000);

    // Clicar em "Econômica"
    await page.click('th[aria-label*="Economy"] span');
    console.log("Botão 'Econômica' clicado.");
    await delay(2000);

    // Clicar no botão de mais informações
    await page.waitForSelector('button.open-modal-btn');
    const infoButtons = await page.$$('button.open-modal-btn');
    if (infoButtons.length > 0) {
      await infoButtons[0].click();
      console.log("Botão de mais informações clicado.");
      await delay(3000);

      // Capturar os links do dropdown
      const linkSelector = '#bookingOptions a.dropdown-item';
      await page.waitForSelector(linkSelector);
      const links = await page.$$eval(linkSelector, (elements) =>
        elements.map((el) => ({
          text: el.textContent.trim(),
          url: el.href,
        }))
      );

      // Exibir os links capturados
      console.log("Links disponíveis:");
      links.forEach((link, index) => {
        console.log(`${index + 1}. ${link.text}: ${link.url}`);
      });

      return links;
    } else {
      throw new Error("Nenhum botão de mais informações encontrado.");
    }
  } catch (error) {
    console.error("Erro detectado:", error.message);
  } finally {
    console.log("Navegador permanece aberto para análise.");
  }
};

// Executar o scraper
runScraper()
  .then((links) => console.log("Links capturados:", links))
  .catch((err) => console.error("Erro geral:", err));
