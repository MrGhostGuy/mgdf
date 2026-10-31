const fs = require('fs');
const path = require('path');
const QRCode = require('C:/Users/kency/Desktop/qr-generator/node_modules/qrcode');

const BASE_URL = 'https://mrghostguy.github.io/mgdf';
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'qr-codes', 'mgdf.png');
const META_OUT = path.join(ROOT, 'docs', 'creation.json');

const qrData = {
  title: 'MGDF',
  url: BASE_URL + '/',
  description: 'MR. GHOST digital frontier: searchable game archive and launcher. By Mr. Ghost.',
  iconUrl: BASE_URL + '/icon.png',
  themeColor: '#4DEAFF'
};

(async () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(META_OUT, JSON.stringify(qrData, null, 2) + '\n', 'utf8');
  await QRCode.toFile(OUT, JSON.stringify(qrData), {
    width: 460,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' }
  });
  console.log('Created:', OUT);
  console.log('Payload:', JSON.stringify(qrData));
  console.log('Length:', JSON.stringify(qrData).length);
})().catch(err => { console.error(err); process.exit(1); });
