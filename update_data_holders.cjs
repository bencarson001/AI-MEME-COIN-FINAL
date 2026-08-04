const fs = require('fs');
const path = './src/data/initialData.ts';
let content = fs.readFileSync(path, 'utf8');

const tokens = content.match(/\{[^]*?\}/g);
if (tokens) {
    tokens.forEach(token => {
        if (token.includes('alphaScore') && !token.includes('holdersCount')) {
            let updatedToken = token;
            // Insert after alphaScore
            updatedToken = updatedToken.replace('alphaScore: ', 'holdersCount: 2000,\n    alphaScore: ');
            content = content.replace(token, updatedToken);
        }
    });
    fs.writeFileSync(path, content);
    console.log('Updated tokens in initialData.ts');
}
