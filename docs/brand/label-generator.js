const A=require('./art.js');
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const fs=require('fs'),path=require('path');
const FR=n=>`file://${__dirname}/node_modules/@fontsource/fraunces/files/${n}`;
const V={
 premium:{sky:['#FBF0DC','#F9DDB3','#F3B97A','#EBA25A'],name:'Premium',mrp:399,c1:'#6E1822',c2:'#9A2430',acc:'#E9C87A',badge:['100%','Shudh Desi','Ghee'],
  ing:['Maida','Wheat Flour','100% Shudh Desi Ghee','Jaggery','Cardamom'],
  nut:[['Energy','530 kcal'],['Protein','5 g'],['Added Sugar','63 g'],['Fat','25 g'],['Saturated Fat','14 g'],['Trans Fat','0 g'],['Sodium','230 mg']]},
 jaggery:{sky:['#FBF0DC','#F9DDB3','#F3B97A','#EBA25A'],name:'Jaggery',mrp:349,c1:'#8A4310',c2:'#C0701F',acc:'#F0CF86',badge:['Made with','Jaggery','No Refined Sugar'],
  ing:['Maida','Wheat Flour','Ghee','Sunflower Oil','Jaggery'],
  nut:[['Energy','480 kcal'],['Protein','5 g'],['Added Sugar','63 g'],['Fat','23 g'],['Saturated Fat','11 g'],['Trans Fat','0 g'],['Sodium','225 mg']]},
 classic:{sky:['#FBF0DC','#F9DDB3','#F3B97A','#EBA25A'],name:'Classic',mrp:349,c1:'#2C5A36',c2:'#4A7F55',acc:'#E6CB84',badge:['Traditional','Bihari','Recipe'],
  ing:['Maida','Wheat','Ghee','Sunflower Oil','Cardamom','Sugar'],
  nut:[['Energy','506 kcal'],['Protein','5 g'],['Carbohydrate','58 g'],['Added Sugar','25 g'],['Fat','29 g'],['Saturated Fat','12 g'],['Trans Fat','0 g'],['Sodium','290 mg']]},
};
const veg=`<svg viewBox="0 0 20 20" width="100%" height="100%"><rect x="1" y="1" width="18" height="18" fill="#fff" stroke="#0a7a2f" stroke-width="1.6"/><circle cx="10" cy="10" r="5.2" fill="#0a7a2f"/></svg>`;
const folk=(c)=>`<svg width="100%" height="100%" preserveAspectRatio="none"><defs><pattern id="f" width="9" height="6" patternUnits="userSpaceOnUse"><path d="M0 3 L2.2 .8 L4.4 3 L2.2 5.2Z" fill="${c}"/><circle cx="6.8" cy="3" r=".9" fill="${c}"/></pattern></defs><rect width="100%" height="100%" fill="url(#f)"/></svg>`;
const css=(v)=>`
@font-face{font-family:Dv;font-weight:600;src:url(file://${__dirname}/node_modules/@fontsource/noto-serif-devanagari/files/noto-serif-devanagari-devanagari-600-normal.woff2)}
@font-face{font-family:Dv;font-weight:700;src:url(file://${__dirname}/node_modules/@fontsource/noto-serif-devanagari/files/noto-serif-devanagari-devanagari-700-normal.woff2)}
@font-face{font-family:Fr;font-weight:400;src:url(${FR('fraunces-latin-400-normal.woff2')})}
@font-face{font-family:Fr;font-weight:600;src:url(${FR('fraunces-latin-600-normal.woff2')})}
@font-face{font-family:Fr;font-weight:700;src:url(${FR('fraunces-latin-700-normal.woff2')})}
@font-face{font-family:Fr;font-weight:400;font-style:italic;src:url(${FR('fraunces-latin-400-italic.woff2')})}
@font-face{font-family:Fr;font-weight:600;font-style:italic;src:url(${FR('fraunces-latin-600-italic.woff2')})}
@page{size:136mm 191mm;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:136mm;height:191mm}
body{position:relative;overflow:hidden;font-family:'Inter',system-ui,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.gold{background:linear-gradient(100deg,#B8893C 0%,#F5E3A8 28%,#D4A94F 52%,#F7E7B2 74%,#B8893C 100%);}
.abs{position:absolute}
.foil{background:linear-gradient(100deg,#B8893C 0%,#F5E3A8 28%,#D4A94F 52%,#F7E7B2 74%,#B8893C 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
`;


