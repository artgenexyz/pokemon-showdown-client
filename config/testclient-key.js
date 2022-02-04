// take key from url query string
const [ , POKEMON_SHOWDOWN_TESTCLIENT_KEY ] = (typeof window !== 'undefined' && window.location && window.location.search)
    ? window.location.search.match(/key=([^&]+)/)
    : null;

console.log('Using POKEMON_SHOWDOWN_TESTCLIENT_KEY:', POKEMON_SHOWDOWN_TESTCLIENT_KEY);
