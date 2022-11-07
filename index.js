const Caver = require('caver-js');
const Web3 = require('web3');
const CaverExtKAS = require('caver-js-ext-kas');
const axios = require("axios");

const kip17 = require('./lib/kip17');
const erc721 = require('./lib/erc721');
const erc1155 = require('./lib/erc1155');

class nft_browser_3pm {
  constructor()
  {
      this._wallet= "";
      this._web3= "";
      this._caver= "";
      this._coin= "";
      this._chainid= "";
  }

  get walletaddress() { return this._wallet }
  get web3() { return this._web3 }
  get caver() { return this._caver }  
  get coin() { return this._coin }
  get chainid() { return this._chainid }

  InitWallet() {
      if (typeof window.ethereum !== "undefined") {
          const web = new Web3(window.ethereum);
          this._web3 = web;
          console.log("new Web3");
      }
      if (typeof window.klaytn !== "undefined") {
          const caver = new Caver(window.klaytn);
          this._caver = caver;
          console.log("new caver");
      }
  }

  InitData()
  {
      this._wallet= "";
      this._coin= "";
      this._chainid= "";
  }

  async kaikasLogin()
  {
      if (window.klaytn) {
           if (window.klaytn.isKaikas) {
              const wallet = await window.klaytn.enable();
              const address = window.klaytn.selectedAddress;    
              if (address != 'undefined') 
              {
                  this._wallet = "";
                  this._coin = "";
                  this._wallet = address;
              
                  const Coin = await this._caver.klay.getBalance(address);
                  const balance = this._caver.utils.convertFromPeb(Coin);
                  this._coin = balance;
                  return true;
              }        
          }
      }
      return false;
  }

  //0x0Ae80159Dd77eA78688eCb2A18f96f2D373B1228
  async metamaskLogin() 
  {
      if (window.ethereum) {
          if (window.ethereum.isMetaMask)
          {              
              this._wallet = "";
              this._coin = "";

              const address = await ethereum.request({ method: 'eth_requestAccounts' });
              const chainId = await this._web3.eth.getChainId();
              const Coin = await this._web3.eth.getBalance(String(address));
              const balance = await this._web3.utils.fromWei(Coin, 'ether');       
              
              this._wallet = address;
              this._chainid = chainId;
              this._coin = balance;
              return true;
          }
      }
      return false;
  }

  // klaytn_account, klaytn_kas_key (klaytn api id, key)
  // kas_chain 1001(testnet), 8217(mainnet)
  async klaytnNFT(klaytn_account, klaytn_kas_key ,kas_chain){
      let tokenContract = "";
      let datalist = new Array();
      
      const ExtKAS = new CaverExtKAS();
  
      const KasAccount = klaytn_account;
      const KasKey = klaytn_kas_key;
      const chainId = kas_chain;
      ExtKAS.initKASAPI(chainId, KasAccount, KasKey);
  
      const query = {
        kind: [ExtKAS.kas.tokenHistory.queryOptions.kind.NFT],
        size: 1000,
      }
      const result = await ExtKAS.kas.tokenHistory.getTransferHistoryByAccount(this._wallet, query);
  
      let Contract = [];
      for (let i = 0; i <= query.size; i++) {
        const number = i;
        const jsondata = result['items'][number];
  
        if (jsondata != 'undefined' && jsondata != null) {
          const jsonTo = jsondata['to'];
          const jsonTokenID = jsondata['tokenId'];
  
          if (jsonTo == this._wallet) {
            const jsonContract = jsondata['contract']['address'];
  
            const Data = [jsonContract, jsonTokenID];
            Contract.push(Data);
          }
        }
        else {
          break;
        }
      }
  
      //토큰 ID가 중복으로 들어오는 부분 제거
      let resultContract = Contract.filter((element, index) => {
        return (
          Contract.findIndex((item) => item[0] === element[0] && item[1] === element[1]) === index);
      });

      
      try {
        for (let con of resultContract) {
          const NftContract = con[0];
          console.log("result Contract : " + NftContract);

          tokenContract = await new caver.klay.Contract(kip17 , con[0]);

          const name = await tokenContract.methods.name().call();
          const symbol = await tokenContract.methods.symbol().call();
          const tokenId = parseInt(con[1], 16);
    
          let JsonURL = '';
          let JsonName = '';
          let JsonDescription = '';
    
          let tokenOwner = await tokenContract.methods.ownerOf(tokenId).call();
    
          //https://forum.klaytn.foundation/t/wallet-address-uppercase-lowercase/1297
          if (tokenOwner.toLowerCase() != this._wallet)
          {
            console.log("tokenOwner " + tokenOwner + "  continue");
            continue;
          }
            
    
          let tokenURI = await tokenContract.methods.tokenURI(tokenId).call();
    
          const URL = tokenURI.substring(0, 7);
          if (URL == "ipfs://") {
            const MetaDataJson = tokenURI.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
    
            const GetJson = await fetch(MetaDataJson);
    
            const jsonFile = await GetJson.json();
            JsonName = jsonFile.name;
    
            JsonDescription = jsonFile.description;
            const Image = jsonFile.image;
            JsonURL = Image.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
          }
          else {
            const SubURL = tokenURI.substring(0, 12);
            if (SubURL == "https://ipfs") {
              const MetaDataJson = tokenURI.replace("https://ipfs.infura.io/", "https://ipfs.io/");
    
              const GetJson = await fetch(MetaDataJson);    
              const jsonFile = await GetJson.json();
              JsonName = jsonFile.name;
    
              JsonDescription = jsonFile.description;
              const Image = jsonFile.image;
              JsonURL = Image.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
            }
            else {
              const GetJson = await fetch(tokenURI);
              const jsonFile = await GetJson.json();
    
              JsonName = jsonFile.name;
              JsonDescription = jsonFile.description;
              JsonURL = jsonFile.image;
            }
    
          }
          datalist.push({ "Contract": NftContract, "ContractName": name,
                          "Symbol": symbol, "Tokenid" : tokenId,
                          "JsonURL" : JsonURL, "JsonName" : JsonName,
                          "JsonDescription" : JsonDescription});
        }
        return datalist;        
      }
      catch (error) {
        console.error(error);
      }

      
    };    

