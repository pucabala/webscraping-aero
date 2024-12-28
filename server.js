const express = require('express');
const { scrapeFlights } = require('./scraping-final');

const app = express();
app.use(express.json());

// Endpoint para buscar passagens
app.post('/search-flights', async (req, res) => {
  const { origin, destination, departureDate } = req.body;

  // Validação básica dos dados recebidos
  if (!origin || !destination || !departureDate) {
    return res.status(400).json({ error: 'Os campos origin, destination e departureDate são obrigatórios.' });
  }

  try {
    const results = await scrapeFlights({ origin, destination, departureDate });
    return res.json({ results });
  } catch (error) {
    console.error('Erro durante a execução do endpoint:', error);
    return res.status(500).json({ error: 'Erro durante o scraping. Tente novamente mais tarde.' });
  }
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
