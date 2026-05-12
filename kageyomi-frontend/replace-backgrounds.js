import fs from 'fs';

function replaceBackgrounds(path) {
  let content = fs.readFileSync(path, 'utf8');
  
  content = content.replace(/bg-\[\#0a0a0a\]/g, 'bg-zinc-950');
  content = content.replace(/bg-\[\#050505\]/g, 'bg-black');
  content = content.replace(/bg-\[\#101010\]/g, 'bg-zinc-900');
  
  fs.writeFileSync(path, content, 'utf8');
}

replaceBackgrounds('src/pages/Landing.tsx');
replaceBackgrounds('src/pages/Dashboard.tsx');
