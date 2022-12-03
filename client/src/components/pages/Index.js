import { useState, useEffect } from 'react';
//import { Helmet } from "react-helmet-async";
import { HashLink as Link } from 'react-router-hash-link';

import Web3 from 'web3';

import axios from 'axios';

// Components
import ConnectToWallets from '../common/ConnectToWallets';
//import e from 'express';

const client = axios.create({
    baseURL: '/api',
    headers: { "Content-type": "application/json" } 
  });

const Index = ({AppName, AppUrl, setCurrentPage, web3Connect, isProvider, userAddress, web3Disconnect, CollectionContract}) => {
    
    const web3 = new Web3();

    useEffect(() => {
		setCurrentPage('index');
	}, [setCurrentPage]);

    const [ramenAddress, setRamenAddress] = useState("0"); 
    const [ramenCreated, setRamenCreated] = useState(false);
    const [transactionState, setTransactionState] = useState(0);

    useEffect(() => {
        getRamenWallet();
    },[]); // только один раз
    
    useEffect(() => {
        getRamenWallet();
    },[userAddress]);

    useEffect(() => {
        getRamenWallet();
    },[ramenCreated]);  // refresh state 

    //Clean address
    const getCleanAddress = function (rawAddress) {
        let cleanAddress = rawAddress.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
                cleanAddress = cleanAddress.replace(/[^a-z0-9]/gi, '');
                cleanAddress = cleanAddress.trim();
                cleanAddress = cleanAddress.toLowerCase();
        return cleanAddress;
    }

    // Get Ramen
    const getRamenWallet = async () => {
        if(userAddress){
            if(userAddress !== '0'){
                
                /*
                let cleanAddress = userAddress.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
                cleanAddress = cleanAddress.replace(/[^a-z0-9]/gi, '');
                cleanAddress = cleanAddress.trim();
                cleanAddress = cleanAddress.toLowerCase();
                */
                let cleanAddress = getCleanAddress(userAddress);

                //console.log('Делаем запрос в API по чистому кошельку: ' + cleanAddress);

                client.get(`/ramen/getramen/${cleanAddress}`, {headers: {'APIMKEY': process.env.REACT_APP_API_M_KEY}})
                    .then(res => {
                        console.log('getramen response ok');
                        if(res.data.success){
                            console.log('There is a ramen');
                            setRamenAddress(res.data.ramenAddress);
                        } else {
                            console.log('No Ramen for this address');
                            setRamenAddress("0");
                        }
                    }).catch(error => {
                        // console.log('Connection error');
                        setRamenAddress("0");
                    });
                
                //setRamenAddress("0");
            } else {
                setRamenAddress("0");
            }
        } else {
            setRamenAddress("0");
        }
    }

    const cloneWallet = async(ownerAddress) => {
        if(isProvider){

            console.log("Total wallets: " + await CollectionContract.methods.lastWalletId().call());

            let salt = Web3.utils.asciiToHex("428abc479ef" + Date.now());
            const resultAddress = await CollectionContract.methods.predictDeterministicAddress(salt).call();

            console.log(salt);
                                                                        
            if(resultAddress){
                //setTotalSupply(resultTotalSupply);
                console.log("Expected address: ", resultAddress);
            } else {
                console.log("error");
            }

            let nextWalletId = parseFloat(await CollectionContract.methods.lastWalletId().call()) + 1;
            const name = 'Timelock Wallet ' + nextWalletId;
            //console.log(name);
            
            let calldata = web3.eth.abi.encodeFunctionCall({
                name: 'initialize',
                type: 'function',
                inputs: [{
                    type: 'string',
                    name: 'name'
                },{
                    type: 'string',
                    name: 'version'
                }, {
                    type: 'address',
                    name: 'newOwner'
                }]
            }, [name, '1', userAddress]);

            console.log(calldata);

            setTransactionState(0);

            await CollectionContract.methods.cloneDeterministic(salt, calldata).send({ from: userAddress })
            .on('transactionHash', function(hash){
                // Транзакция отправлена, но еще не было подтверждения
                // console.log('transactionHash');
                setTransactionState(2);
            })
            .on("error", function(error) {
                // Пользователь отменил транзакцию
                // console.log('Mint error');
                // console.log(error.message);
                setTransactionState(1);
            })
            .on("receipt", async function(receipt) {
                // Транзакция успешно прошла, минтинг завершен
                // console.log('Mint complete!');

                // Record to DB
                await postRamenToDb(getCleanAddress(ownerAddress), getCleanAddress(resultAddress));

                // register smart contract to Biconomy

                //setRamenCreated(true);
            });

        }
    }

    const postRamenToDb = async function (ownerAddress, newRamenAddress) {
        client.post(`/ramen/setramen/${ownerAddress}/${newRamenAddress}`, {headers: {'APIMKEY': process.env.REACT_APP_API_M_KEY}})
                    .then(async res => {
                        console.log('setramen response ok');
                        if(res.data.success){
                            console.log('Ramen recorded to DB');
                            //setRamenAddress(newRamenAddress);
                            await getRamenWallet();
                        } else {
                            console.log('Ramen has not been recorded to DB');
                            setRamenAddress("0");
                        }
                    }).catch(error => {
                        console.log('Connection error');
                        setRamenAddress("0");
                    });
    }

    return (
        <>
            {/* <Helmet>
                <title>{'Multiverso de Locomotoras - Mint'}</title>
                <meta name="description" content={'The first generative banner project by Alejandro Burdisio'} />
                <meta name="keywords" content={'Multiverso de Locomotoras - Mint'} />
                <meta property="og:title" content={'Multiverso de Locomotoras - Mint'} />
                <meta property="og:url" content={AppUrl} />
                <meta property="og:description" content={'Multiverso de Locomotoras - Mint'} />
                <link rel="canonical" href={AppUrl} />
            </Helmet> */}

            <div className="page-text">
                {(!isProvider)?(<>
                    <ConnectToWallets web3Connect={web3Connect} />
                </>):(<>
                    <h1>Wallet</h1>
                    {/* <Link to={'/allowlist'} title="Allowlist">Allowlist</Link><br /> */}
                    {
                        (ramenAddress==="0") ? (
                            <>
                                <div onClick={()=>cloneWallet(userAddress)}>Create Ramen</div>
                                <br></br>
                                <div onClick={()=>postRamenToDb(getCleanAddress(userAddress), "0xVitalikIsGenius")}>TEST POST</div>
                            </>
                        ) : (
                            <>
                                Your ramen: {ramenAddress}
                            </>
                        )
                    }
                    <div className="minting_user_address">Address: {userAddress}</div>
                    <div className="minting_disconnect" onClick={() => web3Disconnect()}>Disconnect Wallet</div>
                    
                </>)}   
            </div>
        </>
    )
}

export default Index