var express = require('express');
var router = express.Router();
const dbo = require('../db/conn');

router.get('/', (req, res) => {
    res.send('Good day, commander!');
})

router.get('/getramen/:address', async (req, res) => {
    var address = req.params.address;
    address = address.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    address = address.replace(/[^a-z0-9]/gi, '');
    address = address.trim();
    address = address.toLowerCase();

    var api_key = req.headers.apimkey;

    var host_env = String(process.env.REACT_APP_ALLOW_HOST_FOR_POST);
    var host_req = String(req.hostname);
    //console.log(host_req, host_env, api_key, process.env.REACT_APP_API_M_KEY);
    //res.json({success: true, ramenAddress: "0x797158Fd06F1a8eC6AB09C78Ae2Dd3D2C13762C8"});
    
    if(host_req === host_env){
        
        if(api_key){
            if(api_key === process.env.REACT_APP_API_M_KEY){
                
                if(address){
                    console.log('Address is: ' + address);
                    console.log('Get Ramen from DB');

                    
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

module.exports = router;