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

// Devotee holding a fruit basket, 3/4 profile facing right, cropped at the waist. viewBox 0 0 110 120
module.exports.woman3=(sari='#C8402A',sariD='#8E2214',blouse='#2E1A14',flip=false)=>`<g ${flip?'transform="translate(110 0) scale(-1 1)"':''}>
 <!-- body: saree -->
 <path d="M16 52 Q26 44 44 46 Q58 50 60 64 L64 120 L4 120 Q6 84 16 52Z" fill="${sari}"/>
 <path d="M30 48 Q50 56 58 74 L60 120 L50 120 Q50 84 30 48Z" fill="${sariD}" opacity=".55"/>
 <path d="M4 104 L64 100 L64 108 L4 112Z" fill="#E9B44C"/><path d="M4 112 L64 108 L64 111 L4 115Z" fill="${sariD}"/>
 <!-- blouse sleeve -->
 <path d="M32 50 Q46 47 56 54 L54 70 Q44 68 36 62Z" fill="${blouse}"/>
 <path d="M54 54 L56 54 L54 70 L51 69Z" fill="#E9B44C"/>
 <!-- upper arm & forearm -->
 <path d="M42 66 Q52 70 54 88 L46 90 Q44 76 38 68Z" fill="${SK}"/>
 <path d="M48 84 L76 80 L77 88 L52 95Z" fill="${SK}"/>
 <rect x="60" y="80" width="2.6" height="9" fill="#E9B44C" transform="rotate(-8 61 84)"/><rect x="65" y="79" width="2.6" height="9" fill="#E9B44C" transform="rotate(-8 66 83)"/><rect x="70" y="79" width="2.6" height="8" fill="#C4161C" transform="rotate(-8 71 83)"/>
 <!-- neck & head -->
 <rect x="32" y="36" width="9" height="14" fill="${SK}"/>
 <ellipse cx="38" cy="26" rx="11" ry="13.5" fill="${SK}"/>
 <path d="M48 28 Q53 31 49 33 Q50 36 47 37Z" fill="${SK}"/>
 <path d="M44 33 q3 2 6 0" stroke="#8E2214" stroke-width="1.4" fill="none" stroke-linecap="round"/>
 <path d="M42 22 q3 -2 6 0" stroke="${HAIR}" stroke-width="1.3" fill="none"/><circle cx="45" cy="25" r="1.15" fill="${HAIR}"/>
 <circle cx="36" cy="32" r="1.9" fill="#E9B44C"/><circle cx="51" cy="30.5" r="1" fill="#E9B44C"/>
 <!-- veil -->
 <path d="M50 17 Q47 6 35 7 Q22 9 24 29 Q22 44 15 56 Q28 62 42 52 Q33 44 36 32 Q36 22 50 17Z" fill="${sari}"/>
 <path d="M50 17 Q47 6 35 7 Q27 8 25 17 Q36 9 50 17Z" fill="#E9B44C"/>
 <path d="M15 56 Q28 62 42 52" stroke="#E9B44C" stroke-width="2" fill="none"/>
 <path d="M46 15.5 q-3 -2 -7 -2" stroke="#C4161C" stroke-width="1.5" fill="none" stroke-linecap="round"/>
 <!-- basket -->
 <path d="M60 86 Q80 98 104 86 Q102 100 82 102 Q64 102 60 86Z" fill="#B9803F" stroke="#7A4A1E" stroke-width="1.2"/>
 <path d="M64 92 Q82 100 100 91 M66 97 Q82 103 98 96" stroke="#7A4A1E" stroke-width=".8" fill="none" opacity=".7"/>
 <ellipse cx="82" cy="86" rx="23" ry="5" fill="#C8924B" stroke="#7A4A1E" stroke-width="1"/>
 <circle cx="70" cy="78" r="7" fill="#F08A24"/><circle cx="83" cy="75" r="7.4" fill="#C8302A"/><circle cx="96" cy="79" r="6.4" fill="#6FA35A"/><circle cx="77" cy="68" r="6" fill="#8A5A2E"/><path d="M84 66 q10 -8 20 2 q-8 8 -20 -2Z" fill="#F2C94C"/><path d="M70 71 q-6 -10 2 -14 q4 8 -2 14Z" fill="#4F8A3E"/>
 <ellipse cx="68" cy="75" rx="2" ry="1.2" fill="#fff" opacity=".35"/><ellipse cx="81" cy="72" rx="2" ry="1.2" fill="#fff" opacity=".35"/>
</g>`;
