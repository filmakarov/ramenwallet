// import './ConnectToWallets.css';

const ConnectToWallets = ({web3Connect}) => {
    return (
        <div className="connect-component-container">
            <h3>Please connect your wallet to Mint</h3>
            {/* <h2>You need to connect your wallet</h2> */}
            <div onClick={() => web3Connect()} className="big-button"><span>Connect</span></div>
        </div> 
    )
}

export default ConnectToWallets