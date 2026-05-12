import fs from 'fs';

function replaceColors(path) {
  let content = fs.readFileSync(path, 'utf8');
  
  // Replace emerald with orange
  content = content.replace(/emerald/g, 'orange');
  content = content.replace(/10B981/ig, 'f97316');
  content = content.replace(/16,185,129/g, '249,115,22');
  
  // Apply a darker, more "zinc" aesthetic
  content = content.replace(/bg-\[\#141414\]/g, 'bg-zinc-900/80');
  content = content.replace(/border-white\/5/g, 'border-zinc-800');
  content = content.replace(/border-white\/10/g, 'border-zinc-700/80');
  
  fs.writeFileSync(path, content, 'utf8');
}

replaceColors('src/pages/Landing.tsx');
replaceColors('src/pages/Dashboard.tsx');
