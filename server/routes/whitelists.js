var express = require('express');
var router = express.Router();
const dbo = require('../db/conn');
const ethers = require("ethers");

// Такой же abi как в файле /client/src/abi.js
const abi = require('../../client/src/abi.js');
const abiStorage = abi.abiStorage;

// Key for Sign Wallet. Приватный ключ от кошелька, которым подписываем сообщения.
let privateKey = process.env.SIGN_WALLET_PRIVATE_KEY;

let isMainnet = true;
const checkMainnet = process.env.REACT_APP_CONTRACT_IS_MAINNET;
if(checkMainnet === 'false'){
    isMainnet = false;
}

// Mainnet
let contractAddr = process.env.REACT_APP_CONTRACT_ADD_MAINNET; 
let provider = ethers.getDefaultProvider('homestead', { alchemy: process.env.REACT_APP_ALCHEMY_API_KEY }); 
let allowences_mint_id = 2;

// Testnet goerli
if(!isMainnet){
    contractAddr = process.env.REACT_APP_CONTRACT_ADD_TESTNET; 
    provider = ethers.getDefaultProvider('goerli', { alchemy: process.env.REACT_APP_ALCHEMY_API_KEY });
    allowences_mint_id = 1;
}

// Для генерации подписи нам нужен айдищник, который с каждой подписью растет на 1. Чтобы в тестнете и мейннете они были разными и можно было легко переключаться - вводим параметр allowences_mint_id.
// Для testNet он = 1
// Для mainNet он = 2

// Подключаемся к контракту и кошельку
let minterContract = new ethers.Contract(contractAddr, abiStorage, provider);
let wallet = new ethers.Wallet(privateKey);

// middleware that is specific to this router
// router.use((req, res, next) => {
//    console.log('Time: ', Date.now())
//    next()
//})

/*
router.get('/', (req, res) => {
    res.send('Good day, commander!');
})
*/

// Проверяем есть ли пользователь в allowlist - используем перед минтом, чтобы просто проверять есть ли пользователь в списке
router.get('/amountbyaddress/:address', async (req, res) => {
    // Return success: true + signature and nonce if we have user in DB
    var address = req.params.address;
    address = address.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    address = address.replace(/[^a-z0-9]/gi, '');
    address = address.trim();
    address = address.toLowerCase();

    var api_key = req.headers.apimkey;

    var host_env = String(process.env.REACT_APP_ALLOW_HOST_FOR_POST);
    var host_req = String(req.hostname);

    if(host_req === host_env){
        if(api_key){
            if(api_key === process.env.REACT_APP_API_M_KEY){
                if(address){
                    // console.log('Address is: ' + address);
                    // console.log('Get Amount from DB');

                    const dbConnect = dbo.getDb();
                    dbConnect.collection("allowlists").findOne({"address": address}, async function (err, result) {
                        if (err) {
                            // console.log('DB connect error');
                            res.status(400).send("DB connect error");
                        } else {
                            if(result){
                                // console.log('User in Allowlist');
                                res.json({success: true});
                            } else {
                                // console.log('User NOT in Allowlist');
                                res.json({success: false});
                            }
                        }
                    });
                } else {
                    res.status(400).json({error: 'No access'});
                }
            } else {
                res.status(403).json({message: "No access"});
            }
        } else {
            res.status(403).json({message: "No access"});
        }
    } else {
        res.status(403).json({message: "No access"});
    }
})

