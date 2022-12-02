import { useState, useEffect } from 'react';
//import { Helmet } from "react-helmet-async";
import { HashLink as Link } from 'react-router-hash-link';

import axios from 'axios';

// Components
import ConnectToWallets from '../common/ConnectToWallets';
//import e from 'express';

const client = axios.create({
    baseURL: '/api',
    headers: { "Content-type": "application/json" } 
  });

const Index = ({AppName, AppUrl, setCurrentPage, web3Connect, isProvider, userAddress, web3Disconnect, CollectionContract}) => {
    
    useEffect(() => {
		setCurrentPage('index');
	}, [setCurrentPage]);

    const [ramenAddress, setRamenAddress] = useState("0"); 

    useEffect(() => {
        getRamenWallet();
    },[]); // только один раз
    
    useEffect(() => {
        getRamenWallet();
    },[userAddress]);

    // Get Ramen
    const getRamenWallet = async (e) => {
        if(userAddress){
            if(userAddress !== '0'){
                let cleanAddress = userAddress.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
                cleanAddress = cleanAddress.replace(/[^a-z0-9]/gi, '');
                cleanAddress = cleanAddress.trim();
                cleanAddress = cleanAddress.toLowerCase();

                // console.log('Делаем запрос в API по чистому кошельку: ' + cleanAddress);

                client.get(`/ramen/getramen/${cleanAddress}`, {headers: {'APIMKEY': process.env.REACT_APP_API_M_KEY}})
                    .then(res => {
                        // console.log('Response ok');
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
            } else {
                setRamenAddress("0");
            }
        } else {
            setRamenAddress("0");
        }
    }

    const cloneWallet = async() => {
        if(isProvider){

            let salt = "0x14dC79964da2C08b23698B3D3";
            //const resultAddress = await CollectionContract.methods.predictDeterministicAddress(salt).call();
            
            const testW = await CollectionContract.methods.exposedDomSep().call();
            if (testW) {
                console.log("test ", testW);
            } else {
                console.log("error");
            }

            /*
            if(resultAddress){
                //setTotalSupply(resultTotalSupply);
                console.timeLog("Expected address: ", resultAddress);
            } else {
                console.log("error");
            }
            */
            
        }
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
                                <div onClick={cloneWallet}>Create Ramen</div>
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