// Flat clipart set (VillageCrunch / Chhath). All pieces are plain SVG fragments.
const SK='#C98A5E',SKD='#A96E45',SR='#D63A22',SRD='#A82614',GD='#E9B44C',SOOP='#C99A5B',SOOPD='#8E6430',HAIR='#2A1410';
// Devotee, profile facing right, waist-deep. viewBox 0 0 100 130, waterline y=112
const woman=(sari=SR,sariD=SRD,flip=false)=>`<g ${flip?'transform="translate(100 0) scale(-1 1)"':''}>
 <!-- pallu & body -->
 <path d="M30 40 Q50 36 54 50 Q57 66 53 82 Q51 98 55 114 L20 114 Q27 96 30 80 Q29 60 30 40Z" fill="${sari}"/>
 <path d="M22 100 Q36 96 52 100 L54 114 L20 114Z" fill="${sariD}" opacity=".55"/>
 <path d="M30 40 Q28 62 25 80 Q22 98 23 114 L30 114 Q29 90 33 72 Q36 56 38 42Z" fill="${sariD}" opacity=".6"/>
 <!-- head -->
 <ellipse cx="46" cy="27" rx="9.5" ry="11.5" fill="${SK}"/><path d="M54 25 Q60 28 56 31 Q57 34 54 35Z" fill="${SK}"/>
 <rect x="43" y="36" width="7" height="8" fill="${SK}"/>
 <!-- veil over head -->
 <path d="M54 19 Q50 12 42 13 Q37 16 36 26 Q34 38 28 46 Q26 52 34 52 Q44 50 46 40 Q40 34 42 24 Q46 20 54 19Z" fill="${sari}"/>
 <path d="M54 19 Q50 12 42 13 Q38 15 37 22 Q44 16 54 19Z" fill="${GD}" opacity=".9"/>
 <!-- sindoor, nose ring -->
 <path d="M52 19 q-3 -2 -6 0" stroke="#C4161C" stroke-width="1.6" fill="none"/><circle cx="57.4" cy="29" r="1" fill="${GD}"/>
 <!-- arms forward holding soop -->
 <path d="M46 52 Q58 57 70 52 L72 57 Q58 66 45 60Z" fill="${SK}"/><path d="M62 53 l1.4 -.2 l1.2 5 l-1.4 .2Z M66 52 l1.4 -.2 l1 5 l-1.4 .2Z" fill="${GD}"/>
 <!-- soop -->
 <path d="M69 63 Q64 40 80 27 Q92 41 85 63 Q77 69 69 63Z" fill="${SOOP}" stroke="${SOOPD}" stroke-width="1.4"/>
 <path d="M72 59 Q70 42 80 32 M78 62 Q78 44 82 33" stroke="${SOOPD}" stroke-width=".8" fill="none" opacity=".6"/>
 <circle cx="76" cy="42" r="3.4" fill="#E08A2C"/><circle cx="80.5" cy="49" r="3.6" fill="#D27A20"/><circle cx="77" cy="56" r="3.2" fill="#E08A2C"/><circle cx="83" cy="40" r="2.6" fill="#C94B3C"/>
</g>`;
const soop=()=>`<g><ellipse cx="60" cy="60" rx="50" ry="44" fill="${SOOP}" stroke="${SOOPD}" stroke-width="3"/><ellipse cx="60" cy="60" rx="40" ry="35" fill="none" stroke="${SOOPD}" stroke-width="1.2" opacity=".6"/>
 ${[[44,52],[60,46],[76,54],[52,66],[68,68],[60,58]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="9" ry="7.5" fill="#D9822B" stroke="#8E4A12" stroke-width="1.2"/><path d="M${x-5} ${y} q3 -3 6 0 M${x-1} ${y+3} q3 -3 6 0" stroke="#6B3410" stroke-width="1" fill="none"/>`).join('')}
 <circle cx="86" cy="40" r="6" fill="#C94B3C"/><path d="M30 38 q4 -8 12 -6 q-2 8 -12 6Z" fill="#6FA35A"/></g>`;
const diyaC=()=>`<g><path d="M14 38 h52 q-2 22 -26 22 t-26 -22z" fill="#D0642A" stroke="#7A2A14" stroke-width="2"/><path d="M40 34 q-14 -18 0 -36 q14 18 0 36z" fill="#FFB83B"/><path d="M40 30 q-6 -10 0 -20 q6 10 0 20z" fill="#FFF0A0"/></g>`;
const cane=()=>`<g><rect x="30" y="0" width="8" height="150" rx="3" fill="#8A5A32"/><rect x="30" y="0" width="3" height="150" fill="#C99A62"/>${[30,58,86,114].map(y=>`<rect x="29" y="${y}" width="10" height="3" fill="#F3DDA8"/>`).join('')}<path d="M34 6 q-26 -6 -32 6 M34 6 q20 -14 36 -6 M34 10 q-8 -22 -20 -24" stroke="#5E9A45" stroke-width="3.6" fill="none" stroke-linecap="round"/></g>`;
const sunC=()=>`<g><circle cx="60" cy="60" r="28" fill="#FFB83B"/><circle cx="60" cy="60" r="22" fill="#FFD36E"/>${Array.from({length:16},(_,i)=>{const t=i*Math.PI/8;return `<line x1="${60+34*Math.cos(t)}" y1="${60+34*Math.sin(t)}" x2="${60+(i%2?44:54)*Math.cos(t)}" y2="${60+(i%2?44:54)*Math.sin(t)}" stroke="#E9B44C" stroke-width="4" stroke-linecap="round"/>`}).join('')}</g>`;
module.exports={woman,soop,diyaC,cane,sunC};
if(require.main===module){
 const html=`<body style="margin:0;background:#FBEBD0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 420" width="1500" height="630">
 <g transform="translate(20 20) scale(2.6)">${woman()}</g><g transform="translate(300 60) scale(2)">${woman('#E8932A','#B8651B')}</g><g transform="translate(520 100) scale(1.5)">${woman('#C0344A','#8A1F33',true)}</g>
 <g transform="translate(680 20) scale(1.4)">${soop()}</g><g transform="translate(820 20) scale(1.5)">${diyaC()}</g><g transform="translate(900 200) scale(1.4)">${cane()}</g><g transform="translate(700 220) scale(1.4)">${sunC()}</g></svg>`;
 require('fs').writeFileSync('clip.html',html);
 const {chromium}=require('/opt/npm-tools/node_modules/playwright');
 (async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});const p=await b.newPage({viewport:{width:1500,height:630}});await p.goto('file://'+process.cwd()+'/clip.html');await p.screenshot({path:'clip.png'});await b.close()})()}
