import { useState, useEffect } from 'react';
//import { Helmet } from "react-helmet-async";
import { HashLink as Link } from 'react-router-hash-link';
import Web3 from 'web3';

import { abiStorage } from '../../abi';

// Components

const RamenWallet = ({AppName, AppUrl, web3Connect, isProvider, userAddress, web3Disconnect, web3, CollectionContract, convertRate, ramenAddress, chainID}) => {

    const [transactionState, setTransactionState] = useState(0);
    const [nativeDepositAmount, setNativeDepositAmount] = useState(0.01);

    const [lastDeposit, setLastDeposit] = useState(0);

    const ramenContract = new web3.eth.Contract(abiStorage, ramenAddress);

    const [unclaimedDeposits, setUnclaimedDeposits] = useState([]);

    useEffect(() => {

    }); // constantly

    useEffect(() => {
        getLastDeposit();
    },[]); // once

    useEffect(() => {
        getLastDeposit();
    },[transactionState]); // on tr state
    
    useEffect(() => {
        getDeposits();
    },[lastDeposit]); // on lastDep
    

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

    
    const listDeposits = unclaimedDeposits.map((deposit, index) => {
        return (<div key={deposit[4]}>
                    <div>**************</div>
                    <strong>Deposit# {deposit[4]}</strong><br/>
                    Token : {deposit[0]}<br/>
                    Amount: {(deposit[1]/convertRate).toFixed(3)}<br/>
                    Unlocks at: {deposit[2]}
                    {
                        (deposit[2] < Date.now()/1000) ? (<> *Claim* </>) : (<></>)
                    }
                </div>);
    });
    

    const handleChangeNDA = (event) => {
        setNativeDepositAmount(event.target.value);
    }

    const handleSubmitNDA = async (event) => {
        event.preventDefault();
        let unlock_timestamp = (parseInt(Date.now()/1000)+parseInt(500));
        
        await ramenContract.methods.depositNative(unlock_timestamp).send({from: userAddress, value: (nativeDepositAmount*convertRate)})
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
            alert('Deposit created');
            setTransactionState(3);
        });
        
      }

    //await CollectionContract.methods.

    const depositNative = () => {
        return (
            <form onSubmit={handleSubmitNDA}>
                <label>
                    Deposit amount:
                    <select value={nativeDepositAmount} onChange={handleChangeNDA}>
                        <option value="0.01">0.01</option>
                        <option value="0.05">0.05</option>
                        <option value="1">1</option>
                    </select>
                </label>
                <input type="submit" value="Deposit" />
            </form>
        
    )}


    return ( 
        <>
            {(chainID!==5)?(<>Switch to Goerli</>):(
            <>
                <div className="page-text">
                    RAMEN CONTROL PANEL : {ramenAddress}    
                </div>
                <form onSubmit={handleSubmitNDA}>
                    <label>
                        Deposit amount:
                        <select value={nativeDepositAmount} onChange={handleChangeNDA}>
                            <option value="0.01">0.01</option>
                            <option value="0.05">0.05</option>
                            <option value="1">1</option>
                        </select>
                    </label>
                    <input type="submit" value="Deposit" />
                </form>
                <div>Deposits made: {lastDeposit}</div>
                {/* <div>{unclaimedDeposits}</div> */}
                <div>{listDeposits}</div>
            </>
            )} 
        </> 
    )
}

export default RamenWallet