import fs from 'fs';

function applyZinc(path) {
  let content = fs.readFileSync(path, 'utf8');
  
  // Specific button replacements first
  content = content.replace(/bg-orange-500 hover:bg-orange-400 text-white/g, 'bg-white hover:bg-zinc-200 text-black');
  content = content.replace(/bg-orange-500\/10/g, 'bg-white/[0.05]');
  content = content.replace(/bg-orange-500\/20/g, 'bg-white/[0.08]');
  content = content.replace(/bg-orange-500\/30/g, 'bg-white/[0.12]');
  content = content.replace(/bg-orange-500\/50/g, 'bg-white/[0.2]');
  content = content.replace(/bg-orange-900\/20/g, 'bg-white/[0.02]');
  content = content.replace(/bg-orange-500/g, 'bg-white');
  
  content = content.replace(/text-orange-400/g, 'text-zinc-300');
  content = content.replace(/text-orange-500/g, 'text-zinc-400');
  content = content.replace(/text-orange-600/g, 'text-zinc-500');
  
  content = content.replace(/border-orange-500\/20/g, 'border-white/[0.08]');
  content = content.replace(/border-orange-500\/30/g, 'border-white/[0.12]');
  content = content.replace(/border-orange-500\/50/g, 'border-white/[0.2]');
  content = content.replace(/border-orange-400/g, 'border-zinc-700');
  content = content.replace(/border-orange-500/g, 'border-white/20');
  
  content = content.replace(/from-orange-400 to-orange-600/g, 'from-white to-zinc-500');
  content = content.replace(/from-orange-600 to-orange-900/g, 'from-zinc-700 to-zinc-900');
  
  content = content.replace(/rgba\(249,115,22/g, 'rgba(255,255,255');
  
  // Also fix "orange" occurrences in plain text matching color names
  content = content.replace(/color === 'orange' \? 'text-zinc-300'/g, "color === 'orange' ? 'text-white'");

  // Fix button text colors on active states to not clash with bg-white text-white
  content = content.replace(/text-black text-sm font-medium rounded-lg transition-colors/g, 'text-black text-sm font-medium rounded-lg transition-colors font-semibold');
  
  fs.writeFileSync(path, content, 'utf8');
}

applyZinc('src/pages/Landing.tsx');
applyZinc('src/pages/Dashboard.tsx');
