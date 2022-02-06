// ⭐️ access Web3auth package from window.

let web3AuthInstance = null;

async function initWeb3Auth () {
    const { Web3Auth } = window.Web3auth;

    // ⭐️ STEP: 1
    web3AuthInstance = new Web3Auth({
        chainConfig: {
            chainNamespace: "eip155",
			  	chainId: `0x${(137).toString(16)}`
        },
        clientId: "BBTkiWNqG4YdXVqfuuffGIgcX6HJZcVSiung7iR5DlpkpXcK9A9Ai_veWlMHZhT9wYiP1IkF_HLt4BUKrQ68ZjM",
    });


    // ⭐️ STEP: 2
    subscribeAuthEvents(web3AuthInstance)

    // ⭐️ STEP: 3
    await web3AuthInstance.initModal();

    // ⭐️ STEP: 4
    // login();

}

function subscribeAuthEvents(web3auth) {
    web3auth.on("connected", (data) => {
        console.log("Yeah!, you are successfully logged in", data);
    });

    web3auth.on("connecting", () => {
        console.log("connecting");
    });

    web3auth.on("disconnected", () => {
        console.log("disconnected");
    });

    web3auth.on("errored", (error) => {
        console.log("some error or user have cancelled login request", error);
    });

    web3auth.on("MODAL_VISIBILITY", (isVisible) => {
        console.log("modal visibility", isVisible)
    });
}

// ⭐️ STEP 4:
// this function will be triggered on click of button with login id.
async function login() {

    // we will use this provider with web3 library in STEP 5.
    const provider = await web3AuthInstance.connect()

    // ⭐️ It will return user's social information if logged in with social login method
    // else it will return empty object.
    const user = await web3AuthInstance.getUserInfo();

    // console.log('user', user);

    return initWeb3();
}


// ⭐️ STEP 5:
async function initWeb3() {
    // we can access this provider on `web3AuthInstance` only after user is logged in.
    // This provider is also returned as a response of `connect` function in step 4. You can use either ways.
    const web3 = new Web3(web3AuthInstance.provider);

    window.web3 = web3;

    const address = (await web3.eth.getAccounts())[0];
    const balance = await web3.eth.getBalance(address);

    console.log('Connected to Ethereum network', {
        address, balance,
    });

    return web3;
}

async function createPassword (web3) {
    // create password just by signing "I agree with terms and conditions playing mew2earn"
    // and then you can use this password to login.

    const accounts = await web3.eth.getAccounts();
    const msg = "I agree with terms and conditions playing mew2earn"

    const prefix = "\x19Ethereum Signed Message:\n" + msg.length
    const msgHash1 = web3.utils.sha3(prefix + msg)

    const sig1 = await web3.eth.sign(msgHash1, accounts[0]);

    // To recover:
    // let whoSigned1 = await web3.eth.accounts.recover(msgHash1, sig1)

    console.log('password (signature)', sig1);

    return sig1
}

// async function createPasswordEIP712(web3) {
//      https://gist.github.com/JTraversa/a88edab6f7d9457317928483e78d8681
// }

/**
 *

How do I make my bot log in?
After connecting to the server, it will send a |challstr| message containing a nonce. From here, there are two different ways to select an account. These will be explained separately.

How do I make my bot log in to an unregistered account?
Make a GET request to https://play.pokemonshowdown.com/~~showdown/action.php. The following parameters must be included in the URL:

act: must be getassertion
userid: must be the user ID you want to use
challstr: the nonce you received from the server
For example, here's the HTTP request for a GET request to attempt to use "morfent" as a username:

GET /~~showdown/action.php?act=getassertion&userid=morfent&challstr=4|... HTTP/1.1
Host: play.pokemonshowdown.com
The server will return what's called an assertion as a response. The following are considered errors:

if the assertion is just ";", this indicates that the username given is registered
if the assertion begins with ";;", this indicates any other type of error occurred while logging in
What to do with the assertion will be explained later.

How do I make my bot log in to a registered account?
Make a POST request to https://pokemonshowdown.com/~~showdown/action.php. A Content-Type header must be specified as being application/x-www-form-urlencoded; encoding=UTF-8. The body of the request must be a JSON object containing the following keys:

act: must be "login"
name: the username wanted
pass: the password wanted
challstr: the nonce received from the server
For example, here's an HTTP request to log in as "bongsniffer69" (note: lacks a real nonce):

POST /~~showdown/action.php HTTP/1.1
Host: play.pokemonshowdown.com
Content-Type: application/x-www-form-urlencoded; encoding=UTF-8

act=login&name=bongsniffer69&pass=notmyrealpasswordlol&challstr=4%7C...
The server will return what's called an assertion as a response. It is another JSON object prefixed with "]". Most of the metadata included isn't important; here's all you need to care about, given a variable data containing the JSON object:

if data.curuser.loggedin is false, either the username, password, or challstr was incorrect
if data.assertion starts with ";;", any other type of error occurred while logging in
Keep data.assertion and ignore the rest of the metadata. What you do with the assertion will be explained later.

OK, I have an assertion, now what do I do with it?
Send a /trn message to the global room. /trn takes three parameters, separated by commas:

a username
an avatar
an assertion
For example:

|/trn Morfent,128,4|...

 */