const GOLD='<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A97A2E"/><stop offset=".3" stop-color="#E8CB84"/><stop offset=".55" stop-color="#C79A42"/><stop offset=".8" stop-color="#E8CB84"/><stop offset="1" stop-color="#A97A2E"/></linearGradient>';
const cane=(x,y0,y1,t=0)=>{let n='';for(let y=y0+14;y<y1;y+=17)n+=`<line x1="${x-1.5}" y1="${y}" x2="${x+1.5}" y2="${y}" stroke="#F3DDA8" stroke-width=".45" opacity=".9"/>`;
 return `<g stroke-linecap="round"><line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="#8A5A32" stroke-width="2.6"/><line x1="${x-.5}" y1="${y0}" x2="${x-.5}" y2="${y1}" stroke="#C99A62" stroke-width=".7"/>${n}
 <path d="M${x},${y0+2} q-9,-6 -13,-1 M${x},${y0+2} q8,-8 12,-3 M${x},${y0+4} q-3,-9 -8,-10" fill="none" stroke="#7FA85A" stroke-width="1.1"/></g>`};
const diya=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M-3.4,0 h6.8 q-.6,3.4 -3.4,3.4 t-3.4,-3.4z" fill="#D0642A" stroke="#7A2A14" stroke-width=".25"/><path d="M0,-.8 q-2.2,-2.8 0,-6.2 q2.2,3.4 0,6.2z" fill="#FFE27A"/><path d="M0,-1.6 q-1,-1.8 0,-3.6 q1,1.8 0,3.6z" fill="#F97316"/></g>`;
const waves=(x0,x1,y,n=3)=>Array.from({length:n},(_,i)=>{let d=`M${x0+i*3} ${y+i*3.2}`;for(let x=x0+i*3;x<x1-6;x+=6)d+=` q1.5,-1.4 3,0 t3,0`;return `<path d="${d}" fill="none" stroke="#FFF6DC" stroke-width=".4" opacity="${.9-i*.18}" stroke-linecap="round"/>`}).join('');
const rays=(cx,cy,r1,r2,n)=>Array.from({length:n},(_,i)=>{const a=i*360/n;if(a>112&&a<248)return '';return `<line transform="rotate(${a} ${cx} ${cy})" x1="${cx}" y1="${cy-r1}" x2="${cx}" y2="${cy-(i%2?r2-3:r2)}" stroke="#D9A441" stroke-width="${i%2?.55:1}" stroke-linecap="round"/>`}).join('');
const sky=(v,id)=>`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${v.sky[0]}"/><stop offset=".42" stop-color="${v.sky[1]}"/><stop offset=".72" stop-color="${v.sky[2]}"/><stop offset="1" stop-color="${v.sky[3]}"/></linearGradient>`;
const CL=require('../logo/clip.js');
const G_='#D9A441',M_='#6E1822',A_='#B8651B';
const rayC=(cx,cy,r,n,l1,l2,w)=>Array.from({length:n},(_,i)=>{const t=Math.PI*(1+(i+.5)/n);return `<line x1="${cx+(r+l1)*Math.cos(t)}" y1="${cy+(r+l1)*Math.sin(t)}" x2="${cx+(r+l2)*Math.cos(t)}" y2="${cy+(r+l2)*Math.sin(t)}" stroke="${G_}" stroke-width="${w}" stroke-linecap="round"/>`}).join('');
const stamp=(id,c1=M_)=>`<circle cx="100" cy="100" r="96" fill="none" stroke="${c1}" stroke-width="5"/><circle cx="100" cy="100" r="86" fill="none" stroke="${G_}" stroke-width="1.6"/><clipPath id="${id}"><circle cx="100" cy="100" r="84"/></clipPath><g clip-path="url(#${id})"><circle cx="100" cy="112" r="38" fill="${G_}"/>${rayC(100,112,38,15,8,20,3.2)}<path d="M0 138 L60 138 L60 128 L78 110 L96 128 L96 138 L104 138 L104 124 L124 104 L144 124 L144 138 L200 138 V200 H0Z" fill="${c1}"/><path d="M150 138 V112 M150 112 q-16 -4 -20 -22 q12 -6 20 4 q8 -10 20 -4 q-4 18 -20 22" fill="${c1}" stroke="${c1}" stroke-width="4"/><path d="M0 156 q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" fill="none" stroke="${G_}" stroke-width="2.4"/></g>`;
const lockup=(v,mm,top)=>`<div class="abs lk" style="left:0;right:0;top:${top}mm;display:flex;justify-content:center"><svg viewBox="0 0 560 200" style="height:${mm}mm;width:${mm*2.8}mm" xmlns="http://www.w3.org/2000/svg">${stamp('k'+top)}<text x="222" y="94" font-family="Fr" font-weight="700" font-size="58" letter-spacing="7" fill="${M_}">VILLAGE</text><text x="222" y="152" font-family="Fr" font-weight="700" font-size="58" letter-spacing="7" fill="${A_}">CRUNCH</text></svg></div>`;
const women=()=>{const s=.58,ty=148-112*s;return `<g transform="translate(-6 ${ty}) scale(${s})">${CL.woman('#D63A22','#A82614')}</g><g transform="translate(84 ${ty}) scale(${s})">${CL.woman('#E8932A','#B8651B',true)}</g>`};
const front=(k)=>{const v=V[k];
 return `<!doctype html><meta charset=utf-8><style>${css(v)}
body{background:${v.sky[0]}}
svg.art{position:absolute;left:0;top:0;width:136mm;height:191mm}
.ribbon{left:50%;transform:translateX(-50%);top:15.5mm;width:62mm;height:10.5mm;background:linear-gradient(180deg,#B9302A,#98211C);clip-path:polygon(0 0,100% 0,96% 50%,100% 100%,0 100%,4% 50%);display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 .5mm .6mm #5E140955)}
.ribbon span{font:700 14.5pt Fr;color:#FFF3DC}
.title{left:0;right:0;top:27mm;text-align:center;font:700 62pt/1 Fr;letter-spacing:-.01em;color:#5A1A0C;text-shadow:0 .5mm 0 #FFF3D8}
.sub{left:17mm;right:17mm;top:51.5mm;display:flex;align-items:center;justify-content:center;gap:2.4mm;font:600 6.6pt Inter;letter-spacing:.26em;color:#6E2A12}
.sub b{display:block;flex:1;height:.25mm;background:#B8893Caa}
.sub em{font:700 10pt Dv;letter-spacing:0;color:#8A2A14}
.tag{left:0;right:0;top:58mm;text-align:center;font:italic 400 11pt Fr;color:#5A2A14}
.tagh{left:0;right:0;top:63.8mm;text-align:center;font:600 8pt Dv;color:#7A4A2A}
.badge{left:94mm;top:124mm;width:25mm;height:25mm;border-radius:50%;padding:.7mm;box-shadow:0 .8mm 2mm #0007;background:linear-gradient(135deg,#B8893C,#F7E7B2,#B8893C)}
.badge>div{width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 35% 30%,${v.c2},${v.c1});display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2mm;gap:.4mm}
.badge small{font:600 4.9pt Inter;letter-spacing:.12em;text-transform:uppercase;color:#F7DF9C}
.badge strong{font:700 10.5pt/1.02 Fr;color:#FFF3DC}
.plaque{left:50%;transform:translateX(-50%);top:156mm;width:78mm;height:12mm;padding:.45mm;border-radius:1.4mm;background:linear-gradient(135deg,#B8893C,#F7E7B2,#B8893C);box-shadow:0 .7mm 1.6mm #0007}
.plaque>div{height:100%;border-radius:1mm;background:linear-gradient(180deg,#FFF9E8,#F5E6C2);display:flex;align-items:center;justify-content:center;font:700 14pt Fr;color:${v.c1};letter-spacing:.08em;text-transform:uppercase}
.foot{left:27mm;right:27mm;top:171.5mm;display:flex;align-items:center;justify-content:space-between;font:600 6.6pt Inter;letter-spacing:.2em;color:#FFF3DC}
.veg{width:5mm;height:5mm}
</style>
<svg class="art" viewBox="0 0 136 191" xmlns="http://www.w3.org/2000/svg"><defs>${GOLD}${sky(v,'sky')}<radialGradient id="glow"><stop offset="0" stop-color="#FFF6D0" stop-opacity=".95"/><stop offset=".55" stop-color="#FFD25E" stop-opacity=".45"/><stop offset="1" stop-color="#FFD25E" stop-opacity="0"/></radialGradient><clipPath id="pc"><circle cx="68" cy="110" r="29.5"/></clipPath><linearGradient id="river" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${v.c1}" stop-opacity="0"/><stop offset=".45" stop-color="${v.c1}" stop-opacity=".78"/><stop offset="1" stop-color="${v.c1}" stop-opacity=".96"/></linearGradient></defs>
 <rect width="136" height="191" fill="url(#sky)"/><rect y="146" width="136" height="45" fill="url(#river)"/>
 <circle cx="68" cy="110" r="50" fill="url(#glow)"/>${rays(68,110,34,41,32)}

 <circle cx="68" cy="110" r="32.8" fill="url(#gold)"/><circle cx="68" cy="110" r="31" fill="#7A4A22"/>
 <image href="file://${__dirname}/photo-${k}.jpg" x="36" y="78" width="64" height="64" preserveAspectRatio="xMidYMid slice" clip-path="url(#pc)"/>
 <circle cx="68" cy="110" r="29.5" fill="none" stroke="#0004" stroke-width=".6"/>${women()}<rect y="146" width="136" height="45" fill="url(#river)"/>
 ${waves(30,106,145.2,3)}${[34,45,56,80,91,102].map((x,i)=>diya(x,150+(i%2?.6:0),.95)).join('')}
 <rect x="7" y="7" width="122" height="177" rx="3.4" fill="none" stroke="url(#gold)" stroke-width=".75"/><rect x="9.3" y="9.3" width="117.4" height="172.4" rx="2.4" fill="none" stroke="url(#gold)" stroke-width=".3" opacity=".8"/>
 ${[[7,7],[129,7],[7,184],[129,184]].map(([x,y])=>`<path transform="translate(${x} ${y})" d="M0,-2.4 L2.4,0 L0,2.4 L-2.4,0Z" fill="url(#gold)"/>`).join('')}
</svg>
${lockup(v,17,12.5)}
<div class="abs title">Thekua</div>
<div class="abs sub"><b></b><em>ठेकुआ</em>· A BIHARI CUISINE<b></b></div>
<div class="abs tag">Gaon ka swad, shehar ke liye</div>
<div class="abs tagh">गाँव का स्वाद, शहर के लिए</div>
<div class="abs badge"><div>${k!=='jaggery'?`<strong style="font-size:${k==='premium'?'10.5pt':'9pt'}">${v.badge[0]}</strong><strong style="font-size:8pt">${v.badge[1]}</strong><strong style="font-size:8pt">${v.badge[2]}</strong>`:`<small>${v.badge[0]}</small><strong>${v.badge[1]}</strong><small>${v.badge[2]}</small>`}</div></div>
<div class="abs plaque"><div>${v.name} Thekua</div></div>
<div class="abs foot"><span>NET WT. 400 g</span><span class="veg">${veg}</span><span>KHAGARIA · BIHAR</span></div>`};
const back=(k)=>{const v=V[k];return `<!doctype html><meta charset=utf-8><style>${css(v)}
body{background:#F7EEDC}
.tex{inset:0;opacity:.35;background-image:url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' seed='4'/><feColorMatrix values='0 0 0 0 .55  0 0 0 0 .38  0 0 0 0 .2  0 0 0 .22 0'/></filter><rect width='200' height='200' filter='url(#n)'/></svg>`)}")}

