const dotenv = require('dotenv');
const path = require('path');
const express = require("express");
// const helmet = require('helmet'); // Настройки безопасности

const app = express();
dotenv.config();

/*
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "img-src": ["'self'", "data:", 'https://www.google-analytics.com', 'https://ssl.google-analytics.com', 'https://www.googletagmanager.com', 'https://eth-rinkeby.alchemyapi.io', 'https://region1.google-analytics.com', 'https://eth-mainnet.alchemyapi.io', 'https://registry.walletconnect.com', 'wss://*.bridge.walletconnect.org', '*.walletconnect.org', '*.infura.io', '*.google-analytics.com', 'wss://*.walletlink.org', '*.walletlink.org', '*.coinbase.com','https://dp.coinbase.com', 'https://dp.coinbase.com/amp'],
      "script-src": ["'self'", "'unsafe-inline'",'https://www.google-analytics.com', 'https://ssl.google-analytics.com', 'https://www.googletagmanager.com', 'https://eth-rinkeby.alchemyapi.io', 'https://region1.google-analytics.com', 'https://eth-mainnet.alchemyapi.io', 'https://registry.walletconnect.com', 'wss://*.bridge.walletconnect.org', '*.walletconnect.org', '*.infura.io', '*.google-analytics.com', 'wss://*.walletlink.org', '*.walletlink.org', '*.coinbase.com','https://dp.coinbase.com', 'https://dp.coinbase.com/amp'],
      "connect-src": ["'self'", 'https://www.google-analytics.com', 'https://ssl.google-analytics.com', 'https://www.googletagmanager.com', 'https://eth-rinkeby.alchemyapi.io', 'https://region1.google-analytics.com', 'https://eth-mainnet.alchemyapi.io', 'https://registry.walletconnect.com', 'wss://*.bridge.walletconnect.org', '*.walletconnect.org', '*.infura.io', '*.google-analytics.com', 'wss://*.walletlink.org', '*.walletlink.org', '*.coinbase.com','https://dp.coinbase.com', 'https://dp.coinbase.com/amp'],
    },
  },
}));
*/

// ----- Incoming DATA types -----
// for JSON
const bodyParser = require('body-parser');
// for JSON parsing
app.use(bodyParser.json());
// for URL type like "Amount=4&userAddress=Alex"
app.use(bodyParser.urlencoded({ extended: true }));

// ----- For cookie -----
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// ----- For multi-domains -----
const cors = require('cors');
app.use(cors());

// Connect to MongoDB
const dbo = require('./db/conn');

// ----- Routes -----
var routeRamen = require('./routes/ramen.js');
app.use('/api/ramen', routeRamen);
/*
var routeWhitelists = require('./routes/whitelists.js');
app.use('/api/whitelists', routeWhitelists);
*/

// Have Node serve the files for our built React app
app.use(express.static(path.resolve(__dirname, '../client/build_prod')));

// All other GET requests not handled before will return our React app
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build_prod', 'index.html'));
});

// ----- PORT -----
let port = process.env.PORT || 3003;

// perform a database connection when the server starts
dbo.connectToServer(function (err) {
  if (err) {
    console.error(err);
    process.exit();
  }

  // start the Express server
  app.listen(port, (error) => {
    if (error) return console.log(`Error: ${error}`);
    console.log(`App running on port ${port} `);
  });
});