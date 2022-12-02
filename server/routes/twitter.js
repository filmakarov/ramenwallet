var express = require('express');
var router = express.Router();
const dbo = require('../db/conn');

const oauthCallback = process.env.TWITTER_CALLBACK_URL;
const oauth = require('./../lib/oauth-promise')(oauthCallback);
const COOKIE_NAME = 'oauth_token';

//our in-memory secrets database.
//Can be a key-value store or a relational database
let tokens = {};

// middleware that is specific to this router
// router.use((req, res, next) => {
//    console.log('Time: ', Date.now())
//    next()
//})

/*
router.get('/', (req, res) => {
    res.json({ message: "Good day, commander!" });
})
*/

//OAuth Step 1
/*
router.post('/oauth/request_token', async (req, res) => {
  const {oauth_token, oauth_token_secret} = await oauth.getOAuthRequestToken();
  
  res.cookie(COOKIE_NAME, oauth_token , {
      maxAge: 15 * 60 * 1000, // 15 minutes
      secure: true,
      httpOnly: true,
      sameSite: true
  });

  tokens[oauth_token] = { oauth_token_secret };
  res.json({ oauth_token });
});
*/

//OAuth Step 3
/*
router.post('/oauth/access_token', async (req, res) => {
  try {
      const {oauth_token: req_oauth_token, oauth_verifier} = req.body;
      const oauth_token = req.cookies[COOKIE_NAME];
      const oauth_token_secret = tokens[oauth_token].oauth_token_secret;

      // console.log('1. req_oauth_token: ' + req_oauth_token);
      // console.log('2. oauth_verifier: ' + oauth_verifier);
      // console.log('3. req.cookies: ' + oauth_token);
      // console.log('4. oauth_token_secret: ' + oauth_token_secret);
      
      if (oauth_token !== req_oauth_token) {
        res.status(403).json({message: "Request tokens do not match"});
        return;
      }
      
      const {oauth_access_token, oauth_access_token_secret} = await oauth.getOAuthAccessToken(oauth_token, oauth_token_secret, oauth_verifier);
      // console.log('5. oauth_access_token: ' + oauth_access_token);
      // console.log('6. oauth_access_token_secret: ' + oauth_access_token_secret);

      tokens[oauth_token] = { ...tokens[oauth_token], oauth_access_token, oauth_access_token_secret };
      res.json({success: true});
      // console.log('7. Всё заебись');
    } catch(error) {
      res.status(403).json({message: "Missing access token"});
    }
});
*/

//Authenticated resource access
/*
router.get("/users/profile_banner/:address", async (req, res) => {
  var address = req.params.address;
  address = address.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
  address = address.replace(/[^a-z0-9]/gi, '');
  address = address.trim();
  address = address.toLowerCase();

  try {
    const oauth_token = req.cookies[COOKIE_NAME];
    // console.log('8. oauth_token: ' + oauth_token);

    const { oauth_access_token, oauth_access_token_secret } = tokens[oauth_token]; 
    // console.log('9. oauth_access_token: ' + oauth_access_token);
    // console.log('10. oauth_access_token_secret: ' + oauth_access_token_secret);

    const response = await oauth.getProtectedResource("https://api.twitter.com/2/users/me", "GET", oauth_access_token, oauth_access_token_secret);
    // console.log('Got users data from tiwtter!');
    
    user_data = JSON.parse(response.data);
    res.json(user_data);

    if(user_data){
        if(address !== '0'){
            // console.log('Проверяем, есть ли такой юзер в базе');
            
            const dbConnect = dbo.getDb();
            dbConnect.collection("twitters").findOne({"address": address}, async function (err, result) {
                if (err) {
                    // console.log('DB connect error');
                } else {
                    if(result){
                        // console.log('User already in DB');
                    } else {
                        // console.log('Добавляем юзера в Waiting List');
                        // console.log('Address: ' + address);
                        // console.log('Nickname: ' + user_data.data.username);

                        const userInfo = {
                          address: address,
                          twitter_login: user_data.data.username,
                          last_modified: new Date()
                        };

                        dbConnect.collection("twitters").insertOne(userInfo, function (err, result) {
                          if (err) {
                              // console.log('Connection error!');
                          } else {
                              // console.log('User added to Waiting list!');
                              // console.log(' ');
                          }
                      });
                    }
                }
            });
        } 
    }
  } catch(error) {
    // console.log(error);
    res.status(403).json({message: "Missing, invalid, or expired tokens"});
  } 
});
*/

/*
router.post("/logout", async (req, res) => {
  try {
    const oauth_token = req.cookies[COOKIE_NAME];
    delete tokens[oauth_token];
    res.cookie(COOKIE_NAME, {}, {maxAge: -1});
    res.json({success: true});
  } catch(error) {
    res.status(403).json({message: "Missing, invalid, or expired tokens"});
  }
});
*/

module.exports = router;