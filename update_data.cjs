
const fs = require('fs');
const path = './src/data/initialData.ts';
let content = fs.readFileSync(path, 'utf8');

const tokens = content.match(/\{[^]*?\}/g);
if (tokens) {
    tokens.forEach(token => {
        if (token.includes('alphaScore') && !token.includes('confidence')) {
            let updatedToken = token;
            updatedToken = updatedToken.replace('alphaScore: ', 'confidence: 90,\n    estimatedProfitLow: 50,\n    estimatedProfitHigh: 100,\n    alphaScore: ');
            content = content.replace(token, updatedToken);
        }
    });
    fs.writeFileSync(path, content);
    console.log('Updated tokens');
}
