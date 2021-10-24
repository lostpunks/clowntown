var Cryptopunks = {};
Cryptopunks.ABI = [{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"punkIndexToAddress","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"}];

var Onchainpunks = {};
Onchainpunks.ABI = [{"inputs":[{"internalType":"uint16","name":"index","type":"uint16"}],"constant": true,"name":"punkImageSvg","outputs":[{"internalType":"string","name":"svg","type":"string"}],"stateMutability":"view","type":"function"}];

var Clowntownsociety = {};
Clowntownsociety.ABI = [{"inputs":[{"internalType":"uint16","name":"index","type":"uint16"}],"name":"imageByIndex","outputs":[{"internalType":"string","name":"svg","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint16","name":"punkIndex","type":"uint16"}],"name":"isClownMintedForPunkIndex","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"isPublicSaleOpen","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint16","name":"punkIndex","type":"uint16"}],"name":"priceInWeiToMintClownForPunkIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint16","name":"punkIndex","type":"uint16"}],"name":"tokenByPunkIndex","outputs":[{"internalType":"uint16","name":"","type":"uint16"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint16","name":"punkIndex","type":"uint16"}],"name":"mintClownFromPunk","outputs":[],"stateMutability":"payable","type":"function"}];

var BaseURLs = {};
var ConnectedWallet = {};

window.addEventListener('load', function() {
    if (window.ethereum) {
        let web3 = new Web3(ethereum);
        window.web3 = web3;
    } else if (typeof web3 !== 'undefined') {
        window.web3 = new Web3(web3.currentProvider);
    } else {
        let web3 = new Web3("https://cloudflare-eth.com");
        window.web3 = web3;
    }

    const queryString = window.location.search;
    const parameters = new URLSearchParams(queryString);
    const useTestNetwork = (parameters.get('test') === "true");

    BaseURLs.opensea = "https://" + (useTestNetwork ? "testnets." : "") + "opensea.io/assets/";
    BaseURLs.etherscan = "https://" + (useTestNetwork ? "rinkeby." : "") + "etherscan.io/tx/";
    Cryptopunks.address = useTestNetwork ? "0x3E9cFd413298943d55BbDFD198EEc89A32a0f42D" : "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB";
    Onchainpunks.address = useTestNetwork ? "0x3b41aeEb7705037B866e7befAE6e4CA8153c4c8a" : "0x16F5A35647D6F03D5D3da7b35409D65ba03aF3B2";
    Clowntownsociety.address = useTestNetwork ? "0x273352Cb980152127181456e705D11B53dBC7FEF" : "0x590BbD9C960a2f081311007B912e441D3588e136";

    Cryptopunks.contract = new web3.eth.Contract(Cryptopunks.ABI, Cryptopunks.address);
    Onchainpunks.contract = new web3.eth.Contract(Onchainpunks.ABI, Onchainpunks.address);
    Clowntownsociety.contract = new web3.eth.Contract(Clowntownsociety.ABI, Clowntownsociety.address);
});

var connectWallet = async (punkIndex) => {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    ConnectedWallet.account = accounts[0];
    prepareMint(punkIndex);
};

var prepareMint = function (punkIndex) {
  let button = document.getElementById('clown-button');
  Cryptopunks.contract.methods.punkIndexToAddress(punkIndex).call((error, ownerAddress) => {
    if(error) {
      console.log(error);
      return;
    }
    if(ownerAddress.toLowerCase() === ConnectedWallet.account.toLowerCase()) {
      button.innerHTML = "Mint for Free";
      button.onclick = function() { mint(punkIndex, 0) };
      button.style.opacity = 100;
    } else {
      Clowntownsociety.contract.methods.isPublicSaleOpen().call((error, isPublicSaleOpen) => {
        if(error) {
          console.log(error);
          return;
        }
        if(isPublicSaleOpen) {
          Clowntownsociety.contract.methods.priceInWeiToMintClownForPunkIndex(punkIndex).call((error, priceInWei) => {
            if(error) {
              console.log(error);
              return;
            }
            button.innerHTML = "Mint (" + Web3.utils.fromWei(priceInWei, 'ether') + "E)";
            button.onclick = function() { mint(punkIndex, priceInWei) };
            button.style.opacity = 100;
          });
        } else {
          button.innerHTML = "Awaiting Public Sale";
          button.onclick = function() {
            let url = 'https://discord.gg/wqKqsvFWBE';
            window.open(url, '_blank').focus();
          };
          button.style.opacity = 100;
        }
      });
    }
  });
};

