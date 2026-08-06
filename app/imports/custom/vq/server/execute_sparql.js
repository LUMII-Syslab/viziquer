import { Meteor } from 'meteor/meteor';
import { fetch, Headers, Request, Response } from 'meteor/fetch';

import { is_project_member } from '../../../libs/platform/user_rights.js'
import { is_public_diagram } from '../../../platform/server/_helpers.js'

import { VQ_sparql_logs } from '../../../db/custom/vq/collections.js'

import xml2js from 'xml2js';

function removeMultilines(q) {
  return q
    .replace(/(\r\n|\n|\r)/gm, ' ')
    .replace(/ {2}/g, ' ')
    .trim();
}

function encodeQueryForUrl(q) {
  const query = removeMultilines(q);
  return encodeURIComponent(query);
}

// function encodeQueryForBody(q) {
//   const query = removeMultilines(q)
//     .replace(/ /g, '+');
//   return encodeURIComponent(query);
// }

// function encodeQuery(q) {
//     let query = q.replace(/(\r\n|\n|\r)/gm," ");
//     query = encodeURIComponent(query);
//     query = query.replace(/\*/g, '%2A');
//     query = query.replace(/\(/g, '%28');
//     query = query.replace(/\)/g, '%29');
//     return query;
// }

function encodeQuery2(q) {
  const query = q.replace(/(\r\n|\n|\r)/gm, ' ')
    .replace(/\s/g, '+')
    .replace(/\?/g, '%3F')
    .replace(/\{/g, '%7B')
    .replace(/\}/g, '%7D');

  // query = query.replace(/\*/g, '%2A');
  // query = query.replace(/\(/g, '%28');
  // query = query.replace(/\)/g, '%29');

  return query;
}

// function encodeQuery3(q) {
//     let query = q.replace(/(\r\n|\n|\r)/gm," ");

//     // query = query.replace(/\s/g, '+');
//     query = query.replace(/\s/g, '%20');
//     query = query.replace(/\!/g, '%21');
//     query = query.replace(/\#/g, '%23');
//     query = query.replace(/\$/g, '%24');
//     query = query.replace(/\%/g, '%25');
//     query = query.replace(/\&/g, '%26');
//     query = query.replace(/\'/g, '%27');
//     query = query.replace(/\(/g, '%28');
//     query = query.replace(/\)/g, '%29');
//     query = query.replace(/\*/g, '%2A');
//     query = query.replace(/\+/g, '%2B');
//     query = query.replace(/\,/g, '%2C');
//     query = query.replace(/\//g, '%2F');
//     query = query.replace(/\:/g, '%3A');
//     query = query.replace(/\;/g, '%3B');
//     query = query.replace(/\=/g, '%3D');
//     query = query.replace(/\?/g, '%3F');
//     query = query.replace(/\@/g, '%40');
//     query = query.replace(/\[/g, '%5B');
//     query = query.replace(/\]/g, '%5D');

//     return query;
// }

// function isURL(s) {
//   const regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
//   return regexp.test(s);
// }

function buildEnhancedQuery(originalQuery, fragmentToFind, fragmentToInsert, fragmentToAdd) {
  const index_of_first_occurence = originalQuery.search(new RegExp(fragmentToFind, 'i'));
  if (index_of_first_occurence !== -1) {
    return originalQuery.substr(0, index_of_first_occurence) + fragmentToInsert + originalQuery.substr(index_of_first_occurence) + fragmentToAdd;
  }
  // console.error('No SELECT in the query');
  throw new Error('No SELECT in the query');
}

async function add_sparql_log(log) {
  await VQ_sparql_logs.insertAsync(log);
}

function detectContentType(content) {
  if (!content) {
    return 'empty';
  }
  if (typeof content !== 'string') {
    return 'not a string';
  }

  const text = content.toLowerCase().trim();
  let ct = 'text';
  if (text.startsWith('<?xml')) ct = 'xml';
  if (text.startsWith('<sparql')) ct = 'xml';
  if (text.startsWith('{')) ct = 'json'; // REFINE ME
  if (text.startsWith('<!doctype')) ct = 'html';
  if (text.startsWith('<html')) ct = 'html';
  if (text.startsWith('<!--')) ct = 'html';
  return `${ct} (${text.length} chars, "${text.length < 32 ? text : `${text.slice(0, 32)}...`}")`;
}

