import { useState, useEffect } from 'react';
//import { Helmet } from "react-helmet-async";
import { HashLink as Link } from 'react-router-hash-link';
import Web3 from 'web3';
import { abiStorage } from '../../abi';
import axios from 'axios';

let sigUtil = require("eth-sig-util");
var BigNumber = require('bignumber.js');

const client = axios.create({
    baseURL: '/api',
    headers: { "Content-type": "application/json" } 
  });

// Components

const RamenWallet = ({AppName, AppUrl, web3Connect, isProvider, userAddress, web3Disconnect, web3, CollectionContract, convertRate, ramenAddress, chainID, transactionState, setTransactionState}) => {

    //const [transactionState, setTransactionState] = useState(0);
    const [nativeDepositAmount, setNativeDepositAmount] = useState(0.01);
    const [nativeDepositTime, setNativeDepositTime] = useState(1);

    const [erc20DepositToken, setErc20DepositToken] = useState("0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6");
    const [erc20DepositAmount, setErc20DepositAmount] = useState(0.01);
    const [erc20DepositTime, setErc20DepositTime] = useState(1);

    const [lastDeposit, setLastDeposit] = useState(0);

    const ramenContract = new web3.eth.Contract(abiStorage, ramenAddress);

    const [unclaimedDeposits, setUnclaimedDeposits] = useState([]);

    const tokenNames = {"0x0000000000000000000000000000000000000000": "ETH", 
                        "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6": "wETH",
                        "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": "UNI"}

    const [time, setTime] = useState(Date.now());
    
    const domainType = [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "verifyingContract", type: "address" },
        { name: "salt", type: "bytes32" },
    ];
    const metaTransactionType = [
        { name: "nonce", type: "uint256" },
        { name: "from", type: "address" },
        { name: "functionSignature", type: "bytes" }
    ];
    // replace the chainId 42 if network is not kovan
    let domainData = {
        name: "", //will set later
        version: "1",
        verifyingContract: ramenAddress,
        // converts Number to bytes32. pass your chainId instead of 42 if network is not Kovan
        salt : '0x' + (chainID).toString(16).padStart(64, '0')
    };
    
    useEffect(() => {
    }); // constantly

    useEffect(() => {
        getLastDeposit();
        const interval = setInterval(() => setTime(Date.now()), 15000);
        return () => {
            clearInterval(interval);
        };
    },[]); // once

    useEffect(() => {
        getLastDeposit();
        getDeposits();
    },[transactionState]); // on tr state
    
    useEffect(() => {
         getDeposits();
    },[lastDeposit]); // on lastDep   
    
    //Clean address
    const getCleanAddress = function (rawAddress) {
        let cleanAddress = rawAddress.replace(/([\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
                cleanAddress = cleanAddress.replace(/[^a-z0-9]/gi, '');
                cleanAddress = cleanAddress.trim();
                cleanAddress = cleanAddress.toLowerCase();
        return cleanAddress;
    }

    const getLastDeposit = async function () {
        let lastDep = await ramenContract.methods.lastDepositId().call();
        setLastDeposit(lastDep);
    }

    const getDeposits = async function () {
        console.log("getting deposits from contract");
        let unclaimedDeposits = [];
        for(let i=0; i<lastDeposit; i++) {
            let dep = await ramenContract.methods.deposits(i+1).call();
            if (!dep[3]) {
                dep[4] = (i+1);
                console.log(dep);
                unclaimedDeposits.push(dep);
            }
        }
        setUnclaimedDeposits(unclaimedDeposits);
        //forceUpdate();
    }

    const getTokenName = (tokenAddress) => {
        return tokenNames[tokenAddress];
    }

    const claimDeposit = async function (depositId) {
        console.log("Claiming deposit: " , depositId);

        await ramenContract.methods.claimDeposit(depositId).send({from: userAddress})
        .on('transactionHash', function(hash){
            // Txn sent , not confirmed on chain yet
            // console.log('transactionHash');
            setTransactionState("cl" + depositId); //claiming deposit
        })
        .on("error", function(error) {
            // User declined txn
            // console.log('Mint error');
            // console.log(error.message);
            alert('You canceled txn');
            setTransactionState(1);
        })
        .on("receipt", async function(receipt) {
            // Txn confirmed on-chain
            // console.log('Mint complete!');
            alert('Deposit claimed');
            getDeposits()
            .then(setTransactionState(3));
        });
    }

    const claimDepositGasless = async function (depositId) {
        let nonce = await ramenContract.methods.getNonce(userAddress).call();
        let ramenName = await ramenContract.methods.expName().call();
        let functionSignature = ramenContract.methods.claimDeposit(parseInt(depositId)).encodeABI();
        let methodId;
        client.get(`/ramen/getmethodid/${ramenAddress}`, {headers: {'APIMKEY': process.env.REACT_APP_API_M_KEY}})
                    .then(res => {
                        console.log('get method id response ok');
                        if(res.data.success){
                            console.log('There is method id');
                            methodId = res.data.methodId;
                        } else {
                            console.log('No method id for this ramen address');
                        }
                    }).catch(error => {
                        console.log('Backend Connection error');
                        
                    });

        let message = {};

        message.nonce = parseInt(nonce);
        message.from = userAddress;
        message.functionSignature = functionSignature;

        domainData.name = ramenName;

        const dataToSign = JSON.stringify({
            types: {
              EIP712Domain: domainType,
              MetaTransaction: metaTransactionType
            },
            domain: domainData,
            primaryType: "MetaTransaction",
            message: message
        });

        console.log("name ", domainData.name);

        web3.currentProvider.sendAsync(
            {
              jsonrpc: "2.0",
              id: 999999999999,
              method: "eth_signTypedData_v4",
              params: [userAddress, dataToSign]
            },
             function (error, response) {
                    console.info(`User signature is ${response.result}`);
                    if (error || (response && response.error)) 
                     {
                      alert("Could not get user signature");
                     }
                     else if (response && response.result) 
                     {
                       let { r, s, v } = getSignatureParameters(response.result);
                       sendTransaction(userAddress, functionSignature, r, s, v, depositId, methodId);
                     }
            }
          );

    }

    // here signer and sender is the same wallet
    const sendTransaction = async (signerAddress, functionData, r, s, v, depositId, methodId) => {

        console.log(signerAddress, " | ", functionData, " | ", r, " | ", s, " | ", v);
        console.log('0x' + (chainID).toString(16).padStart(64, '0'));
        console.log('method id at sendTransaction() ', methodId);
        
        if (web3 && ramenContract) {
            try {
                fetch(`https://api.biconomy.io/api/v2/meta-tx/native`, {
                    method: "POST",
                    headers: {
                      "x-api-key" : "iBKW4cFsx.807b0d3f-5d68-4572-84b4-4d5dd0d59bd9",
                      'Content-Type': 'application/json;charset=utf-8'
                    },
                    body: JSON.stringify({
                      "to": ramenAddress,
                      "apiId": methodId,
                      "params": [signerAddress, functionData, r, s, v],
                      "from": signerAddress
                    })
                  })
                  .then(response=>response.json())
                  .then(async function(result) {
                    console.log(result);
                    //alert("BCNM: Transaction sent by relayer with hash ", result.txHash);
                    console.log("BCNM: Transaction sent by relayer with hash ", result.txHash);
                    setTransactionState("cl" + depositId); //claiming deposit
          
                    let receipt = await getTransactionReceiptMined(result.txHash, 2000);
                    //setTransactionHash(result.txHash);
                    alert("BCNM:  Transaction confirmed on chain");
                    console.log("BCNM: Txn confirmed on-chain ", receipt);
                    setTransactionState(3);
                    //getQuoteFromNetwork();
                  }).catch(function(error) {
                      console.log(error)
                    });
            } catch (error) {
                console.log(error);
            }
        }
    };

    const getTransactionReceiptMined = (txHash, interval) => {
        const self = this;
        const transactionReceiptAsync = async function(resolve, reject) {
          var receipt = await web3.eth.getTransactionReceipt(txHash);
          if (receipt == null) {
              setTimeout(
                  () => transactionReceiptAsync(resolve, reject),
                  interval ? interval : 500);
          } else {
              resolve(receipt);
          }
        };
    
        if (typeof txHash === "string") {
            return new Promise(transactionReceiptAsync);
        } else {
            throw new Error("Invalid Type: " + txHash);
        }
    };

    const getSignatureParameters = signature => {
        if (!web3.utils.isHexStrict(signature)) {
            throw new Error(
                'Given value "'.concat(signature, '" is not a valid hex string.')
            );
        }
        var r = signature.slice(0, 66);
        var s = "0x".concat(signature.slice(66, 130));
        var v = "0x".concat(signature.slice(130, 132));
        v = web3.utils.hexToNumber(v);
        if (![27, 28].includes(v)) v += 27;
        return {
            r: r,
            s: s,
            v: v
        };
    }; 
    
    const approveToken = async () => {
        let erc20ApproveAbi = [
            {
                "inputs": [
                  {
                    "internalType": "address",
                    "name": "spender",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                  }
                ],
                "name": "approve",
                "outputs": [
                  {
                    "internalType": "bool",
                    "name": "",
                    "type": "bool"
                  }
                ],
                "stateMutability": "nonpayable",
                "type": "function"
              }
        ];
        const tokenContract = new web3.eth.Contract(erc20ApproveAbi, erc20DepositToken);
        //let apprAmount = BigNumber(erc20DepositAmount).times(BigNumber(10).exponentiatedBy(18));
        await tokenContract.methods.approve(ramenAddress, web3.utils.toWei(erc20DepositAmount.toString())).send({from: userAddress})
        .on('transactionHash', function(hash){
            // Txn sent , not confirmed on chain yet
            // console.log('transactionHash');
            setTransactionState(7); //approval in process
        })
        .on("error", function(error) {
            // User declined txn
            // console.log('Mint error');
            // console.log(error.message);
            alert('You canceled txn');
            setTransactionState(1);
        })
        .on("receipt", async function(receipt) {
            // Txn confirmed on-chain
            // console.log('Mint complete!');
            alert('Approved');
            setTransactionState(3);
        });
    }

    const handleChangeNDA = (event) => {
        setNativeDepositAmount(event.target.value);
    }

    const handleChangeNDTime = (event) => {
        setNativeDepositTime(event.target.value);
    }

    const handleSubmitNDA = async (event) => {
        event.preventDefault();
        let unlock_timestamp = (parseInt(Date.now()/1000)+parseInt(60*nativeDepositTime));
        
        await ramenContract.methods.depositNative(unlock_timestamp).send({from: userAddress, value: (nativeDepositAmount*convertRate)})
        .on('transactionHash', function(hash){
            // Txn sent , not confirmed on chain yet
            // console.log('transactionHash');
            setTransactionState(2);
        })
        .on("error", function(error) {
            // User declined txn
            // console.log('Mint error');
            // console.log(error.message);
            alert('You canceled txn');
            setTransactionState(1);
        })
        .on("receipt", async function(receipt) {
            // Txn confirmed on-chain
            // console.log('Mint complete!');
            alert('Deposit created');
            setTransactionState(3);
        });
        
    }

    const handleChangeEDA = (event) => {
        setErc20DepositAmount(event.target.value);
    }

    const handleChangeEDT = (event) => {
        setErc20DepositToken(event.target.value);
    }

    const handleChangeEDTime = (event) => {
        setErc20DepositTime(event.target.value);
    }

    const handleSubmitEDA = async (event) => {
        event.preventDefault();
        let unlock_timestamp = (parseInt(Date.now()/1000)+parseInt(60*erc20DepositTime));
        //let depAmount = BigNumber(erc20DepositAmount).times(convertRate);
        
        await ramenContract.methods.depositERC20(erc20DepositToken, web3.utils.toWei(erc20DepositAmount.toString()), unlock_timestamp).send({from: userAddress})
        .on('transactionHash', function(hash){
            // Txn sent , not confirmed on chain yet
            // console.log('transactionHash');
            setTransactionState(2);
        })
        .on("error", function(error) {
            // User declined txn
            // console.log('Mint error');
            // console.log(error.message);
            alert('You canceled txn');
            setTransactionState(1);
        })
        .on("receipt", async function(receipt) {
            // Txn confirmed on-chain
            // console.log('Mint complete!');
            alert('Deposit created');
            setTransactionState(3);
        });
        
    }

    const listDeposits = unclaimedDeposits.map((deposit, index) => {
        return (<div key={deposit[4]}>
                    
                    <strong>Deposit# {deposit[4]}</strong><br/>
                    Token: {getTokenName(getCleanAddress(deposit[0]))}<br/>
                    {console.log(deposit[0])}
                    Amount: {(deposit[1]/convertRate).toFixed(3)}<br/>
                    {
                        (deposit[2] < Date.now()/1000) ? 
                        (<div>Unlocked: <span className="active" onClick={()=>claimDepositGasless(deposit[4])}>Claim</span></div>) : 
                        (<>Unlocks in: {parseInt((deposit[2]-Date.now()/1000)/60)} min</>)
                    }
                    {
                        (transactionState==="cl"+deposit[4])?(<div className="blink_me">...Claiming...</div>):(<></>)
                    }
                    <div>**************</div>
                </div>);
    });

    return ( 
        <>
            {(chainID!==5)?(<>Switch to Goerli</>):(
            <>
                <div className="page-text">
                    YOUR RAMEN WALLET : {ramenAddress}    
                </div>
                <div>==================</div>
                
                <form onSubmit={handleSubmitNDA}>
                    <label>
                        Deposit ETH:
                        
                        <select value={nativeDepositAmount} onChange={handleChangeNDA}>
                            <option value="0.01">0.01</option>
                            <option value="0.05">0.05</option>
                            <option value="1">1</option>
                        </select>
                        <span> for </span>
                        <select value={nativeDepositTime} onChange={handleChangeNDTime}>
                            <option value="1">1</option>
                            <option value="3">3</option>
                            <option value="5">5</option>
                        </select>
                        <span> min. </span>
                    </label>
                    <input className="active" type="submit" value="Deposit" />
                </form>

                <form onSubmit={handleSubmitEDA}>
                    <label>
                        Deposit:
                        <select value={erc20DepositAmount} onChange={handleChangeEDA}>
                            <option value="0.01">0.01</option>
                            <option value="0.05">0.05</option>
                            <option value="0.1">0.1</option>
                        </select>
                        <span> of </span>
                        <select value={erc20DepositToken} onChange={handleChangeEDT}>
                            <option value="0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6">wETH</option>
                            <option value="0x1f9840a85d5af5bf1d1762f925bdaddc4201f984">UNI</option>
                        </select>
                        <span> for </span>
                        <select value={erc20DepositTime} onChange={handleChangeEDTime}>
                            <option value="1">1</option>
                            <option value="3">3</option>
                            <option value="5">5</option>
                        </select>
                        <span> min. </span>
                    </label>
                        <span className='active' onClick={approveToken}>Approve</span> &gt;&gt;
                        <span>{(transactionState===7)?(<span class="blink_me">..approving..</span>):(<></>)}</span>
                        <input className="active" type="submit" value="Deposit" />
                </form>


                <div>Total deposits were made: {lastDeposit}</div>
                <div className='dep-head'>**Unclaimed:**</div>
                {/* <div>{unclaimedDeposits}</div> */}
                <div>{listDeposits}</div>
                {(transactionState===2)?(<div className="blink_me">...Deposit is being confirmed on-chain...</div>):(<></>)}
            </>
            )} 
        </> 
    )
}

export default RamenWallet