var mint = async (punkIndex, priceInWei) => {
 const tx = {
      from: ConnectedWallet.account, 
      to: Clowntownsociety.address, 
      value: parseInt(priceInWei).toString(16),
      data: Clowntownsociety.contract.methods.mintClownFromPunk(punkIndex).encodeABI()
  };

  let label = document.getElementById('clown-label');
  let button = document.getElementById('clown-button');

  await ethereum.request({
      method: 'eth_sendTransaction',
      params: [tx],
  })
  .then(function (txHash) {
    label.innerHTML = "Minting Clown...";
    label.style.opacity = 100;
    button.innerHTML = "View on Etherscan";
    button.onclick = function() { 
      let url = BaseURLs.etherscan + txHash;
      window.open(url, '_blank').focus();
    }
    button.style.opacity = 100;
    return waitForTransaction(txHash);
  })
  .then(function (receipt) {
    queryPunk(punkIndex);
  });
};

function waitForTransaction(txHash) {
    return new Promise(function(resolve, reject) {
        (function attempt(triesLeft) {
            web3.eth.getTransactionReceipt(txHash, function(err, res) {
                if (err) return reject(err);
                if (res) return resolve(res);
                if (!triesLeft) return reject("max_tries_exceeded");
                setTimeout(attempt.bind(null, triesLeft-1), 5000);
            });
        })(60);
    });
};

var queryPunk = function (punkIndex) {
    let punkImage = document.getElementById('punk-image');
    let clownImage = document.getElementById('clown-image');
    let label = document.getElementById('clown-label');
    let button = document.getElementById('clown-button');

    punkImage.innerHTML = '<img class="padded" src="questionMark.svg"/>';
    clownImage.innerHTML = '<img class="padded" src="questionMark.svg"/>';
    label.opacity = 0;
    button.opacity = 0;
    button.onclick = null;

    Onchainpunks.contract.methods.punkImageSvg(punkIndex).call((error, punkSvg) => {
        if(!error) {
            punkImage.innerHTML = punkSvg.replace("data:image/svg+xml;utf8,", "");
        } else {
            console.log(error);
        }
    });
    Clowntownsociety.contract.methods.isClownMintedForPunkIndex(punkIndex).call((error, isMinted) => {
        if(error) {
            console.log(error);
            return;
        }
        if(isMinted) {
            Clowntownsociety.contract.methods.tokenByPunkIndex(punkIndex).call((error, clownIndex) => {
                if(error) {
                    console.log(error);
                    return;
                }
                label.innerHTML = "Clown Punk #" + clownIndex;
                label.style.opacity = 100;
                button.innerHTML = "View on OpenSea";
                button.onclick = function() { 
                    let url = BaseURLs.opensea + Clowntownsociety.address + '/' + clownIndex;
                    window.open(url, '_blank').focus();
                }
                button.style.opacity = 100;
                Clowntownsociety.contract.methods.imageByIndex(clownIndex).call((error, clownSvg) => {
                    if(error) {
                        console.log(error);
                        return;
                    }
                    clownImage.innerHTML = clownSvg.replace("data:image/svg+xml;utf8,", "").replace("rect{", "#crisp rect{");
                });
            });
        } else {
            label.innerHTML = "Clown Not Claimed Yet";
            label.style.opacity = 100;
            if (ConnectedWallet.account) {
                prepareMint(punkIndex);                
            } else {
                button.innerHTML = "Connect Wallet";
                button.onclick = function() { connectWallet(punkIndex) };
                button.style.opacity = 100;
            }
        }
    });
    return true;
};