function peekResponseType(response) {
  // console.log('response headers', response.headers, typeof response.headers);
  let header = response.headers.get('content-type');
  console.log('⛑️', header)
  // TODO - varbūt jāiemācās saņemt arī turtle utml?
  if (header.toLowerCase().startsWith(RESPONSE_FORMAT_JSON)) {
    return 'JSON';
  }
  if (header.toLowerCase().startsWith(RESPONSE_FORMAT_JSON_2)) {
    return 'JSON';
  }
  if (header.toLowerCase().startsWith(RESPONSE_FORMAT_XML)) {
    return 'XML';
  }
  if (header.toLowerCase().startsWith(RESPONSE_FORMAT_XML_2)) {
    return 'XML';
  }
  if (header.toLowerCase().startsWith('text')) {
    return 'HTML';
  }
  return 'unk';
}

const TIMEOUT_TEST = 5_000;
const TIMEOUT_EXECUTE = 75_000;

const SPARQL_PAGE_SIZE = 50;

// const PREFER_JSON_RESPONSE = true;
const PREFER_JSON_RESPONSE = false;

// const ENDPOINT_TEST_QUERY = 'SELECT ?a ?b ?c where{?a ?b ?c} LIMIT 10';
const ENDPOINT_TEST_QUERY = 'SELECT (COUNT(*) AS ?number_of_rows_in_query_xyz) WHERE { SELECT ?a ?b ?c where{?a ?b ?c} LIMIT 10 }';

const HEADER_CONTENT_TYPE = 'Content-Type';
const HEADER_ACCEPT = 'Accept';

const PARAM_FORMAT = 'format';
const PARAM_DEFAULT_GRAPH_URI = 'default-graph-uri';

const RESPONSE_FORMAT_XML = 'application/sparql-results+xml';
const RESPONSE_FORMAT_XML_2 = 'application/xml';
const RESPONSE_FORMAT_JSON = 'application/sparql-results+json';
const RESPONSE_FORMAT_JSON_2 = 'application/json';
const RESPONSE_FORMAT_TURTLE = 'text/turtle';
const RESPONSE_FORMAT_XML_SHORT = 'xml';
const RESPONSE_FORMAT_JSON_SHORT = 'json';

const BODY_FORMAT_FORM_URLENCODED = 'application/x-www-form-urlencoded';
const BODY_FORMAT_SPARQL = 'application/sparql-query';

const USER_AGENT = 'ViziQuer 0.x';

const COMMON_HEADERS = {
  'User-Agent': USER_AGENT,
  'Cache-Control': 'no-cache',
};

const DO_CALL_DEBUG0 = (method, url, options, cb) => {
  console.log('☕', method, decodeURI(url), options);
  if (cb) {
    try {
      HTTP.call(method, url, options, (err, resp) => {
        if (resp.statusCode >= 300) {
          console.log('🥤🥤', err, resp);
        }
        console.log('🦊🦊', resp.statusCode, resp.headers['content-type'], detectContentType(resp.content));
        cb(err, resp);
      });
    } catch (err) {
      cb(err);
    }
  } else {
    try {
      const resp = HTTP.call(method, url, options);
      if (resp.statusCode >= 300) {
        console.log('🥤', resp.statusCode, resp);
      }
      console.log('🦊', resp.statusCode, resp.headers['content-type'], detectContentType(resp.content));
      return resp;
    } catch (err) {
      console.error('Error in HTTP call', err);
      return err;
    }
  }
};

const DO_CALL_DEBUG = async (method, url, options) => {
  console.log('☕', method, decodeURI(url), options);
  try {
    options.method = method;
    if (!options.data) delete options.data;

    const resp = await fetch(url, options);
    if (!resp.ok) {
      console.log('🥤', resp.status, resp);
    }
    // console.log('🦊', resp.status, resp.headers['content-type'], detectContentType(resp.content));
    console.log('🦊', resp.status, resp.headers.get(HEADER_CONTENT_TYPE));
    return resp;
  } catch (err) {
    if (['AbortError', 'TimeoutError'].includes(err.name)) {
      console.log(`👻 request timed out at ${TIMEOUT_TEST/1000} seconds`)
    } else {
      console.error('Error in HTTP call', err);
    }
    console.log(err.name)
    return err;
  }
};

