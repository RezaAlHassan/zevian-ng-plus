/* Run with Playwright available in NODE_PATH. Starts against the local preview server. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const base=process.env.ZEVIAN_TEST_URL||'http://127.0.0.1:8765/outputs/zevian-manager-workflow.html';
async function confirmColumns(page){await page.locator('#importField').waitFor();while(await page.locator('[data-action="importConfirmColumn"]').count())await page.locator('[data-action="importConfirmColumn"]').click()}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.ZEVIAN_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1017}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(()=>localStorage.setItem('zevian_diagnosis_v1',JSON.stringify({upload:null,columns:[],rows:[],mapping:[],records:[],patterns:[],history:[{id:'keep-me'}]})));
  await page.goto(base+'?design-preview=1&screen=drawer');await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.finding-row').count(),3);
  await page.locator('.finding-drawer').evaluate(async e=>Promise.all(e.getAnimations().map(a=>a.finished)));
  const geometry=await page.locator('.finding-drawer').boundingBox();assert.equal(geometry.width,675);assert.equal(geometry.x,765);
  const assets=await page.locator('img').evaluateAll(elements=>elements.map(e=>({src:e.getAttribute('src'),complete:e.complete,width:e.naturalWidth,rect:e.getBoundingClientRect().toJSON()})));
  assert(assets.every(a=>a.complete&&a.width>0),'All static assets load');
  await page.getByRole('button',{name:'Add Manager Context',exact:true}).click();
  await page.getByRole('textbox',{name:'Manager context'}).fill('The rep moved to a new segment and spent time on coaching.');
  await page.getByRole('button',{name:'Save context',exact:true}).click();
  assert.match(await page.locator('.context-note').textContent(),/new segment/);
  await page.getByRole('button',{name:'Request Employee Context',exact:true}).click();
  const requestDialog=page.getByRole('dialog',{name:'Request employee context?',exact:true});
  assert(await requestDialog.isVisible());assert.match(await requestDialog.textContent(),/Emily Johnson will receive a request in their employee portal/);
  assert.equal(await page.evaluate(()=>state.patterns[0].contextRequest),undefined);
  await requestDialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.locator('#employeeRequestDialog').waitFor({state:'detached'});assert.equal(await page.locator('#employeeRequestDialog').count(),0);assert.equal(await page.evaluate(()=>state.patterns[0].contextRequest),undefined);
  await page.getByRole('button',{name:'Request Employee Context',exact:true}).click();await page.keyboard.press('Escape');
  await page.locator('#employeeRequestDialog').waitFor({state:'detached'});assert.equal(await page.locator('#employeeRequestDialog').count(),0);assert(await page.locator('#findingDrawer').isVisible());
  await page.getByRole('button',{name:'Request Employee Context',exact:true}).click();
  const portalLink=await page.getByLabel('Employee portal link',{exact:true}).inputValue();assert.equal(new URL(portalLink).hostname,'employee.zevian.example');assert.equal(new URL(portalLink).searchParams.get('finding'),'figma-emily');
  await page.evaluate(()=>{window.testCopiedLink='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.testCopiedLink=text}}})});await page.getByRole('button',{name:'Copy link',exact:true}).click();assert.equal(await page.evaluate(()=>window.testCopiedLink),portalLink);
  await page.screenshot({path:'outputs/zevian-request-dialog-qa.png',animations:'disabled'});
  await page.getByRole('button',{name:'Send request',exact:true}).click();assert(await page.getByRole('heading',{name:'Request sent',exact:true}).isVisible());await page.getByRole('button',{name:'Done',exact:true}).click();await page.locator('#employeeRequestDialog').waitFor({state:'detached'});
  assert.match(await page.locator('#drawerRequest').textContent(),/Request sent.*employee portal/);
  assert.equal(await page.getByRole('button',{name:'Add employee response',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Copy request',exact:true}).count(),0);
  assert.equal(await page.locator('#drawerContextForm').count(),0);
  assert.equal(await page.evaluate(()=>state.patterns[0].contextRequest.status),'sent');
  assert.equal(await page.getByLabel('Employee portal link',{exact:true}).inputValue(),portalLink);
  await page.getByRole('button',{name:'Request sent',exact:true}).click();assert(await page.getByRole('dialog',{name:'Request sent',exact:true}).isVisible());assert.equal(await page.getByRole('button',{name:'Send request',exact:true}).count(),0);await page.getByRole('button',{name:'Done',exact:true}).click();await page.locator('#employeeRequestDialog').waitFor({state:'detached'});
  assert.match(await page.locator('.drawer-status').textContent(),/awaiting employee context/);
  // Simulate a response arriving from the employee portal, outside the manager UI.
  await page.evaluate(()=>{const p=state.patterns[0];p.contexts.push({id:'portal-response',source:'employee',content:'I had fewer lead blocks because of onboarding and admin cleanup.',signals:[],tags:[],type:'Employee note',relevance:'pending',author:p.rep,date:new Date().toISOString()});openFindingDrawer(p.id)});
  assert.match(await page.locator('.drawer-status').textContent(),/needs review/);
  await page.getByRole('button',{name:'Use this context',exact:true}).click();
  assert.match(await page.locator('.drawer-status').textContent(),/manager reviewed/);
  await page.getByRole('button',{name:'Continue without context'}).click();
  await page.getByRole('button',{name:'Monitor',exact:true}).click();
  assert.match(await page.locator('.decision-section').textContent(),/monitoring/);
  await page.getByRole('button',{name:'Expand finding details',exact:true}).click();
  assert.equal(await page.locator('.finding-drawer').evaluate(e=>e.getBoundingClientRect().width),1200);
  await page.getByRole('button',{name:'See Full Reasoning'}).click();assert(await page.locator('#drawerReasoning').isVisible());
  await page.keyboard.press('Escape');assert.equal(await page.locator('#findingDrawer').count(),0);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('zevian_diagnosis_v1')));assert.equal(saved.history[0].id,'keep-me','Design preview leaves saved data unchanged');
  for(const screen of ['upload','match','findings','drawer','context']){
   await page.goto(base+'?design-preview=1&screen='+screen);await page.evaluate(()=>document.fonts.ready);
   await page.screenshot({path:'outputs/zevian-v4-'+screen+'-qa.png',animations:'disabled'});
  }
  await page.setViewportSize({width:390,height:844});await page.goto(base+'?design-preview=1&screen=drawer');await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:'outputs/zevian-v4-mobile-qa.png',animations:'disabled'});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page overflow on mobile');
  await page.getByRole('button',{name:'Request Employee Context',exact:true}).click();await page.screenshot({path:'outputs/zevian-request-mobile-qa.png',animations:'disabled'});const requestRect=await page.locator('#employeeRequestDialog').boundingBox();assert(requestRect.x>=0&&requestRect.x+requestRect.width<=390);await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Add Context',exact:true}).first().click();assert(await page.getByRole('textbox',{name:'Manager context'}).isVisible());
  await context.close();
  const live=await browser.newContext({viewport:{width:1440,height:1017}});const importPage=await live.newPage();importPage.on('pageerror',e=>errors.push(e.message));
  await importPage.goto(base);await importPage.locator('.help').evaluate(e=>e.open=true);await importPage.getByRole('button',{name:'Try sample data',exact:true}).click();
  await confirmColumns(importPage);await importPage.getByRole('button',{name:'View findings',exact:true}).click();await importPage.getByRole('heading',{name:'Review Findings',exact:true}).waitFor();assert(await importPage.locator('.finding-row').count()>0);
  await importPage.locator('.finding-row').first().click();await importPage.getByRole('button',{name:'Add Manager Context',exact:true}).click();await importPage.getByRole('textbox',{name:'Manager context'}).fill('The audience changed this week.');await importPage.getByRole('button',{name:'Save context',exact:true}).click();await importPage.getByRole('button',{name:'Continue without context'}).click();await importPage.getByRole('button',{name:'Followup',exact:true}).click();
  await importPage.reload();await importPage.locator('.finding-row').first().click();assert.match(await importPage.locator('.context-note').textContent(),/audience changed/);assert.match(await importPage.locator('.decision-section').textContent(),/following up/);
  await importPage.keyboard.press('Escape');await importPage.getByRole('button',{name:'Uploads',exact:true}).click();
  await importPage.locator('#file').setInputFiles({name:'broken.csv',mimeType:'text/csv',buffer:Buffer.from('Name,Name\nA,5')});await importPage.locator('#uploadError .error').waitFor();assert.match(await importPage.locator('#uploadError').textContent(),/unique/);
  const xlsx=await importPage.evaluate(()=>{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Rep name','Week','Calls','Meetings booked'],['Test Employee','2026-09-01',100,10],['Test Employee','2026-09-08',100,5]]),'Performance');return Array.from(new Uint8Array(XLSX.write(wb,{type:'array',bookType:'xlsx'})))});
  await importPage.locator('#file').setInputFiles({name:'performance.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(xlsx)});await confirmColumns(importPage);await importPage.getByRole('button',{name:'View findings',exact:true}).click();await importPage.getByRole('heading',{name:'Review Findings',exact:true}).waitFor();assert.match(await importPage.locator('.findings-table').textContent(),/Test Employee/);
  await importPage.evaluate(()=>{state.employees=['Joy Rahman','Jamal Rahman']});await importPage.getByRole('button',{name:'Uploads',exact:true}).click();
  await importPage.locator('#file').setInputFiles({name:'ambiguous.csv',mimeType:'text/csv',buffer:Buffer.from('Rep name,Week,Calls,Meetings booked\nJ Rahman,2026-09-01,100,10\nJ Rahman,2026-09-08,100,5')});await confirmColumns(importPage);await importPage.getByRole('heading',{name:'Who should “J Rahman” be linked to?',exact:true}).waitFor();
  assert(await importPage.locator('#nameMatchContinue').isDisabled());await importPage.getByRole('button',{name:'Joy Rahman',exact:true}).click();await importPage.locator('#nameMatchContinue').click();await importPage.getByRole('button',{name:'View findings',exact:true}).click();await importPage.getByRole('heading',{name:'Review Findings',exact:true}).waitFor();assert.match(await importPage.locator('.findings-table').textContent(),/Joy Rahman/);
  await importPage.getByRole('button',{name:'Uploads',exact:true}).click();await importPage.getByRole('button',{name:'Set KPIs Manually'}).click();assert(await importPage.getByRole('button',{name:'Review matches',exact:true}).isDisabled());await importPage.getByLabel('Employee name').fill('Manual Employee');await importPage.getByLabel('Reporting date', {exact:true}).fill('2026-09-08');await importPage.getByLabel('Calls', {exact:true}).fill('100');await importPage.getByLabel('Meetings booked', {exact:true}).fill('10');await importPage.getByRole('button',{name:'Add record',exact:true}).click();assert(!(await importPage.getByRole('button',{name:'Review matches',exact:true}).isDisabled()));await importPage.getByRole('button',{name:'Review matches',exact:true}).click();await importPage.getByRole('heading',{name:'Review matches',exact:true}).waitFor();
  await live.close();assert.deepEqual(errors,[]);console.log('PASS: design geometry, assets, context review, decisions, saved data, mobile, CSV validation, and XLSX import.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