// Проверяем есть ли пользователь в allowlist - используем на странице минта. Возвращает nonce и signature
router.get('/canmintbyaddress/:address', async (req, res) => {
  // Return success: true + signature and nonce if we have user in DB
  var address = req.params.address;
  address = address.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
  address = address.replace(/[^a-z0-9]/gi, '');
  address = address.trim();
  address = address.toLowerCase();

  var api_key = req.headers.apimkey;

  var host_env = String(process.env.REACT_APP_ALLOW_HOST_FOR_POST);
  var host_req = String(req.hostname);

  if(host_req === host_env){
      if(api_key){
          if(api_key === process.env.REACT_APP_API_M_KEY){
              if(address){
                  // console.log('Address is: ' + address);
                  // console.log('Get Amount from DB');

                  const dbConnect = dbo.getDb();
                  dbConnect.collection("allowlists").findOne({"address": address, "state": 1}, async function (err, result) {
                      if (err) {
                        //   console.log('DB connect error');
                          res.status(400).send("DB connect error");
                      } else {
                          if(result){
                              // Пользователь есть в базе, но надо проверить валидные ли у него signature и nonce
                              const user_nonce = result.nonce;
                              const user_signature = result.signature;

                              if(user_signature){
                                  if(user_nonce){
                                    // console.log('User in DB');
                                    // console.log('Signature: ' + user_signature);
                                    // console.log('Nonce: ' + user_nonce);
                                    //   console.log('Address: ' + address);
                                    //   console.log(' ');
                                        
                                      try {
                                          const resultIsSignatureValid = await minterContract.validateSignature(address, user_nonce, user_signature);
  
                                          if(resultIsSignatureValid){
                                            //   console.log('Validation result: ' + resultIsSignatureValid);
                                              // console.log('Signature is valid');
                                              res.json({success: true, signature: user_signature, nonce: user_nonce});
                                          } else {
                                              // console.log('No responce from contact');
                                              res.json({success: false});
                                          }
                                      } catch (error) {
                                          // console.log('Contact error:');
                                          // console.log('Reason: ' + error.reason);

                                          if(error.reason === '!ALREADY_USED!'){
                                            res.json({success: false, msg: "alreadyUsed"});
                                          } else {
                                            res.json({success: false, msg: "1"});
                                          }


                                          //   Reason: !ALREADY_USED!
                                              
                                          // *** State = 2 for invalid signature ***
                                          /*
                                          dbConnect.collection("mintlists").findOneAndUpdate({"address": address}, {$set :{'state': 2}}, async function (err, result) {
                                              if (err) {
                                                //   console.log("Signature delete error");
                                                  res.json({success: false, msg: 1});
                                              } else {
                                                //   console.log("Signature deteled");
                                                  res.json({success: false, msg: 1});
                                              }
                                          });
                                          */
                                      }
                                  } else {
                                      //   console.log('User NOT in DB');
                                      res.json({success: false});
                                  }
                              } else {
                                  //   console.log('User NOT in DB');
                                  res.json({success: false});
                              }
                          } else {
                              res.json({success: false});         
                          }
                      }
                  });
              } else {
                  res.status(400).json({error: 'No access'});
              }
          } else {
              res.status(403).json({message: "No access"});
          }
      } else {
          res.status(403).json({message: "No access"});
      }
  } else {
      res.status(403).json({message: "No access"});
  }
})



















// ***** CANVAS *****

// Проверяем есть ли пользователь в allowlist_canvas - используем на странице минта. Возвращает nonce и signature и количество
router.get('/canvas/canmintbyaddress/:address', async (req, res) => {
    // Return success: true + signature and nonce if we have user in DB
    var address = req.params.address;
    address = address.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    address = address.replace(/[^a-z0-9]/gi, '');
    address = address.trim();
    address = address.toLowerCase();
  
    var api_key = req.headers.apimkey;
  
    var host_env = String(process.env.REACT_APP_ALLOW_HOST_FOR_POST);
    var host_req = String(req.hostname);
  
    if(host_req === host_env){
        if(api_key){
            if(api_key === process.env.REACT_APP_API_M_KEY){
                if(address){
                    // console.log('Address is: ' + address);
                    // console.log('Get CANVAS Amount from DB');
  
                    const dbConnect = dbo.getDb();
                    dbConnect.collection("allowlists_canvas").findOne({"address": address}, async function (err, result) {
                        if (err) {
                          //   console.log('DB connect error');
                            res.status(400).send("DB connect error");
                        } else {
                            if(result){
                                // console.log('Пользователь есть в базе, но надо проверить валидные ли у него signature и nonce');
                                const user_amount = result.amount;
                                const user_state = result.state;

                                const user_nonce = result.nonce;
                                const user_signature = result.signature;
                                const user_signature_amount = result.signature_amount;
                                
                                // console.log('Address: ' + address);
                                // console.log('Amount: ' + user_amount);
                                // console.log('State: ' + user_state);
                                // console.log('Signature: ' + user_signature);
                                // console.log('Nonce: ' + user_nonce);
                                // console.log('signature Amount: ' + user_signature_amount);
                                // console.log(' ');

                                if(user_state === 0){
                                    // console.log('User in DB - state 0');
                                    res.json({success: true, state: 0, amount: user_amount});
                                } else {
                                    if(user_state === 1){
                                        if(user_signature && user_nonce && user_signature_amount){
                                            try {
                                                const resultIsSignatureValid = await minterContract.validateSignature(address, user_nonce, user_signature);
        
                                                if(resultIsSignatureValid){
                                                    // console.log('Signature is valid');
                                                    // console.log('User in DB - state 1');
                                                    res.json({success: true, state: 1,  signature: user_signature, nonce: user_nonce, signature_amount: user_signature_amount});
                                                } else {
                                                    // console.log('No responce from contact');
                                                    res.json({success: false});
                                                }
                                            } catch (error) {
                                                //   Reason: !ALREADY_USED!
                                                // console.log('Contact error:');
                                                // console.log('Reason: ' + error.reason);
      
                                                if(error.reason === '!ALREADY_USED!'){
                                                    // console.log('User in DB - state 1');
                                                    res.json({success: true, state: 2});
                                                } else {
                                                    res.json({success: false});
                                                }
                                            }
                                        } else {
                                            res.json({success: false}); 
                                        }
                                    } else {
                                        res.json({success: false}); 
                                    }
                                }
                            } else {
                                res.json({success: false});         
                            }
                        }
                    });
                } else {
                    res.status(400).json({error: 'No access'});
                }
            } else {
                res.status(403).json({message: "No access"});
            }
        } else {
            res.status(403).json({message: "No access"});
        }
    } else {
        res.status(403).json({message: "No access"});
    }
})