const DO_CALL_PROD = (method, url, options, cb) => {
  if (cb) {
    try {
      HTTP.call(method, url, options, cb);
    } catch (err) {
      cb(err);
    }
  } else {
    try {
      return HTTP.call(method, url, options);
    } catch (err) {
      return err;
    }
  }
};

const DO_CALL = DO_CALL_DEBUG;
// const DO_CALL = DO_CALL_PROD;

// NOTE: Blazegraph does not like an empty value for the parameter 'default-graph-uri'.
// NOTE: Blazegraph seems to like User-Agent.

//#region profiles defs

/**
 * HTTP request profiles for calling SPARQL endpoints:
 *
 * P1* - GET with encoded params in URL,
 * P2* - POST with encoded params in body,
 * P3* - POST with raw query in body and remaining params encoded in URL, and
 * P4* - POST with encoded params in URL (non-standard).
 *
 * https://www.w3.org/TR/2013/REC-sparql11-protocol-20130321/
 */

function buildOptionsBase(httpOptions, method, timeout = 0) {
  // if (httpOptions) console.log('⛑️ ⛑️ ⛑️', httpOptions)
  let base = {
    // ...httpOptions,
    method,
    headers: new Headers(COMMON_HEADERS),
  }

  if (typeof httpOptions.endpointUsername === 'string' && typeof httpOptions.endpointPassword === 'string') {
    base.authorization = `Basic ${btoa(`${httpOptions.endpointUsername}:${httpOptions.endpointPassword}`)}`
  }

  if (timeout) {
    base.signal = AbortSignal.timeout(timeout)
  }

  return base
}

function createHttpRequestP1(url, httpOptions, query, namedGraph, preferJSON, timeout) {
  // console.log("profile P1", url, query, namedGraph, httpOptions, preferJSON);
  // let fullUrl = `${url}?query=${encodeQuery2(query)}`;
  // let fullUrl = `${url}?query=${encodeQueryForUrl(query)}`;
  // if (namedGraph) {
  //   fullUrl += `&default-graph-uri=${encodeURIComponent(namedGraph)}`;
  // }
  let fullUrl = new URL(url);
  fullUrl.searchParams.append('query', query);
  if (namedGraph) fullUrl.searchParams.append(PARAM_DEFAULT_GRAPH_URI, namedGraph)

  const fullOptions = buildOptionsBase(httpOptions, 'GET', timeout)

  if (preferJSON) {
    // fullUrl += `&format=${RESPONSE_FORMAT_JSON_SHORT}`;
    fullUrl.searchParams.append('format', RESPONSE_FORMAT_JSON_SHORT);
    fullOptions.headers.append(HEADER_ACCEPT, RESPONSE_FORMAT_JSON);
  } else {
    // fullUrl += `&format=${RESPONSE_FORMAT_XML_SHORT}`;
    fullUrl.searchParams.append('format', RESPONSE_FORMAT_XML_SHORT);
    fullOptions.headers.append(HEADER_ACCEPT, RESPONSE_FORMAT_XML);
  }

  // return DO_CALL('GET', fullUrl, fullOptions);
  return new Request(fullUrl.toString().replace(/\+/g, '%20'), fullOptions);
}

