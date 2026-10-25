/* Run with Playwright in NODE_PATH. ZEVIAN_TEST_URL may point to a local HTTP preview. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const base=process.env.ZEVIAN_TEST_URL||pathToFileURL(path.resolve(__dirname,'../zevian-manager-workflow.html')).href;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.ZEVIAN_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'?design-preview=1&screen=findings');
  assert.equal(await page.locator('.finding-row').count(),3);
  const records=await page.evaluate(()=>state.patterns[0].investigation.records);
  assert.equal(records.filter(r=>r.name.startsWith('Peer')).reduce((sum,r)=>sum+r.current,0)/3,21);
  assert.equal(records.filter(r=>r.name.startsWith('Peer')).reduce((sum,r)=>sum+r.previous,0)/3,22);
  await page.locator('.finding-row').getByRole('button',{name:'Review',exact:true}).nth(0).click();
  assert.equal(await page.locator('.bar-group').count(),3);
  assert((await page.locator('.finding-drawer').boundingBox()).width>=720);
  assert.equal(await page.locator('.observation').count(),3);
  await page.getByRole('button',{name:'Review evidence',exact:true}).click();
  assert.equal(await page.locator('#findingDrawer').count(),1);
  assert(await page.getByRole('heading',{name:'Change timeline',exact:true}).isVisible());
  await page.getByRole('button',{name:'Back to summary',exact:true}).click();
  await page.getByRole('button',{name:'Mark reviewed',exact:true}).click();
  assert.equal(await page.evaluate(()=>selected.investigationDecision.type),'reviewed');
  assert.equal(await page.locator('textarea').count(),1); // Hidden optional action field only.
  await page.getByRole('button',{name:'Close',exact:true}).click();
  assert(await page.locator('.finding-row').getByRole('button',{name:'Review',exact:true}).nth(0).evaluate(e=>e===document.activeElement));
  await page.locator('.finding-row').getByRole('button',{name:'Review',exact:true}).nth(1).click();
  await page.screenshot({path:'outputs/zevian-investigation-summary-qa.png',animations:'disabled'});
  await page.getByRole('button',{name:'Review evidence',exact:true}).click();
  assert(await page.getByRole('heading',{name:'Representative messages',exact:true}).isVisible());
  assert.equal(await page.locator('.message-comparison article').count(),2);
  assert.match(await page.locator('#evidence-limits').innerText(),/Timing does not establish causation/);
  assert.match(await page.locator('#evidence-timeline').innerText(),/12 Sep/);
  assert.equal(await page.locator('.investigation-trend circle').count(),6);
  await page.screenshot({path:'outputs/zevian-investigation-evidence-qa.png',animations:'disabled'});
  await page.getByRole('button',{name:'Back to summary',exact:true}).click();
  await page.getByRole('button',{name:'Take action / Investigate further',exact:true}).click();
  await page.getByRole('textbox',{name:'Intended next step (optional)',exact:true}).fill('Compare Enterprise sequences next week.');
  await page.getByRole('button',{name:'Save action',exact:true}).click();
  assert.equal(await page.evaluate(()=>selected.diagnosis.nextAction.text),'Compare Enterprise sequences next week.');
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.locator('.finding-row').getByRole('button',{name:'Review',exact:true}).nth(2).click();
  assert.match(await page.locator('.investigation-missing').innerText(),/Conversation content unavailable/);
  assert.equal(await page.locator('.observation-kind.possible').count(),0);
  await page.getByRole('button',{name:'Take action / Investigate further',exact:true}).click();
  await page.getByRole('button',{name:'Save action',exact:true}).click();
  assert.equal(await page.evaluate(()=>selected.investigationDecision.text),'');
  await page.getByRole('button',{name:'Dismiss',exact:true}).click();
  assert.equal(await page.locator('#findingDrawer').count(),0);
  assert.equal(await page.evaluate(()=>state.patterns[2].status),'dismissed');
  // Observation links reveal evidence and preserve the summary scroll position.
  await page.locator('.finding-row').getByRole('button',{name:'Review',exact:true}).nth(0).click();
  const summaryScroll=await page.locator('.drawer-body').evaluate(e=>{e.scrollTop=100;return e.scrollTop;});
  await page.locator('.observation').nth(1).click();
  await page.getByRole('button',{name:'Back to summary',exact:true}).click();
  assert(Math.abs(await page.locator('.drawer-body').evaluate(e=>e.scrollTop)-summaryScroll)<2);
  // Existing manager context remains functional and supplies the next step once.
  await page.locator('.investigation-context summary').click();
  await page.getByRole('button',{name:'Add context',exact:true}).click();
  await page.getByRole('textbox',{name:'Manager context',exact:true}).fill('We switched to Enterprise leads two weeks ago.');
  await page.getByRole('button',{name:'Save context',exact:true}).click();
  assert.match(await page.locator('.context-observation').innerText(),/Enterprise leads/);
  assert.match(await page.locator('.investigation-next').innerText(),/Enterprise and non-Enterprise booking rates/);
  assert.equal(await page.locator('.observation').count(),3);
  for(const width of [1920,1024,768,390]){
   await page.setViewportSize({width,height:844});
   assert((await page.locator('.finding-drawer').boundingBox()).width>=width/2);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert(await page.locator('.finding-drawer footer').evaluate(e=>e.scrollWidth<=e.clientWidth));
   await page.getByRole('button',{name:'Review evidence',exact:true}).click();
   assert(await page.locator('.drawer-body').evaluate(e=>e.scrollWidth<=e.clientWidth));
   await page.getByRole('button',{name:'Back to summary',exact:true}).click();
  }
  await page.screenshot({path:'outputs/zevian-investigation-mobile-qa.png',animations:'disabled'});
  await page.keyboard.press('Escape');assert.equal(await page.locator('#findingDrawer').count(),0);
  await page.goto(base);
  await page.getByRole('button',{name:'Uploads',exact:true}).click();
  await page.locator('.help summary').click();
  await page.getByRole('button',{name:'Try investigation examples',exact:true}).click();
  await page.locator('.finding-row').getByRole('button',{name:'Review',exact:true}).nth(0).click();
  await page.getByRole('button',{name:'Mark reviewed',exact:true}).click();
  await page.reload();
  await page.locator('.finding-row').getByRole('button',{name:'Review',exact:true}).nth(0).click();
  assert.equal(await page.evaluate(()=>selected.investigationDecision.type),'reviewed');
  assert.equal(await page.evaluate(()=>state.history.at(-1).investigation.records.length),5);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  // Uploaded KPI records use the same drawer, with no invented process evidence.
  await page.evaluate(()=>{
   state.upload={id:'uploaded-test',file:'performance.csv',period:'2026-10-07',mappingStatus:'confirmed'};
   state.records=['2026-09-23','2026-09-30','2026-10-07'].map((period,i)=>({rep:'Aaron',period,metrics:{calls:100,connect_rate:20,meetings_booked:i===2?5:10}}));
   buildPatterns();patternsScreen();
  });
  await page.locator('.finding-row').getByRole('button',{name:'Review',exact:true}).click();
  assert(await page.locator('.before-after').isVisible());
  assert.match(await page.locator('.investigation-observations').innerText(),/Calls stayed stable/);
  await page.getByRole('button',{name:'Review evidence',exact:true}).click();
  assert.equal(await page.locator('.message-comparison').count(),0);
  assert.match(await page.locator('#evidence-records').innerText(),/performance.csv/);
  assert.equal(await page.locator('.investigation-trend circle').count(),3);
  assert.deepEqual(errors,[]);
  console.log('Passed all three scenarios, evidence navigation, optional decisions, context, focus, and responsive layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
