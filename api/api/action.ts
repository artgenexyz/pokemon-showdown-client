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
The server will return what's called an assertion as a response. It is another JSON object prefixed with "]".
Most of the metadata included isn't important; here's all you need to care about, given a variable data containing the JSON object:

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

import https from 'https';

import type { VercelApiHandler } from '@vercel/node';
import axios from 'axios';

import { allowCors } from './_cors';
import { BASE_URL } from './_constant';

const replaceCookiesHost = (oldCookies: string[] = [], newHost: string) => {

		if (!oldCookies.length) return '';

		const sid = oldCookies.find(cookie => cookie.startsWith('sid='));

		if (!sid) {
				return '';
		}

		// parse sid cookie and change domain to request origin
		const sidCookie = sid.split(';')[0];
		const sidCookieParts = sidCookie.split('=');
		const sidCookieName = sidCookieParts[0];
		const sidCookieValue = sidCookieParts[1];

		// extract host from referrer
		const sidCookieHost = newHost;

		const newSidCookie = `${sidCookieName}=${sidCookieValue}; Domain=${sidCookieHost}; Path=/; Secure; HttpOnly; SameSite=None`;

		console.log('newSidCookie', newSidCookie);

		return newSidCookie;
};

const replaceHost = (request: any) => request.headers.referer.replace(/^https?:\/\//, '').replace(/\/.*/, '');

const handler: VercelApiHandler = async (request, response) => {
		const { act, challstr } = request.query;

		const httpsAgent = new https.Agent({ rejectUnauthorized: false });

		// print request query

		console.log('request.query', request.query);

		// print request headers

		console.log('request.headers', request.headers);

		try {
				if (act === 'getassertion') {
						const { userid } = request.query;

						const res = await axios(`${BASE_URL}?act=getassertion&userid=${userid}&challstr=${challstr}`, { httpsAgent });

						// print cookies
						console.log('COOKIES', res.headers['set-cookie']);

						const newHost = replaceHost(request);
						const newSidCookie = replaceCookiesHost(res.headers['set-cookie'], newHost);

						response.setHeader('Set-Cookie', [newSidCookie]);
						response.setHeader('X-Buildship-Set-Cookie', [newSidCookie]);

						response.send(res.data);
				} else if (act === 'login') {
						const { name, pass } = request.query;

						// TODO: CHECK that pass is a signature by the same address as name

						const res = await axios(`${BASE_URL}?act=login&name=${name}&pass=${pass}&challstr=${challstr}`, { httpsAgent });

						// print cookies
						console.log('COOKIES', res.headers['set-cookie']);

						const newHost = replaceHost(request);
						const newSidCookie = replaceCookiesHost(res.headers['set-cookie'], newHost);

						response.setHeader('Set-Cookie', [newSidCookie]);
						response.setHeader('X-Buildship-Set-Cookie', [newSidCookie]);

						response.send(res.data);

				} else {
						// redirect all values and method to BASE_URL
						const { method, url, headers, body } = request;

						if (method === 'GET') {
								const [ , query ] = url?.split('?') || [];
								const params = new URLSearchParams(query);
								const newUrl = `${BASE_URL}?${params.toString()}`;

								const res = await axios(newUrl, {
										method: method as any,
										headers: {
												...(headers as any),
										},
										httpsAgent,
								});

								const newHost = replaceHost(request);
								const newSidCookie = replaceCookiesHost(res.headers['set-cookie'], newHost);

								response.setHeader('Set-Cookie', [newSidCookie]);
								response.setHeader('X-Buildship-Set-Cookie', [newSidCookie]);

								response.send(res.data);
						} else {
								console.log('HEADERS', headers);
								console.log('BODY', body);

								const res = await axios(`${BASE_URL}`, {
										method: method as any,
										headers: {
												...(Object.keys(headers).reduce((acc, cur) => {
														return {
																...acc,
																[cur]: headers[cur],
														};
												}, {}) as ({ [ key: string ]: string })),
										},
										data: body,
										httpsAgent,
								});

								const newHost = replaceHost(request);
								const newSidCookie = replaceCookiesHost(res.headers['set-cookie'], newHost);

								response.setHeader('Set-Cookie', [newSidCookie]);
								response.setHeader('X-Buildship-Set-Cookie', [newSidCookie]);

								response.send(res.data);
						}
				}

		} catch (err: any) {
				console.log(err.message);
				// console.log(err.request);

				response.status(500).json({ error: 'Server Error', message: err.message });
		}

};

export default allowCors(handler);