svg.art{left:0;top:0;width:136mm;height:191mm}
.ribbon{left:50%;transform:translateX(-50%);top:13mm;width:54mm;height:9.5mm;background:linear-gradient(180deg,#B9302A,#98211C);clip-path:polygon(0 0,100% 0,96% 50%,100% 100%,0 100%,4% 50%);display:flex;align-items:center;justify-content:center}
.ribbon span{font:700 12.5pt Fr;color:#FFF3DC}
.h1{left:0;right:0;top:25mm;text-align:center;font:700 20pt/1 Fr;color:#5A1A0C}
.tg{left:0;right:0;top:34.5mm;text-align:center;font:italic 400 8.6pt Fr;color:#6E2A12}
.col{top:60mm}
.l{left:19mm;width:40mm}
.r{left:63mm;width:54mm}
h3{font:700 7pt Inter;letter-spacing:.24em;text-transform:uppercase;color:${v.c2};padding-bottom:1.4mm;border-bottom:.3mm solid ${v.c2};margin-bottom:2.2mm}
ul{list-style:none}
li{font:600 9.5pt/1 Fr;color:#2E1608;padding:1.55mm 0 1.55mm 4mm;position:relative}
li:before{content:'';position:absolute;left:0;top:50%;width:1.6mm;height:1.6mm;margin-top:-.8mm;transform:rotate(45deg);background:${v.c2}}
table{width:100%;border-collapse:collapse;border:.35mm solid ${v.c1}}
caption{background:${v.c1};color:#FFF3DC;font:700 6.6pt Inter;letter-spacing:.18em;text-transform:uppercase;padding:1.5mm 2mm;text-align:left}
th{font:600 6pt Inter;text-align:left;padding:1.2mm 2mm;color:#6A4A2A;border-bottom:.3mm solid ${v.c1}}
th+th,td+td{text-align:right}
td{font:500 7.4pt Inter;padding:.95mm 2mm;border-bottom:.2mm solid ${v.c1}55;color:#2E1608}
td+td{font-weight:700}
.info{left:19mm;right:19mm;top:116mm;font:400 7.6pt/1.3 Inter;color:#3A2410}
.info p{margin-bottom:2.4mm} .info b{font-weight:700;color:${v.c1}}
.info small{display:block;font-size:7pt;color:#6A4A2A}
.rule{left:19mm;right:19mm;top:142mm;height:.3mm;background:${v.c2}}
.mk{left:19mm;top:145.5mm;width:60mm;font:400 7.4pt/1.4 Inter;color:#3A2410}
.mk b{display:block;font:700 6.2pt Inter;letter-spacing:.2em;text-transform:uppercase;color:${v.c2};margin-bottom:.8mm}
.mk strong{font:700 11pt Fr;color:#2E1608;display:block;margin-bottom:.4mm}
.fssai{display:inline-block;margin-top:2mm;padding:1.1mm 2mm;background:#0F4D2A;color:#fff;font:700 6.6pt Inter;letter-spacing:.06em;border-radius:.6mm}
.mfd{left:80mm;right:19mm;top:145.5mm}
.mfd .row{display:flex;align-items:center;gap:2mm}
.mfd span{font:700 8pt Fr;color:#2E1608}
.mfd i{flex:1;height:7mm;border:.3mm solid ${v.c1};background:#fffaf0aa;border-radius:.8mm}
.mrp{left:80mm;right:19mm;top:156mm}
.mrp div{white-space:nowrap;font:700 22pt/1 Fr;color:${v.c1}}
.mrp small{font:400 5.6pt Inter;color:#6A4A2A}
.vegb{left:19mm;top:171mm;display:flex;align-items:center;gap:2mm;font:600 6.6pt Inter;letter-spacing:.14em;color:#2E1608}
.vegb i{width:5mm;height:5mm;display:block}
.folk{left:19mm;right:19mm;top:173.2mm;height:3mm;opacity:.55}
</style>
<div class="abs tex"></div><svg class="abs art" viewBox="0 0 136 191" xmlns="http://www.w3.org/2000/svg"><defs>${GOLD}${sky(v,'sky')}<clipPath id="hd"><path d="M7,52 L7,10.4 Q7,7 10.4,7 L125.6,7 Q129,7 129,10.4 L129,52Z"/></clipPath></defs><g clip-path="url(#hd)"><rect x="7" y="7" width="122" height="46" fill="url(#sky)"/><circle cx="68" cy="53" r="30" fill="#FFE27A" opacity=".16"/>${rays(68,53,10.5,15.5,24)}<circle cx="68" cy="53" r="9" fill="url(#gold)"/>${cane(14,12,52)}${cane(121,12,52)}</g><rect x="7" y="7" width="122" height="177" rx="3.4" fill="none" stroke="url(#gold)" stroke-width=".75"/><rect x="9.3" y="9.3" width="117.4" height="172.4" rx="2.4" fill="none" stroke="url(#gold)" stroke-width=".3"/><rect x="7" y="177.4" width="122" height="6.6" fill="url(#sky)" opacity=".0"/></svg>
${lockup(v,10,13)}
<div class="abs h1">${v.name} Thekua</div>
<div class="abs tg">A Bihari Cuisine · Gaon ka swad, shehar ke liye</div>
<div class="abs col l"><h3>Ingredients</h3><ul>${v.ing.map(i=>`<li>${i}</li>`).join('')}</ul></div>
<div class="abs col r"><table><caption>Nutrition information</caption><tr><th>Average values</th><th>Per 100 g</th></tr>${v.nut.map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table></div>
<div class="abs info"><p><b>Best before:</b> 45 days from manufacturing.</p><p><b>Storage:</b> Keep in a cool, dry place. Store in an airtight container once opened.</p><p><b>Allergen advice:</b> Contains wheat.<small>Processed in a facility that handles cereals.</small></p></div>
<div class="abs rule"></div>
<div class="abs mk"><b>Manufactured &amp; marketed by</b><strong>VillageCrunch</strong>Tetarabad, Chandpura, Sadar,<br>Khagaria, Bihar – 851204, India<br><span class="fssai">FSSAI Lic. No. 21225010005205</span></div>
<div class="abs mfd"><div class="row"><span>MFD:</span><i></i></div></div>
<div class="abs mrp"><div>MRP ₹${v.mrp}</div><small>Inclusive of all taxes</small></div>
<div class="abs vegb"><i>${veg}</i>VEGETARIAN</div>
`};
(async()=>{
 const out=process.argv[2];fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--allow-file-access-from-files']});
 const pdfs=[];
 for(const k of Object.keys(V)) for(const [side,fn] of [['front',front],['back',back]]){
  const f=path.join(__dirname,`${k}-${side}.html`);fs.writeFileSync(f,fn(k));
  const p=await b.newPage({viewport:{width:514,height:722},deviceScaleFactor:3.125});
  await p.goto('file://'+f);await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(400);
  await p.screenshot({path:`${out}/${k}-${side}.png`});
  await p.pdf({path:`${out}/${k}-${side}.pdf`,width:'136mm',height:'191mm',printBackground:true});
  await p.close();}
 await b.close();})();
