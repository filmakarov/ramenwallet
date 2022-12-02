import React, { useState, useEffect } from 'react';
import {BrowserRouter, Routes, Route} from "react-router-dom";

import Web3 from 'web3';
import Web3Modal from "web3modal";

import { abiStorage } from './abi';

// Pages
import Index from './components/pages/Index'; // Index page
import NoMatch from './components/pages/NoMatch'; // 404 page

// Common components
const AppName = process.env.REACT_APP_WEB_NAME;
const AppUrl = process.env.REACT_APP_WEB_URL;

const LinkTw = process.env.REACT_APP_WEB_TW || '';
const LinkDs = process.env.REACT_APP_WEB_DS || '';
const LinkOpensea = process.env.REACT_APP_WEB_OS || '';
const LinkEtherscan = process.env.REACT_APP_WEB_ES || '';

const AppSalesLimit = parseInt(process.env.REACT_APP_CONTRACT_AMOUNT);

let isMainnet = true;
const checkMainnet = process.env.REACT_APP_CONTRACT_IS_MAINNET;
if(checkMainnet === 'false'){
    isMainnet = false;
}

// MainNet
let contractAddr = process.env.REACT_APP_CONTRACT_ADD_MAINNET; // Адрес контракта 
let networkWalletconnect = "mainnet";
let networkCoinbase = 1;
let networkWeb3modal = "mainnet";

// TestNet goerli
if(!isMainnet){
    contractAddr = process.env.REACT_APP_CONTRACT_ADD_TESTNET; // Адрес контракта 
    networkWalletconnect = "goerli";
    networkCoinbase = 5;
    networkWeb3modal = "goerli";
}
  
// Настройки кошельков во всплывающем окне
const providerOptions = {
  injected: {
    display: {
      name: "MetaMask",
      description: "Connect with the provider in your Browser"
    },
    package: null
  }
};

const web3Modal = new Web3Modal({
  network: networkWeb3modal, 
  cacheProvider: true,
  providerOptions
});

let provider = null;
let web3 = null;
let CollectionContract = null;

// Для конвертации цены токена
const convertRate = 1000000000000000000;

function App() {
  const [currentPage, setCurrentPage] = useState(''); 

  // For Web3Modal
  const [isProvider, setIsProvider] = useState(false); // useState = присвоение
  const [userAddress, setUserAddress] = useState('0');
  const [chainID, setChainID] = useState(0);

  useEffect(() => {
    getCachedProvider();
    getUserAddress();
  });
 
  const getCachedProvider = async (e) => {
    if(localStorage.getItem("WEB3_CONNECT_CACHED_PROVIDER")){
      web3Connect();
      //console.log("Reconnect");
    }
  }

  const getUserAddress = async (e) => {
    if(isProvider){
      const accounts = await web3.eth.getAccounts();
      if(accounts[0]){
        setUserAddress(accounts[0]);
      } else {
        setUserAddress('0');
        web3Disconnect();
        //console.log('no account');
      }

      // Определяем к какой сети подключен кошелек Mainnet или какая-то другая тестовая сеть
      const chainId = await web3.eth.getChainId();
      if(chainId){
        setChainID(chainId);
      } else {
        setChainID(0);
      }
    } else {
      setUserAddress('0');
      setChainID(0);
      web3Disconnect();
    }
  }

  // Функция используется для реконнекта, а также при нажатии кнопки Connect
  async function web3Connect() {
    if (!provider) {
      try {
        provider = await web3Modal.connect();
        web3 = new Web3(provider);
        CollectionContract = new web3.eth.Contract(abiStorage, contractAddr); // Подключаемся к контракту и дальше работаем с ним

        setIsProvider(true);
      } catch (error) {
        // console.log('User rejected the request');
        // console.log(error);
      }
    }
  }

  async function web3Disconnect() {
    web3Modal.clearCachedProvider();
    setIsProvider(false);
    setUserAddress('0');
    provider = null;
  }

  if(provider){
    provider.on("accountsChanged", (accounts) => {
      getUserAddress();
    });

    provider.on("chainChanged", (chainId) => {
      getUserAddress();
    });
  }

  return (
    <BrowserRouter>
      <>
        <main>
          <div id="content">
            {/* <div onClick={web3Connect}>Connect</div> */}
            <Routes>
                <Route path='/' exact strict element={<Index AppName={AppName} AppUrl={AppUrl} setCurrentPage={setCurrentPage} AppSalesLimit={AppSalesLimit} web3Connect={web3Connect} isProvider={isProvider} userAddress={userAddress} CollectionContract={CollectionContract} chainID={chainID} web3Disconnect={web3Disconnect} LinkOpensea={LinkOpensea} convertRate={convertRate} web3={web3} isMainnet={isMainnet} />} />                
                
                <Route path="*" element={<NoMatch AppName={AppName} AppUrl={AppUrl} setCurrentPage={setCurrentPage} />} /> 
            </Routes>
          </div>
        </main>
      </>
    </BrowserRouter>  
  );
}

export default App;