function createHttpRequestP2(url, httpOptions, query, namedGraph, preferJSON, timeout) {
  // console.log("profile P2", url, query, namedGraph, httpOptions, preferJSON);
  const fullUrl = new URL(url);

  const fullOptions = buildOptionsBase(httpOptions, 'POST', timeout);
  fullOptions.headers.append(HEADER_CONTENT_TYPE, BODY_FORMAT_FORM_URLENCODED);

  const params = new URLSearchParams();
  params.append('query', query);

  // fullOptions.content = `query=${encodeQueryForUrl(query)}`;
  // fullOptions.content = `query=${encodeQueryForBody(query)}`;
  // fullOptions.content = `query=${query}`;
  if (namedGraph) {
    // fullOptions.content += `&default-graph-uri=${encodeURIComponent(namedGraph)}`;
    params.append(PARAM_DEFAULT_GRAPH_URI, namedGraph)
  }
  if (preferJSON) {
    // fullOptions.content += `&format=${RESPONSE_FORMAT_JSON_SHORT}`;
    params.append('format', RESPONSE_FORMAT_JSON_SHORT);
    fullOptions.headers.append(HEADER_ACCEPT, RESPONSE_FORMAT_JSON);
  } else {
    // fullOptions.content += `&format=${RESPONSE_FORMAT_XML_SHORT}`;
    params.append('format', RESPONSE_FORMAT_XML_SHORT);
    fullOptions.headers.append(HEADER_ACCEPT, RESPONSE_FORMAT_XML);
  }
  fullOptions.body = params.toString();
  // console.log('👍', params, params.toString())

  // return DO_CALL('POST', fullUrl, fullOptions);
  return new Request(fullUrl, fullOptions);
}

function createHttpRequestP2b(url, httpOptions, query, namedGraph, preferJSON, timeout) {
  // console.log("profile P2b", url, query, namedGraph, httpOptions, preferJSON);
  const fullUrl = new URL(url);

  const fullOptions = buildOptionsBase(httpOptions, 'POST', timeout);
  fullOptions.headers.append(HEADER_CONTENT_TYPE, BODY_FORMAT_FORM_URLENCODED);

  const params = new URLSearchParams();
  params.append('query', encodeQuery2(query));

  if (namedGraph) {
    params.append(PARAM_DEFAULT_GRAPH_URI, namedGraph);
  }
  if (preferJSON) {
    params.append(PARAM_FORMAT, RESPONSE_FORMAT_JSON_SHORT);
    fullOptions.headers.append(HEADER_ACCEPT, RESPONSE_FORMAT_JSON);
  } else {
    params.append(PARAM_FORMAT, RESPONSE_FORMAT_XML_SHORT);
    fullOptions.headers.append(HEADER_ACCEPT, RESPONSE_FORMAT_XML);
  }
  fullOptions.body = params.toString();

  // return DO_CALL('POST', fullUrl, fullOptions);
  return new Request(fullUrl, fullOptions);
}

function createHttpRequestP2c(url, httpOptions, query, namedGraph, preferJSON, timeout) {
  // console.log("profile P2b", url, query, namedGraph, httpOptions, preferJSON);
  const fullUrl = new URL(url);

  preferJSON = false

  const fullOptions = buildOptionsBase(httpOptions, 'POST', timeout);
  fullOptions.headers.append(HEADER_CONTENT_TYPE, BODY_FORMAT_FORM_URLENCODED);

  const params = new URLSearchParams();
  params.append('query', query);

  if (namedGraph) {
    params.append(PARAM_DEFAULT_GRAPH_URI, namedGraph);
  }
  if (preferJSON) {
    params.append('output', 'json');
    // fullOptions.headers.append(HEADER_ACCEPT, RESPONSE_FORMAT_JSON);
  } else {
    params.append('output', 'xml');
    // fullOptions.headers.append(HEADER_ACCEPT, RESPONSE_FORMAT_XML);
  }
  fullOptions.body = params.toString();

  // return DO_CALL('POST', fullUrl, fullOptions);
  return new Request(fullUrl, fullOptions);
}

function createHttpRequestP3(url, httpOptions, query, namedGraph, preferJSON, timeout) {
  // console.log("profile P3", url, query, namedGraph, httpOptions, preferJSON);
  // let fullUrl = `${url}`;
  let fullUrl = new URL(url);
  if (namedGraph) {
    // fullUrl += `?default-graph-uri=${encodeURIComponent(namedGraph)}`;
    fullUrl.searchParams.append(PARAM_DEFAULT_GRAPH_URI, namedGraph);
  }

  const fullOptions = buildOptionsBase(httpOptions, 'POST', timeout);
  fullOptions.headers.append(HEADER_CONTENT_TYPE, BODY_FORMAT_SPARQL);

  if (preferJSON) {
    fullUrl.searchParams.append('format', RESPONSE_FORMAT_JSON_SHORT);
    fullOptions.headers.append(HEADER_ACCEPT, RESPONSE_FORMAT_JSON);
  } else {
    fullUrl.searchParams.append('format', RESPONSE_FORMAT_XML_SHORT);
    fullOptions.headers.append(HEADER_ACCEPT, RESPONSE_FORMAT_XML);
  }

  fullOptions.body = query;

  // return DO_CALL('POST', fullUrl, fullOptions);
  return new Request(fullUrl, fullOptions);
}