// Make signature
router.post('/canvas/getsignature', async(req, res) => {
    var address = req.body.address;
    address = address.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    address = address.replace(/[^a-z0-9]/gi, '');
    address = address.trim();
    address = address.toLowerCase();

    var amount = req.body.amount;
    amount = parseInt(amount);
    if(!amount){
        amount = 1;
    }

    const price = "20000000000000000";
    
    var api_key = req.headers.apimkey;
    var host_env = String(process.env.REACT_APP_ALLOW_HOST_FOR_POST);
    var host_req = String(req.hostname);

    if(host_req === host_env){
        if(api_key){
            if(api_key === process.env.REACT_APP_API_M_KEY){
                if(address){
                    if(amount > 0){
                        // console.log('Данные получили:');
                        // console.log(address);
                        // console.log('Anount for mint: ' + amount);

                        const dbConnect = dbo.getDb();
                        dbConnect.collection("allowlists_canvas").findOne({"address": address}, async function (err, result) {
                            if (err) {
                                //   console.log('DB connect error');
                                res.status(400).send("DB connect error");
                            } else {
                                if(result){
                                    // console.log('max_amount: ' + result.amount);
                                    const max_amount = result.amount;
                                    if(amount > max_amount){
                                        amount = max_amount;
                                    }

                                    dbConnect.collection("allowances").findOne({"mint_id": allowences_mint_id}, async function (err, result) {
                                        if (err) {
                                            res.status(400).send("No allowances");
                                            // console.log("No allowances");
                                        } else {
                                            if(result){
                                                let allowanceId = (result.last_id + 1);
                                                // console.log('allowanceId: ' + allowanceId);
                
                                                const idBN = ethers.BigNumber.from(allowanceId).shl(64);
                                                const idAndQty = idBN.add(amount);
                                                const idAndQtyShifted = idAndQty.shl(128);
                                                const nonce = idAndQtyShifted.add(price);

                                                // *** Add new allowanceId to DB ***
                                                dbConnect.collection("allowances").findOneAndUpdate({"mint_id": allowences_mint_id}, {$set :{'last_id': allowanceId}}, async function (err, result) {
                                                    if (err) {
                                                        // console.log("allowances update error");
                                                    } else {
                                                        // console.log("allowances update DONE");
                                                    }
                                                });
                                                  
                                                // console.log('Nonce:');
                                                // console.log(nonce);
                        
                                                const message = await minterContract.createMessage(address, nonce);
                                                if(message){
                                                    // console.log("Msg: " + message);
                                                                                  
                                                    let signPromise = wallet.signMessage(ethers.utils.arrayify(message))
                                                    signPromise.then((signature) => {
                                                        // console.log('Signature:');
                                                        // console.log(signature);

                                                        res.json({success: true, nonce: nonce, signature: signature});    
                
                                                        dbConnect.collection("allowlists_canvas").findOne({"address": address}, async function (err, result) {
                                                            if (err) {
                                                                res.status(400).send("DB connect error");
                                                            } else {
                                                                if(result){
                                                                      // Такой кошелек есть в базе - нужно обновить данные
                                                                      // console.log('Обновляем данные существующего юзера');
                                                                                            
                                                                      dbConnect.collection("allowlists_canvas").findOneAndUpdate({"address": address}, {$set :{'state': 1, 'nonce': nonce, 'signature': signature, 'signature_amount': amount}}, async function (err, result) {
                                                                          if (err) {
                                                                                // console.log("ОШИБКА при добавлении подпись пользователю");
                                                                          } else {
                                                                                // console.log("Добавили подпись пользователю");
                                                                          }
                                                                      });  
                                                                }
                                                            }
                                                        });
                                                    });
                                                } else {
                                                    res.json({success: false});
                                                }
                                            } else {
                                                res.json({success: false});
                                            }
                                        }
                                    });
                                } else {
                                    res.json({success: false});         
                                }
                            }
                        });
                    } else {
                        res.status(400).json({error: "No access"});
                    }
                } else {
                    res.status(400).json({error: "No access"});
                }
            } else {
                res.status(403).json({message: "No access"});
            }
        } else {
            res.status(403).json({message: "No access"});
        }
    } else {
        res.status(403).json({message: "No access"});
    }
})













module.exports = router;