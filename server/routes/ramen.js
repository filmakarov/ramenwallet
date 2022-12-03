var express = require('express');
var router = express.Router();
const dbo = require('../db/conn');

//Clean address
const getCleanAddress = function (rawAddress) {
    let cleanAddress = rawAddress.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
            cleanAddress = cleanAddress.replace(/[^a-z0-9]/gi, '');
            cleanAddress = cleanAddress.trim();
            cleanAddress = cleanAddress.toLowerCase();
    return cleanAddress;
}

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

router.post('/setramen/:ownerAddress/:ramenAddress', async (req, res) => {
    //var ownerAddress = getCleanAddress(req.params.ownerAddress);
    //var ramenAddress = getCleanAddress(req.params.ramenAddress);
    // they come already clean
    var ownerAddress = req.params.ownerAddress;
    var ramenAddress = req.params.ramenAddress;

    var api_key = req.body.headers.APIMKEY;

    var host_env = String(process.env.REACT_APP_ALLOW_HOST_FOR_POST);
    var host_req = String(req.hostname);
    //console.log(host_req, host_env, api_key, process.env.REACT_APP_API_M_KEY);
    
    if(host_req === host_env){
        if(api_key){
            if(api_key === process.env.REACT_APP_API_M_KEY){
                if(ownerAddress&&ramenAddress){
                    console.log('Owner address is: %s, ramen address is %s', ownerAddress, ramenAddress);
                    console.log('Set Ramen to DB');
 
                    const dbConnect = dbo.getDb();
                    
                    dbConnect.collection("users").insertOne({"userAddress": ownerAddress, "ramenAddress": ramenAddress}, async function (err, result) {
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