function createHttpRequestP4(url, httpOptions, query, namedGraph, preferJSON, timeout) {
  // console.log("profile P4", url, query, namedGraph, httpOptions, preferJSON);
  // let fullUrl = `${url}?query=${encodeQueryForUrl(query)}`;
  let fullUrl = new URL(url);
  fullUrl.searchParams.append('query', query);
  if (namedGraph) {
    // fullUrl += `&default-graph-uri=${encodeURIComponent(namedGraph)}`;
    fullUrl.searchParams.append(PARAM_DEFAULT_GRAPH_URI, namedGraph);
  }

  const fullOptions = buildOptionsBase(httpOptions, 'POST', timeout);

  if (preferJSON) {
    // fullUrl += `&format=${RESPONSE_FORMAT_JSON_SHORT}`;
    fullUrl.searchParams.append('format', RESPONSE_FORMAT_JSON_SHORT);
    fullOptions.headers.append(HEADER_ACCEPT, RESPONSE_FORMAT_JSON);
  } else {
    // fullUrl += `&format=${RESPONSE_FORMAT_XML_SHORT}`;
    fullUrl.searchParams.append('format', RESPONSE_FORMAT_XML_SHORT);
    fullOptions.headers.append(HEADER_ACCEPT, RESPONSE_FORMAT_XML);
  }

  // return DO_CALL('POST', fullUrl, fullOptions);
  return new Request(fullUrl, fullOptions);
}
//#endregion

//#region profileselection
const PROFILE_MAP = {
  P1: createHttpRequestP1,
  P2: createHttpRequestP2,
  P2b: createHttpRequestP2b,
  P2c: createHttpRequestP2c,
  P3: createHttpRequestP3,
  P4: createHttpRequestP4,
};

const DEFAULT_PROFILE_NAME = 'P2'; // <-- change here to switch the default profile for http requests
const DEFAULT_PROFILE = PROFILE_MAP[DEFAULT_PROFILE_NAME];

function selectHttpRequestProfileByName(name) {
  if (!name) return DEFAULT_PROFILE;
  if (PROFILE_MAP[name]) {
    console.log(`Profile ${name} selected`);
    return PROFILE_MAP[name];
  }
  console.log(`Default profile ${DEFAULT_PROFILE_NAME} selected`);
  return DEFAULT_PROFILE;
}

// use the specified profile for matching endpoint(s)
const SITE_SPECIFIC_PROFILES = [
  { pattern: 'wikidata.org', profileName: 'P1' },
  { pattern: 'scholarlydata.org', profileName: 'P4' },
  { pattern: 'digital-agenda-data.eu', profileName: 'P1' },
  { pattern: 'data.nobelprize.org', profileName: 'P2c' },
];

function selectHttpRequestProfileNameByUrl(url) {
  const profile = SITE_SPECIFIC_PROFILES.find(x => url.includes(x.pattern));
  if (profile) return profile.profileName;

  return DEFAULT_PROFILE_NAME;
}

function selectHttpRequestProfile(options) {
  if (options && options.httpRequestProfileName) {
    return selectHttpRequestProfileByName(options.httpRequestProfileName);
  }
  const profileName = selectHttpRequestProfileNameByUrl(options.endpoint);
  return selectHttpRequestProfileByName(profileName);
}
//#endregion

// ---------------------

/**
 * @typedef {Object} ExecuteSparqlSimpleJsonParams
 * @property {string} url
 * @property {string} query
 */

/**
 * Turn non-binary body response into JSON representation.
 *
 * This is needed so that the data can be transferred via Meteor.methods websocket.
 *
 * @param {Response} response
 *
 * @return {Promise<[string, ResponseInit]>}
 */
