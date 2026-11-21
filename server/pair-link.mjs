// Prints the pairing link to open once on each device (phone, computer).
// Usage: node pair-link.mjs https://raspberrypi.<tailnet>.ts.net <SYNC_TOKEN> [app URL]
const [url, token, app = 'https://minihollow.github.io/petit-a-petit/'] = process.argv.slice(2);
if (!/^https:\/\//.test(url || '') || !token) {
  console.error('Usage: node pair-link.mjs https://<pi>.<tailnet>.ts.net <SYNC_TOKEN> [app URL]');
  process.exit(1);
}
const code = Buffer.from(JSON.stringify({ u: url.replace(/\/+$/, ''), t: token })).toString('base64url');
console.log(`${app}#pair=${code}`);