    async ethereumPolygonNFT(moralis_key) {
      //https://polygon-mainnet.public.blastapi.io //폴리곤 노드
      //https://polygon-rpc.com                    //폴리곤 노드
      //https://eth-mainnet.public.blastapi.io     // 이더리움 노드
      //https://rpc.ankr.com/eth                   // 이더리움 노드 
  
      //오픈씨 컨트랙트 주소를 통해서 내가 배포한 NFT가 있는지 체크
      //moralis API 에 있는 transction 로그를 이용해 NFT를 가지고 오는 방식  
      let url = "";
      switch(this._chainid)
      {
        case 137:// polygon
          url = "https://deep-index.moralis.io/api/v2/" + this._wallet + "/nft?chain=polygon&format=decimal";
          break;
        case 80001:// polygon mumbai
          url = "https://deep-index.moralis.io/api/v2/" + this._wallet + "/nft?chain=mumbai&format=decimal";
          break;
        case 1://eth 
          url = "https://deep-index.moralis.io/api/v2/" + this._wallet + "/nft?chain=eth&format=decimal";
          break;
        case 3://eth ropsten
          url = "https://deep-index.moralis.io/api/v2/" + this._wallet + "/nft?chain=ropsten&format=decimal";
          break;
        case 4://eth Rinkeby
          url = "https://deep-index.moralis.io/api/v2/" + this._wallet + "/nft?chain=rinkeby&format=decimal";
          break;
      }

      try {
        const response = await axios.get(url,
          {
            headers: {
              "X-API-KEY": moralis_key,
              "Content-Type": "application/json",
              "accept": "application/json"
            }
          });

          let datalist = new Array();
          for (var i = 0; i < response.data.result.length; i++) {
              var user = response.data.result[i];
      
              const NftContract = user.token_address;
              const name = user.name;
              const symbol = user.symbol;
              const tokenId = user.token_id;
              const tokenURI = user.token_uri;
      
              let JsonName = "";
              let JsonDescription = "";
              let JsonURL = "";
      
              const URL = user.token_uri.substring(0, 7);
              const GetJson = await fetch(tokenURI);
              const jsonFile = await GetJson.json();

              JsonName = jsonFile.name;
              JsonDescription = jsonFile.description;
              if (!JsonDescription) {
                  JsonDescription = jsonFile.bio;
              }

              JsonURL = jsonFile.image;
              if (!JsonURL) {
                  JsonURL = jsonFile.image_url;
              }

              datalist.push({ "Contract": NftContract, "ContractName": name,
                              "Symbol": symbol, "Tokenid" : tokenId,
                              "JsonURL" : JsonURL, "JsonName" : JsonName,
                              "JsonDescription" : JsonDescription});
          }
          return datalist;

      } 
      catch (error) {
        console.error(error);
      }
    }

    async KlaytnsendToken (contract, tokenName, tokenId, to)
    {
      //클레이튼NFT 전송    
      let tokenContract = "";
      tokenContract = await new caver.klay.Contract(kip17, contract, {
        from: this._wallet,
      });
  
      tokenContract.options.address = contract;
      tokenContract.methods
        .transferFrom(this._wallet, to, tokenId)
        .send({
          from: this._wallet,
          gas: 0xf4240,
        })
        .then(async () => {
          console.log(" Klaytn send Complete");
        })
        .catch(err => console.log(err));
    };

    async ethereumPolygonsendToken(contract, tokenName, tokenId, to)
    {
      //메타마스크도 주소가 소문자로 들어오기 때문에 변환
      const Add = String(this._wallet).toLowerCase();
      let tokenContract = "";
  
      if (this._chainid == 137 || this._chainid == 80001)  // 폴리곤NFT 전송
      {
        tokenContract = await new this._web3.eth.Contract(erc1155, contract, {
          from: Add,
        });
        tokenContract.options.address = contract;
        await tokenContract.methods
          .safeTransferFrom(Add, to, tokenId, 1, 0)
          .send({
            from: Add,
            gasLimit: 1000000,
            gasPrice: 70000000000,
            gas: 70000,
          })
          .then(async () => {
            console.log("Polygon send Complete");
          })
          .catch(err => console.log(err));
      }
      else {
        //이더리움 NFT 전송
        tokenContract = await new this._web3.eth.Contract(erc721, contract, {
          from: Add,
        });
        tokenContract.options.address = contract;
        await tokenContract.methods
          .transferFrom(Add, to, tokenId)
          .send({
            from: Add,
            gasLimit: 2000000,
            gasPrice: 7000000000,
            maxFeePerGas: 15000000000,
            gas: 69543,
          })
          .then(async () => {
            console.log("ethereum send Complete");
          })
          .catch(err => console.log(err));
      }
  
    };      

}
module.exports = nft_browser_3pm;
module.exports.kip17 = kip17;
module.exports.erc721 = erc721;
module.exports.erc1155 = erc1155;
