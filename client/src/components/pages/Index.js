import { useState, useEffect } from 'react';
//import { Helmet } from "react-helmet-async";
import { HashLink as Link } from 'react-router-hash-link';

import Web3 from 'web3';
import axios from 'axios';

// Components
import ConnectToWallets from '../common/ConnectToWallets';
import RamenWallet from './RamenWallet';
//import e from 'express';

const client = axios.create({
    baseURL: '/api',
    headers: { "Content-type": "application/json" } 
  });

const Index = ({AppName, AppUrl, setCurrentPage, web3Connect, isProvider, userAddress, web3Disconnect, web3, CollectionContract, convertRate, chainID}) => {

    useEffect(() => {
		setCurrentPage('index');
	}, [setCurrentPage]);

    const [ramenAddress, setRamenAddress] = useState("0");
    
    const [ethBalance, setEthBalance] = useState("n/a");
    
    const [erc20Balances, setErc20Balances] = useState({wETH: ["0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6", 0], 
                                                        UNI: ["0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", 0]});

    const [erc20sum, setErc20sum] = useState(0);                                            

    const [transactionState, setTransactionState] = useState(0);

    useEffect(() => {
        getWalletBalance(); 
    }); // constantly

    useEffect(() => {
        getRamenWallet();
    },[]); // once
    
    useEffect(() => {
        getRamenWallet();
    },[userAddress]);

    //Clean address
    const getCleanAddress = function (rawAddress) {
        let cleanAddress = rawAddress.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
                cleanAddress = cleanAddress.replace(/[^a-z0-9]/gi, '');
                cleanAddress = cleanAddress.trim();
                cleanAddress = cleanAddress.toLowerCase();
        return cleanAddress;
    }

    const getWalletBalance = async () => {
        console.log("trying to get balance");
        if(web3){
            if(isProvider){
                if(userAddress !== '0'){

                    let localErc20Balances = erc20Balances; //it's a reference, not a copy

                    // erc20Balances are updated automatically thru the reference
                    // However, the memory location for the erc20balances doesn't change
                    // so React does not re-render the component

                    //check erc20 balances
                    let localSum = 0;

                    if (chainID === 5) {
                        var results = await Promise.all(Object.keys(localErc20Balances).map(async (token) => {
                            let curBalance = await getErc20Balance(localErc20Balances[token][0], userAddress);
                            localErc20Balances[token][1] = curBalance;
                            localSum += curBalance;
                        })).then((results) => {setErc20sum(localSum)});
                    }  
                    // after erc20 awaits are resolved, we change state to re-render

                    //check native token balance
                    const resultBalance = await web3.eth.getBalance(userAddress);
                    if(resultBalance){
                        setEthBalance(resultBalance);
                        console.log("native balance set");
                    };
                    
                }    
            }
        }        
    }

    const getErc20Balance = async (token, user) => {
        const balanceOfABI = [
            {
                "constant": true,
                "inputs": [
                    {
                        "name": "_owner",
                        "type": "address"
                    }
                ],
                "name": "balanceOf",
                "outputs": [
                    {
                        "name": "balance",
                        "type": "uint256"
                    }
                ],
                "payable": false,
                "stateMutability": "view",
                "type": "function"
            },
        ];
        // Define the ERC-20 token contract
        const erc20Contract = new web3.eth.Contract(balanceOfABI, token);

        // Execute balanceOf() to retrieve the token balance
        const result = await erc20Contract.methods.balanceOf(user).call();
        return result;
    }

    // Get Ramen
    const getRamenWallet = async () => {
        if(userAddress){
            if(userAddress !== '0'){
                
                
                let cleanAddress = getCleanAddress(userAddress);

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
               

                //FOR SERVERLESS
                //setRamenAddress("0x30c317c22ede09621f1bed0c676191fb1118220c");
                /// DELETE IN PROD
                
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
                setTransactionState(9);
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
                postRamenToDb(getCleanAddress(ownerAddress), getCleanAddress(resultAddress), nextWalletId);
            });

        }
    }

    const postRamenToDb = async function (ownerAddress, newRamenAddress, walletId) {
        client.post(`/ramen/setramen/${ownerAddress}/${newRamenAddress}/${walletId}`, {headers: {'APIMKEY': process.env.REACT_APP_API_M_KEY}})
                    .then(async res => {
                        console.log('setramen response ok');
                        if(res.data.success){
                            console.log('Ramen recorded to DB');
                            setTransactionState(10);
                            alert('Ramen boiled');
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
    
    const listErc20Tokens = Object.keys(erc20Balances).map((token) => {
        return (<div key={token}>
            {token} : {(erc20Balances[token][1]/convertRate).toFixed(3)} <a className="active" href="https://app.uniswap.org/#/swap" target="_blank">(&gt;)</a>
        </div>);
    });

    return (
        <div className="container">
            {/* <Helmet>
                <title>{'Multiverso de Locomotoras - Mint'}</title>
                <meta name="description" content={'The first generative banner project by Alejandro Burdisio'} />
                <meta name="keywords" content={'Multiverso de Locomotoras - Mint'} />
                <meta property="og:title" content={'Multiverso de Locomotoras - Mint'} />
                <meta property="og:url" content={AppUrl} />
                <meta property="og:description" content={'Multiverso de Locomotoras - Mint'} />
                <link rel="canonical" href={AppUrl} />
            </Helmet> */}

            <div className="terminal">
                {(!isProvider)?(<>
                    <ConnectToWallets web3Connect={web3Connect} />
                </>):(<>
                    <h1>Ramen Wallet</h1>
                    {/* <Link to={'/allowlist'} title="Allowlist">Allowlist</Link><br /> */}
                    {
                        (ramenAddress==="0") ? (
                            (chainID !== 5)?(<>
                                <div>Switch to Goerli</div>
                            </>):(
                            <>  
                                { (transactionState === 9) ? ( <div class="blink_me"> 
                                        .... Cooking your ramen ....
                                    </div> ) : ( <>
                                        You have no ramen wallet cooked yet. 
                                        <div class="active" onClick={()=>cloneWallet(userAddress)}>
                                            Cook a Ramen Wallet
                                        </div>
                                    </>)

                                }
                                {/* <div><RamenWallet ramenAddress={ramenAddress} AppName={AppName} AppUrl={AppUrl} /></div> */}
                            </>)
                        ) : (
                            <>
                                {/* Your ramen: {ramenAddress} */}
                                Welcome to kitchen!
                                <div>
                                    <RamenWallet ramenAddress={ramenAddress} chainID={chainID} CollectionContract={CollectionContract} userAddress={userAddress} convertRate={convertRate} web3={web3} transactionState={transactionState} setTransactionState={setTransactionState}/>
                                </div>
                            </>
                        )
                    }
                    <section className="eoa">
                        <div className="user_address">==========<br/>Your EOA address: {userAddress}</div>
                        <div className="user_balance">
                            ETH: {(ethBalance/convertRate).toFixed(3)} <a className="active" href="https://goerlifaucet.com" target="_blank">(&gt;)</a>
                        </div>
                        <div>{(chainID !== 5)?(<></>):(<>{listErc20Tokens}</>)}</div>
                        <div className="disconnect active" onClick={() => web3Disconnect()}>Disconnect Wallet</div>
                    </section>
                </>)}   
            </div>
        </div>
    )
}

export default Index