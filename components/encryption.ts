import { createRequire, config } from '../deps.ts';

const require = createRequire(import.meta.url);
const CryptoJS = require('crypto-js');
const key = config().CRYPTO_KEY;

function encrypt(data: any) {
  return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
}

function decrypt(data: any) {
  const bytes = CryptoJS.AES.decrypt(data, key);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
}

export { encrypt, decrypt };
