/* Figma findings, evidence tabs, and drawer geometry. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const base=process.env.ZEVIAN_TEST_URL||pathToFileURL(path.resolve(__dirname,'../zevian-manager-workflow.html')).href;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.ZEVIAN_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1014}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   localStorage.setItem('zevian_diagnosis_v1',JSON.stringify({upload:{investigationExamples:true,mappingStatus:'confirmed'},patterns:[{id:'old-investigation',title:'Old example'}],history:[]}));
  });
  // Check the normal saved sample flow, without design-preview parameters.
  await page.goto(base);
  assert.deepEqual(await page.locator('.finding-label').allTextContents(),['Positive replies, fewer meetings','SDR performance and unequal allocation','More meetings, fewer opportunities']);
  assert.equal(await page.locator('.finding-row[data-read="false"]').count(),2);
  assert.equal(await page.locator('.finding-row[data-read="true"]').count(),1);
  assert.equal(await page.locator('#file, #dropzone, .match-options').count(),0);
  assert(!(await page.locator('#steps').isVisible()));
  assert(!(await page.locator('#uploadNav').isVisible()));
  assert.equal(await page.getByRole('button',{name:'Go back',exact:true}).count(),0);
  await page.getByRole('button',{name:'Review',exact:true}).click();
  assert.equal(await page.locator('.finding-row').count(),3);
  // An earlier saved investigation set in the prototype slot also gets upgraded.
  await page.evaluate(()=>{state={upload:{investigationExamples:true,mappingStatus:'confirmed',period:'2026-10-07'},columns:[],rows:[],mapping:[],records:[],patterns:investigationExamples(),history:[]};persist();});
  await page.reload();
  assert.equal(await page.locator('#finding-design-campaign').count(),1);
  assert.equal(await page.locator('.finding-row').count(),3);
  await page.evaluate(()=>{
   state={upload:{id:'sample-test',sample:true,file:'sample-sdr-performance.csv',period:'2026-09-15',mappingStatus:'confirmed'},columns:[],rows:[],mapping:[],records:[],history:[],patterns:investigationExamples()};
   persist();actions.patterns();
  });
  await page.reload();
  assert.equal(await page.locator('.finding-row').count(),3);
  assert.equal(await page.locator('.finding-row[data-read="false"]').count(),2);
  assert.equal(await page.locator('.finding-row[data-read="true"]').count(),1);
  for(const [index,names] of [[0,['Funnel Stage','Audience','Responses']],[1,['Work allocation','Conversion by account']],[2,['Funnel stage','Campaign']]]){
   await page.locator('.finding-row').nth(index).getByRole('button').click();
   assert.deepEqual(await page.getByRole('tab').allTextContents(),names);
   for(let i=0;i<names.length;i++){
    await page.getByRole('tab').nth(i).click();
    assert((await page.getByRole('tabpanel').innerText()).trim().length>0);
   }
   await page.getByRole('button',{name:'Close finding details',exact:true}).click();
  }
  await page.reload();
  assert.equal(await page.locator('.finding-row[data-read="true"]').count(),3);
  assert.equal(await page.evaluate(()=>state.patterns.filter(p=>p.investigationDecision).length),0);
  await page.goto(base+'?design-preview=1&screen=findings');
  assert.equal(await page.locator('.finding-row').count(),3);
  assert.equal(await page.locator('.design-findings-table th').allTextContents().then(a=>a.join(',')),'Finding,Next step,Updated');
  await page.screenshot({path:'outputs/zevian-findings-design-qa.png'});
  for(const finding of ['campaign','individual','pipeline']){
   await page.goto(base+'?design-preview=1&screen=drawer&finding='+finding);
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(Math.round((await page.locator('.review-drawer').boundingBox()).width),675);
   const styles=await page.locator('.finding-badge').last().evaluate(e=>{const s=getComputedStyle(e);return {font:s.fontFamily,weight:s.fontWeight,height:s.height};});
   assert(styles.font.includes('Plus Jakarta Sans'));assert.equal(styles.weight,'400');assert.equal(styles.height,'24px');
   const tabs=page.getByRole('tab');
   for(let i=0;i<await tabs.count();i++){
    await tabs.nth(i).click();assert.equal(await tabs.nth(i).getAttribute('aria-selected'),'true');
    await page.screenshot({path:'outputs/zevian-'+finding+'-tab-'+i+'-qa.png',animations:'disabled'});
   }
   await tabs.first().focus();await page.keyboard.press('ArrowRight');assert.equal(await tabs.nth(1).getAttribute('aria-selected'),'true');
   const assets=await page.locator('.finding-design-drawer img').evaluateAll(items=>items.map(e=>({loaded:e.complete&&e.naturalWidth>0,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
   assert(assets.every(a=>a.loaded));assert(assets.slice(0,2).every(a=>a.w===16&&a.h===16));
   await page.getByRole('button',{name:'Investigate',exact:true}).click();assert(await page.getByText('Anything changed outside the data?',{exact:true}).isVisible());
   await page.getByRole('button',{name:'Record decision',exact:true}).click();await page.getByRole('button',{name:'Mark reviewed',exact:true}).click();
   assert.equal(await page.evaluate(()=>selected.investigationDecision.type),'reviewed');
   await page.getByRole('button',{name:'Close finding details',exact:true}).click();
   assert.equal(await page.locator('#findingDrawer').count(),0);
  }
  // Existing record models use the same visual shell without sample messages.
  await page.evaluate(()=>{loadInvestigationExamples();openFindingDrawer(state.patterns[0].id);});
  assert.equal(await page.getByRole('tab',{name:'Source records',exact:true}).count(),1);
  assert.equal(await page.locator('.message-card').count(),0);
  await page.getByRole('button',{name:'Investigate',exact:true}).click();
  await page.getByText('Anything changed outside the data?',{exact:true}).click();
  await page.getByRole('button',{name:'Add context',exact:true}).click();
  await page.locator('#drawerNote').fill('Compare cold accounts next week.');
  await page.locator('#drawerContextForm').evaluate(form=>form.requestSubmit());
  assert(await page.getByRole('button',{name:'Edit context',exact:true}).isVisible());
  assert.match(await page.evaluate(()=>selected.contexts.map(c=>c.content).join(' ')),/Compare cold accounts/);
  await page.setViewportSize({width:390,height:844});await page.goto(base+'?design-preview=1&screen=drawer&finding=campaign&tab=2');
  assert.equal(Math.round((await page.locator('.review-drawer').boundingBox()).width),390);
  assert(await page.locator('.drawer-body').evaluate(e=>e.scrollWidth<=e.clientWidth));
  await page.screenshot({path:'outputs/zevian-findings-mobile-qa.png',animations:'disabled'});
  for(const finding of ['individual','pipeline']){
   await page.goto(base+'?design-preview=1&screen=drawer&finding='+finding);
   assert(await page.locator('.drawer-body').evaluate(e=>e.scrollWidth<=e.clientWidth));
  }
  assert.deepEqual(errors,[]);console.log('Findings design checks passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