export async function jsonifyResponse(response) {
  const body = await response.text();
  /** @type {ResponseInit} */
  const responseInit = {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText
  };

  return [body, responseInit];
}

Meteor.methods({
  /**
   * @param {ExecuteSparqlSimpleJsonParams} options
   */
  async executeSparqlSimpleJson({ url, query }) {
    const timeout = TIMEOUT_EXECUTE;

    const baseOptions = buildOptionsBase({}, "POST", timeout);

    const req = new Request(url, {
        ...baseOptions,
        method: "POST",
        headers: {
          "Accept": "application/sparql-results+json",
        },
        body: new URLSearchParams({
            query,
        })
    });

    const res = await fetch(req);
    return await jsonifyResponse(res);
  },


  /**
   *
   * @param {*} list: {
   *   projectId,
   *   versionId,
   *   diagramId,
   *   options: {
   *     params: {
   *       params: {
   *         "default-graph-uri": graph_iri,
   *         query: sparql,
   *       }
   *     },
   *     endpoint,
   *     endpointUsername?,
   *     endpointPassword?,
   *     httpRequestProfileName?,
   *     paging_info?: {},
   *   }
   * }
   * @returns {
   *   status,
   *   result: {
   *     sparql: {
   *       head: { vars: [ %v% ] },
   *       results: { bindings: [ { %v%: { type, value }} ] }
   *     }
   *   },
   *   error: string | { response: { content } }
   * }
   *
   * https://www.w3.org/TR/sparql11-results-json/
   * https://www.w3.org/TR/2013/REC-rdf-sparql-XMLres-20130321/
   *
   * status 503 - endpoint unreachable
   * status 504 - results unreadable
   */
  async executeSparql(list) {
    const user_id = Meteor.userId();

    if (!await is_project_member(user_id, list) && !is_public_diagram(list.diagramId)) {
      return null;
    }

    const { options } = list;
    if (!options || !options.params || !options.params.params || !options.params.params.query) {
      console.error('The query is empty – returning immediately');
      return { status: 500, error: 'The query is empty' };
    }

    let limit_set = false;
    let number_of_rows = 0;

    // const authOptions = {};//MMM
    // if (hasAuthInfo(options)) {
    //   authOptions.auth = makeAuthString(options);
    // }

    // requestFunction(url, httpOptions, query, namedGraph="", preferJSON = false, callback = null);
    const HTTP_REQUEST_BUILDER = selectHttpRequestProfile(options);

    const currentTime = new Date();
    const sparql_log_entry = {
      ...list,
      user: user_id,
      date: currentTime.toLocaleDateString(),
      time: currentTime.toLocaleTimeString(),
    };

    if (!options.paging_info) {
      // let's try to determine the number of rows in the result
      try {
        // clone object. It is an efficient hack
        const countOptions = JSON.parse(JSON.stringify(options));

        // inserting SELECT COUNT before the first occurence of SELECT
        console.log('👽', countOptions.params.params.query);
        // let query = count_options.params.params.query.toLowerCase().includes(' limit ')
        const query = /([\n\s])+limit([\n\s])+/i.test(countOptions.params.params.query)
          ? buildEnhancedQuery(countOptions.params.params.query, 'SELECT', ' SELECT (COUNT(*) as ?number_of_rows_in_query_xyz) WHERE { ', '}')
          : buildEnhancedQuery(countOptions.params.params.query, 'SELECT', ' SELECT (COUNT(*) as ?number_of_rows_in_query_xyz) WHERE { ', '  LIMIT 10000 }');

        const namedGraph = countOptions.params.params[PARAM_DEFAULT_GRAPH_URI];

        // const httpOptions = { ...authOptions };
        // let httpOptions = Object.assign({}, count_options.params, authOptions); // ?? vai count_options.params var saturēt ko noderīgu?

        // const countRequest = HTTP_REQUEST_BUILDER(countOptions.endpoint, options, query, namedGraph, PREFER_JSON_RESPONSE, TIMEOUT_TEST);
        const countRequest = HTTP_REQUEST_BUILDER(countOptions.endpoint, options, query, namedGraph, true, TIMEOUT_TEST);
        const countResponse = await fetch(countRequest);

        if (countResponse.ok) {
          const respType = peekResponseType(countResponse);
          if (respType === 'JSON') {
            const content = await countResponse.json();
            // console.log('👽 👽', JSON.stringify(content, null, 2));

            number_of_rows = content.results.bindings[0].number_of_rows_in_query_xyz.value;

            sparql_log_entry.successfull = true;
            if (number_of_rows > SPARQL_PAGE_SIZE) {
              options.params.params.query = buildEnhancedQuery(
                options.params.params.query,
                'SELECT',
                'SELECT * WHERE {',
                `} LIMIT ${SPARQL_PAGE_SIZE}`,
              );
              limit_set = true;
            }
          } else if (respType === 'XML') {
            const content = await countResponse.text();
            const xmlJson = await xml2js.parseStringPromise(content);
            // console.log('👽 👽', JSON.stringify(xmlJson, null, 2));

            number_of_rows = xmlJson.sparql.results[0].result[0].binding[0].literal[0]._;

            sparql_log_entry.successfull = true;
            if (number_of_rows > SPARQL_PAGE_SIZE) {
              options.params.params.query = buildEnhancedQuery(
                options.params.params.query,
                'SELECT',
                'SELECT * WHERE {',
                `} LIMIT ${SPARQL_PAGE_SIZE}`,
              );
              limit_set = true;
            }
          } else {
            console.error(`unsupported response type ${respType}`);
            sparql_log_entry.successfull = false;
            sparql_log_entry.error_message = `Unsupported response type: ${respType}`;
            throw new Error(sparql_log_entry.error_message);
          }

        }
      } catch (ex) {
        // ERROR - pass the original SPARQL to the server
        sparql_log_entry.successfull = false;
        sparql_log_entry.error_message = ex;
        console.error(ex);

        options.params.params.query = buildEnhancedQuery(
          options.params.params.query,
          'SELECT',
          'SELECT * WHERE {',
          `} LIMIT ${SPARQL_PAGE_SIZE}`,
        );
        limit_set = true;
      }
    } else if (!options.paging_info.download) {
      options.params.params.query = buildEnhancedQuery(
        options.params.params.query,
        'SELECT',
        'SELECT * WHERE {',
        `} OFFSET ${options.paging_info.offset} LIMIT ${options.paging_info.limit}`,
      );
      limit_set = true;
      number_of_rows = options.paging_info.number_of_rows;
    } else {
      // Do not change query
      // Since no refresh is intended = no additional parameters required
    }

    sparql_log_entry.number_of_rows = number_of_rows;
    await add_sparql_log(sparql_log_entry);

    // to modify endpoint by adding URL encoded querry
    const { query } = options.params.params;
    const namedGraph = options.params.params[PARAM_DEFAULT_GRAPH_URI];

    // query = encodeQuery(query);
    // options.endpoint = options.endpoint + '?'+ 'default-graph-uri=' + namedGraph +'&query=' + query;

    // const httpOptions = { ...authOptions };
    // let httpOptions = Object.assign({}, options.params, authOptions);

    try {
      let errorMessage;

      const req = HTTP_REQUEST_BUILDER(options.endpoint, options, query, namedGraph, PREFER_JSON_RESPONSE, TIMEOUT_EXECUTE);
      const resp2 = await fetch(req);

      if (resp2.ok) {
        const respType = peekResponseType(resp2);
        if (respType === 'JSON') {
            // TODO: saskaņot JSON un XML formātu apstrādi; šobrīd JSON netiks saprasts
            const json_res = { sparql: await resp2.json() };
            if (limit_set) {
              if (options.paging_info) {
                json_res.limit = SPARQL_PAGE_SIZE;
                json_res.offset = options.paging_info.offset + SPARQL_PAGE_SIZE;
              } else {
                json_res.limit = SPARQL_PAGE_SIZE;
                json_res.offset = SPARQL_PAGE_SIZE;
              }
            }
            json_res.limit_set = limit_set;
            json_res.number_of_rows = number_of_rows;

            return({ status: 200, result: json_res });
        } else if (respType === 'XML') { // xml
          let xmlText = await resp2.text();
          let xmlJson = await xml2js.parseStringPromise(xmlText);

          const result = {
            ...xmlJson,
            limit_set,
            number_of_rows,
          };

          if (limit_set) {
            if (options.paging_info) {
              result.limit = SPARQL_PAGE_SIZE;
              result.offset = options.paging_info.offset + SPARQL_PAGE_SIZE;
            } else {
              result.limit = SPARQL_PAGE_SIZE;
              result.offset = SPARQL_PAGE_SIZE;
            }
          }
          return({ status: 200, result });
        } else {
          console.error(`unsupported response type ${respType}`)
          return { status: 400 }
        }

      } else {
        let badText = await resp2.text();
        return({
          status: 505,
          error: badText.length > 514
            ? badText.slice(0, 514) + '...'
            : badText,
          limit_set: false,
          number_of_rows: 0,
        });
      }
    } catch(err) {
      return({
        status: 504,
        // error: new Error('Unable to parse JSON response'),
        error: 'bad response from the endpoint: ' + err.message,
        limit_set: false,
        number_of_rows: 0 })
    }

  },



  async testProjectEndpoint(options) {
    const user_id = Meteor.userId();

    if (!(await is_project_member(user_id, options))) return null;

    console.log('in test endpoint');
    console.log('options:', options);

    if (!options.endpoint) {
      console.error('No data specified');
      return {
        status: 500,
      };
    }

    const HTTP_REQUEST_BUILDER = selectHttpRequestProfile(options);

    const httpOptions = {};

    try {
      // let r = await HTTP_REQUEST_BUILDER(options.endpoint, httpOptions, ENDPOINT_TEST_QUERY, options.uri, false);
      let req = HTTP_REQUEST_BUILDER(options.endpoint, httpOptions, ENDPOINT_TEST_QUERY, options.uri, PREFER_JSON_RESPONSE, TIMEOUT_TEST);
      // console.log(req.url, req.method, req.headers)
      // console.log(decodeURI(req.body.toString()))
      let resp = await fetch(req);
      // console.log(resp.headers)

      if (resp.ok) {
        let resposeFormat = peekResponseType(resp)
        if (resposeFormat === 'JSON') {
          let data = await resp.json();
          // console.log('😎 😎 😎', JSON.stringify(data, null, 2))
          return({ status: 200, });
        } else if (resposeFormat === 'XML') {
          let xmlText = await resp.text();
          let xmlJson = await xml2js.parseStringPromise(xmlText);
          // console.log('😎 😎 😎 😎', JSON.stringify(xmlJson, null, 2))
          return({ status: 200, });
        } else {
          // TODO
          let text = await resp.text()
          console.log('👻 👻 👻', text.slice(0, 1000))
        }
      }

      console.log(`status not ok (${resp.status})`);
      // console.log(resp)
      if (resp.status === 401) {
        return({ status: 401, });
      } else {
        return({ status: 500, });
      }

    } catch(err) {
      console.error('error while testing connection', err);
      return({ status: 500, });
    }

  },

/*
  async testProjectEndPointOld(options) {
    const user_id = Meteor.userId();
    if (!(await is_project_member(user_id, options))) return;

    console.log('in test endpoint');
    // console.log("options:", options);

    if (!options.endpoint) {
      console.error('No data specified');
      return { status: 500, };
    }

    const HTTP_REQUEST_BUILDER = selectHttpRequestProfile(options);

    // const Future = Npm.require('fibers/future'); // FIXME
    const future = new Future();

    let httpOptions = {};

    if (hasAuthInfo(options)) {
      httpOptions = { auth: makeAuthString(options) }
    }

    let testResults = {};

    for (let profile of ['P1', 'P2', 'P3', 'P4']) {
      console.log('trying profile', profile);
      let fn = selectHttpRequestProfileByName(profile);

      try {
        let resp = fn(options.endpoint, httpOptions, ENDPOINT_TEST_QUERY, options.uri, false);
        let ct = detectContentType(resp.content);
        testResults[profile] = ct;
        if (ct === 'xml') {
          let xml = xml2js.parseStringSync(resp.content);
        }
      } catch (e) {
        testResults[profile] = "fail";
      }
    }

    console.log(testResults);
    return {
      status: 200,
    };
  },
*/

});
