var express = require('express');
var router = express.Router();
const dbo = require('../db/conn');
const fetch = require("node-fetch");

const abiF = require('../../client/src/abi.js');
const abiStorage = abiF.abiStorage;

const authToken = "18711fc0-ef2a-484c-b94d-56758406a2ea";
const apiKey = "iBKW4cFsx.807b0d3f-5d68-4572-84b4-4d5dd0d59bd9";
const addContractUrl = "https://api.biconomy.io/api/v1/smart-contract/public-api/addContract";
const addMethodUrl = "https://api.biconomy.io/api/v1/meta-api/public-api/addMethod";


//Clean address
const getCleanAddress = function (rawAddress) {
    let cleanAddress = rawAddress.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
            cleanAddress = cleanAddress.replace(/[^a-z0-9]/gi, '');
            cleanAddress = cleanAddress.trim();
            cleanAddress = cleanAddress.toLowerCase();
    return cleanAddress;
}
    
var abi = JSON.stringify(abiStorage);

const registerContract = async function(newRamenContractAddress, walletId) {

    var formDataC = new URLSearchParams({
        "contractName" : "Timelock Wallet " + walletId,
        "contractAddress" : newRamenContractAddress,
        "abi" : abi,
        "contractType" : "SC",
        "metaTransactionType": "DEFAULT"
      });

    let formDataM = new URLSearchParams({
        "apiType" : "custom",
        "methodType" : "write",
        "name": "metatxn",
        "contractAddress" : newRamenContractAddress,
        "method" : "executeMetaTransaction"
       }) 
       
    const requestOptionsC = {
        method: 'POST',
        headers: {  "Content-Type": "application/x-www-form-urlencoded", "authToken": authToken, "apiKey" : apiKey },
        body: formDataC
    };

    const requestOptionsM = {
        method: 'POST',
        headers: {  "Content-Type": "application/x-www-form-urlencoded", "authToken": authToken, "apiKey" : apiKey },
        body: formDataM
    };
      
    fetch(addContractUrl, requestOptionsC)
        .then(response => response.json())
        .then(function (data) {
            console.log("Contract registration response: ", data);
            return fetch(addMethodUrl, requestOptionsM);
        })
        .then(response => response.json())     
        .then(function (data) {
            console.log("Method registration response: ", data);

            // RETURN API ID

        })
        .catch(error => console.error('Error:', error));

}

// const registerMethods = async function(newRamenContractAddress) {

//       const requestOptions = {
//         method: 'POST',
//         headers: {  "Content-Type": "application/x-www-form-urlencoded", "authToken": authToken, "apiKey" : apiKey },
//         body: formData
//       };
      
//       fetch(addMethodUrl, requestOptions)
//         .then(response => response.json())
//         .then(data => console.log("Method registration response: ", data))     
//         .catch(error => console.error('Error:', error));

// }


router.get('/', (req, res) => {
    res.send('Good day, commander!');
})

router.get('/getramen/:address', async (req, res) => {
    var address = getCleanAddress(req.params.address);

    var api_key = req.headers.apimkey;

    var host_env = String(process.env.REACT_APP_ALLOW_HOST_FOR_POST);
    var host_req = String(req.hostname);
    //console.log(host_req, host_env, api_key, process.env.REACT_APP_API_M_KEY);
    
    if(host_req === host_env){
        
        if(api_key){
            if(api_key === process.env.REACT_APP_API_M_KEY){
                
                if(address){
                    //console.log('Address is: ' + address);
                    //console.log('Get Ramen from DB');

                    const dbConnect = dbo.getDb();
                    
                    dbConnect.collection("users").findOne({"userAddress": address}, async function (err, result) {
                        if (err) {
                            // console.log('DB connect error');
                            res.status(400).send("DB connect error");
                        } else {
                            if(result){
                                // console.log('User in Allowlist');
                                res.json({success: true, ramenAddress: result.ramenAddress});
                            } else {
                                // console.log('User NOT in Allowlist');
                                res.json({success: false});
                            }
                        }
                    });
                    
                    //res.json({success: true, ramenAddress: "0x797158Fd06F1a8eC6AB09C78Ae2Dd3D2C13762C8"});

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

router.post('/setramen/:ownerAddress/:ramenAddress/:walletId', async (req, res) => {
    //var ownerAddress = getCleanAddress(req.params.ownerAddress);
    //var ramenAddress = getCleanAddress(req.params.ramenAddress);
    // they come already clean
    var ownerAddress = req.params.ownerAddress;
    var ramenAddress = req.params.ramenAddress;
    var walletId = req.params.walletId;

    var api_key = req.body.headers.APIMKEY;

    var host_env = String(process.env.REACT_APP_ALLOW_HOST_FOR_POST);
    var host_req = String(req.hostname);
    //console.log(host_req, host_env, api_key, process.env.REACT_APP_API_M_KEY);
    
    if(host_req === host_env){
        if(api_key){
            if(api_key === process.env.REACT_APP_API_M_KEY){
                if(ownerAddress&&ramenAddress){
                    console.log('Owner address is: %s, ramen address is %s', ownerAddress, ramenAddress);

                    console.log('Trying to register ramen to Biconomy');
                    registerContract(ramenAddress, walletId);

                    // TAKE METHOD API ID AND PUT IT IN DB

                    console.log('Trying to record Ramen to DB');
                    const dbConnect = dbo.getDb();
                    
                    dbConnect.collection("users").insertOne({"userAddress": ownerAddress, "ramenAddress": ramenAddress, "registered": true}, async function (err, result) {
                        if (err) {
                             console.log('DB connect error');
                            res.status(400).send("DB connect error");
                        } else {
                            if(result){
                                 console.log('Recorded');
                                res.json({success: true, ramenAddress: result.ramenAddress});
                            } else {
                                 console.log('Not able to record');
                                res.json({success: false});
                            }
                        }
                    });

                    //res.json({success: true});

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

module.exports = router;