async function loginWeb3(challstr) {
    console.log('calling loginWeb3 with challstr', challstr);

    // call act=getassertion to check if username is used
    // post name and pass to act=login
    // get sid and token from response

    await initWeb3Auth();
    await login();

    const web3 = await initWeb3();

    const [address] = await web3.eth.getAccounts();
    const password = await createPassword(web3);

    const url = 'https://pokemon-proxy-api.vercel.app/api/action'

    // from 2 to 20 characters of address
    const name = `0x${address.substring(2, 6)}...${address.slice(-4)}`;

    const data = {
        act: 'getassertion',
        userid: name,
        challstr,
    }

    const params = new URLSearchParams(data).toString()

    const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; encoding=UTF-8',
        },
    });

    const res = await response.text();

    // parse sid from response cookies
    const sid = response.headers.get('x-buildship-set-cookie');

    console.log('sid', sid);

    // parse token from response cookies
    window.sid = sid?.split(';')[0].split('=')[1];

    // ???
    document.cookie = `${sid};${document.cookie}`;

    if (res[0] !== ';') {

        const assertion = res;

        console.log('assertion', res);

        registerUsername(name, res);

        return res;

        // $.post(app.user.getActionPHP(), {
        //     act: 'register',
        //     username: name,
        //     password: password,
        //     cpassword: password,
        //     captcha: 'pikachu',
        //     challstr: challstr
        // },

        // const data = {
        //     act: 'register',
        //     username: name,
        //     password: password,
        //     cpassword: password,
        //     captcha: 'pikachu',
        //     challstr: challstr,
        // }

        // const response = await fetch(`${url}`, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/x-www-form-urlencoded; encoding=UTF-8',
        //     },
        //     body: new URLSearchParams(data).toString(),
        // });

        // const res = await response.text();

    }

    // if assertion is just ";", this indicates that the username given is registered
    // if the assertion begins with ";;", this indicates any other type of error occurred while logging in
    if (res[1] === ';') {
        app.addPopupMessage("Username is already registered");
        throw new Error(res.slice(2));
    }

    console.log('username is registered');

    const data2 = {
        act: 'login',
        name: name,
        pass: password,
        challstr,
    }

    const response2 = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded; encoding=UTF-8',
        },
        body: new URLSearchParams(data2),
    });

    const data3 = await response2.json();

    console.log('LOGIN data3', data3);

    const { assertion } = data3;

    registerUsername(name, assertion);

    return assertion;

}

async function registerUsername(name, assertion) {
    // /trn username, avatar, assertion

    app.send('/trn ' + name + ',1,' + assertion);
    app.addPopupMessage("You have been successfully registered. " + name);
}

