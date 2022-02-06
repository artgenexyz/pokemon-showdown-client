// ⭐️ access Web3auth package from window.

let web3AuthInstance = null;

async function initWeb3Auth () {
    const { Web3Auth } = window.Web3auth;

    // ⭐️ STEP: 1
    web3AuthInstance = new Web3Auth({
        chainConfig: {
            chainNamespace: "eip155"
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

    const url = '/api/action'

    // from 2 to 20 characters of address
    const name = `walletX${address.substring(2, 10)}`;

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

        console.log('assertion', res);

        registerUsername(name, res);

        return res;
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

    // MAKE_SID_SET();

    return assertion;

}

async function registerUsername(name, assertion) {
    // /trn username, avatar, assertion

    app.send('/trn ' + name + ',1,' + assertion);
    app.addPopupMessage("You have been successfully registered. " + name);
}

window.login = login;
window.initWeb3 = initWeb3;
window.createPassword = createPassword;
window.loginWeb3 = loginWeb3;