const NFT_ADDRESS = '0x082B3C4eE12471254C578Dae7AD3A996c8840198'
const NFT_ABI = [{ "inputs": [], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "approved", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "Approval", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "operator", "type": "address" }, { "indexed": false, "internalType": "bool", "name": "approved", "type": "bool" }], "name": "ApprovalForAll", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "extensionAddress", "type": "address" }], "name": "ExtensionAdded", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "extensionAddress", "type": "address" }], "name": "ExtensionRevoked", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "extensionAddress", "type": "address" }], "name": "ExtensionURIAdded", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }], "name": "OwnershipTransferred", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "Transfer", "type": "event" }, { "inputs": [], "name": "DEVELOPER", "outputs": [{ "internalType": "string", "name": "_url", "type": "string" }], "stateMutability": "pure", "type": "function" }, { "inputs": [], "name": "DEVELOPER_ADDRESS", "outputs": [{ "internalType": "address payable", "name": "_dev", "type": "address" }], "stateMutability": "pure", "type": "function" }, { "inputs": [], "name": "DEVELOPER_FEE", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "PROVENANCE_HASH", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "SALE_STARTS_AT_INFINITY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_extension", "type": "address" }], "name": "addExtension", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "approve", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "nTokens", "type": "uint256" }, { "internalType": "address", "name": "to", "type": "address" }], "name": "claim", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "contractURI", "outputs": [{ "internalType": "string", "name": "uri", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "createdAt", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "data", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "extensions", "outputs": [{ "internalType": "contract INFTExtension", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "freeze", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "getApproved", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_price", "type": "uint256" }, { "internalType": "uint256", "name": "_maxSupply", "type": "uint256" }, { "internalType": "uint256", "name": "_nReserved", "type": "uint256" }, { "internalType": "uint256", "name": "_maxPerMint", "type": "uint256" }, { "internalType": "uint256", "name": "_royaltyFee", "type": "uint256" }, { "internalType": "string", "name": "_uri", "type": "string" }, { "internalType": "string", "name": "_name", "type": "string" }, { "internalType": "string", "name": "_symbol", "type": "string" }], "name": "initialize", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "operator", "type": "address" }], "name": "isApprovedForAll", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_extension", "type": "address" }], "name": "isExtensionAllowed", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "isFrozen", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "maxPerMint", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "maxSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "nTokens", "type": "uint256" }], "name": "mint", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "nTokens", "type": "uint256" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "bytes32", "name": "extraData", "type": "bytes32" }], "name": "mintExternal", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "ownerOf", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "price", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "reserved", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_extension", "type": "address" }], "name": "revokeExtension", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "royaltyFee", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }, { "internalType": "uint256", "name": "salePrice", "type": "uint256" }], "name": "royaltyInfo", "outputs": [{ "internalType": "address", "name": "receiver", "type": "address" }, { "internalType": "uint256", "name": "royaltyAmount", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "royaltyReceiver", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "bytes", "name": "_data", "type": "bytes" }], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "saleStarted", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "operator", "type": "address" }, { "internalType": "bool", "name": "approved", "type": "bool" }], "name": "setApprovalForAll", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "string", "name": "uri", "type": "string" }], "name": "setBaseURI", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "string", "name": "uri", "type": "string" }], "name": "setContractURI", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "extension", "type": "address" }], "name": "setExtensionTokenURI", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bool", "name": "_isOpenSeaProxyActive", "type": "bool" }], "name": "setIsOpenSeaProxyActive", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_price", "type": "uint256" }], "name": "setPrice", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "string", "name": "provenanceHash", "type": "string" }], "name": "setProvenanceHash", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_royaltyFee", "type": "uint256" }], "name": "setRoyaltyFee", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_receiver", "type": "address" }], "name": "setRoyaltyReceiver", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "startSale", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "startTimestamp", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "stopSale", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes4", "name": "interfaceId", "type": "bytes4" }], "name": "supportsInterface", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "tokenURI", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "transferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_startTimestamp", "type": "uint256" }], "name": "updateStartTimestamp", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "uriExtension", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "contract IERC20", "name": "token", "type": "address" }], "name": "withdrawToken", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "stateMutability": "payable", "type": "receive" }]

async function fetchTeam(web3) {
    const [ address ] = await web3.eth.getAccounts();

    const contract = new web3.eth.Contract(NFT_ABI, NFT_ADDRESS);

    const balance = await contract.methods.balanceOf(address).call();

    console.log('balance', balance);

    // const team = {};

    // for (let i = 0; i < balance; i++) {
    //     const tokenId = await contract.methods.tokenOfOwnerByIndex(address, i).call();
    //     const token = await contract.methods.tokenURI(tokenId).call();
    //     const name = token.split('/')[1];
    //     team[name] = tokenId;
    // }

}

window.login = login;
window.initWeb3 = initWeb3;
window.createPassword = createPassword;
window.loginWeb3 = loginWeb3;

