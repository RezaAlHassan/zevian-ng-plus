/* Current Figma drawer and shared interaction regression checks. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const base=process.env.ZEVIAN_TEST_URL||pathToFileURL(path.resolve(__dirname,'../zevian-manager-workflow.html')).href;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.ZEVIAN_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1014}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const variant of ['collapsed','details','context','messages']){
   await page.goto(base+'?design-preview=1&screen=drawer&drawer-variant='+variant);
   assert.equal(await page.locator('.review-drawer').count(),1);
   assert.equal(Math.round((await page.locator('.review-drawer').boundingBox()).width),675);
   assert.equal(await page.locator('[data-disclosure][open]').count(),variant==='collapsed'?0:3);
   assert.equal(await page.locator('.message-card').count(),variant==='messages'?2:variant==='details'?1:0);
   assert.equal(await page.locator('.context-note').count(),variant==='messages'?2:variant==='context'?1:0);
   if(variant==='messages')assert(await page.getByRole('button',{name:'Request sent',exact:true}).isDisabled());
   const assets=await page.locator('.review-drawer img').evaluateAll(items=>items.filter(e=>e.getClientRects().length).map(e=>({src:e.getAttribute('src'),loaded:e.complete&&e.naturalWidth>0,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
   assert(assets.every(a=>a.loaded&&!a.src.startsWith('http')));
   assert(assets.filter(a=>/check|dismiss/.test(a.src)).every(a=>a.w===18&&a.h===18));
   assert(assets.filter(a=>/chevron|collapse|expand/.test(a.src)).every(a=>a.w===16&&a.h===16));
   await page.screenshot({path:'outputs/zevian-review-'+variant+'-qa.png',animations:'disabled'});
  }
  await page.goto(base+'?design-preview=1&screen=findings');
  await page.evaluate(()=>document.fonts.ready);
  assert.deepEqual(await page.locator('.finding-label').first().evaluate(e=>{const s=getComputedStyle(e);return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing];}),['"Plus Jakarta Sans", sans-serif','13px','400','20px','0.065px']);
  assert.deepEqual(await page.locator('.findings-table th').first().evaluate(e=>{const s=getComputedStyle(e);return [s.fontSize,s.fontWeight];}),['11px','500']);
  await page.screenshot({path:'outputs/zevian-findings-type-qa.png',animations:'disabled'});
  await page.locator('.finding-row').getByRole('button',{name:'Review',exact:true}).first().click();
  assert.equal(await page.getByText('Comparison evidence',{exact:true}).count(),0);
  assert.equal(await page.locator('.review-drawer .investigation-chart,.review-drawer .investigation-trend,.review-drawer .bar-group').count(),0);
  await page.locator('[data-disclosure="cause"] > summary').click();
  await page.locator('[data-disclosure="context"] summary').click();
  await page.locator('[data-disclosure="records"] summary').click();
  await page.getByRole('button',{name:'Add context',exact:true}).click();
  await page.getByRole('textbox',{name:'Manager context',exact:true}).fill('We switched to Enterprise leads two weeks ago.');
  await page.getByRole('button',{name:'Save context',exact:true}).click();
  assert.equal(await page.locator('[data-disclosure][open]').count(),3);
  assert.match(await page.locator('.context-note').innerText(),/Enterprise leads/);
  assert(await page.locator('#drawerContextEditor').isHidden());
  assert.equal(await page.getByRole('button',{name:'Edit context',exact:true}).evaluate(e=>e===document.activeElement),true);
  await page.getByRole('button',{name:'Edit context',exact:true}).click();
  await page.getByRole('textbox',{name:'Manager context',exact:true}).fill('Unsaved context');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#findingDrawer').count(),1);
  await page.getByRole('button',{name:'Edit context',exact:true}).click();
  assert.match(await page.locator('#drawerNote').inputValue(),/Enterprise leads/);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Request Employee Context',exact:true}).click();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.equal(await page.evaluate(()=>selected.contextRequest),undefined);
  await page.getByRole('button',{name:'Request Employee Context',exact:true}).click();
  await page.getByRole('button',{name:'Send request',exact:true}).click();
  await page.getByRole('button',{name:'Done',exact:true}).click();
  assert(await page.getByRole('button',{name:'Request sent',exact:true}).isDisabled());
  assert.equal(await page.locator('[data-disclosure][open]').count(),3);
  await page.getByRole('button',{name:'Mark reviewed',exact:true}).click();
  assert.equal(await page.evaluate(()=>selected.status),'explained');
  assert.equal(await page.getByRole('button',{name:'Mark reviewed',exact:true}).getAttribute('aria-pressed'),'true');
  const history=await page.evaluate(()=>state.history.length);
  await page.getByRole('button',{name:'Mark reviewed',exact:true}).click();
  assert.equal(await page.evaluate(()=>state.history.length),history);
  await page.getByRole('button',{name:'Expand finding details',exact:true}).click();
  assert.equal(Math.round((await page.locator('.review-drawer').boundingBox()).width),1200);
  await page.getByRole('button',{name:'Collapse finding details',exact:true}).click();
  await page.getByRole('button',{name:/Not relevant/}).click();
  await page.getByRole('textbox',{name:'What is not relevant?'}).fill('This message belongs to another team.');
  await page.getByRole('button',{name:'Save report',exact:true}).click();
  assert.equal(await page.evaluate(()=>selected.evidenceReports.length),1);
  await page.getByRole('button',{name:'Close finding details',exact:true}).click();
  assert(await page.locator('.finding-row').getByRole('button',{name:'Review',exact:true}).first().evaluate(e=>e===document.activeElement));
  // Employee-only context must not turn Add context into Edit context.
  await page.evaluate(()=>{state.patterns[0].contexts=[{id:'employee',source:'employee',relevance:'pending',content:'Employee response',signals:[],date:new Date().toISOString()}];openFindingDrawer(state.patterns[0].id);});
  assert(await page.getByRole('button',{name:'Add context',exact:true}).isVisible());
  await page.getByRole('button',{name:'Use this context',exact:true}).click();
  assert.equal(await page.evaluate(()=>selected.contexts[0].relevance),'accepted');
  // Missing evidence must not invent a cause or turn missing numbers into zero.
  await page.evaluate(()=>{selected.review={title:'Limited evidence',risk:'Performance risk',changed:'No supporting change found.',cause:'Cause unconfirmed.',causes:[],messages:[],next:'Add more evidence.',records:[{name:'Meetings',baseline:null,previous:null,current:0}],missing:['Conversation content unavailable'],limits:[],source:''};openFindingDrawer(selected.id);});
  assert.equal(await page.locator('.review-source-table tbody').innerText(),'Meetings\t—\t—\t0');
  for(const width of [1920,1024,768,390]){
   await page.setViewportSize({width,height:1000});
   const box=await page.locator('.review-drawer').boundingBox();assert(box.width<=width&&box.x>=0);
   assert.equal(await page.locator('.drawer-body').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
  }
  await page.screenshot({path:'outputs/zevian-review-mobile-qa.png',animations:'disabled'});
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.review-drawer').evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.getByRole('button',{name:'Close finding details',exact:true}).focus();
  await page.keyboard.press('Shift+Tab');
  assert(await page.locator('[data-disclosure="records"] summary').evaluate(e=>e===document.activeElement));
  await page.keyboard.press('Escape');assert.equal(await page.locator('#findingDrawer').count(),0);
  // Local persistence is checked outside isolated design-preview mode.
  await page.goto(base);await page.evaluate(()=>loadInvestigationExamples());
  await page.locator('.finding-row').getByRole('button',{name:'Review',exact:true}).first().click();
  await page.getByRole('button',{name:'Mark reviewed',exact:true}).click();
  await page.reload();
  assert.equal(await page.evaluate(()=>state.patterns[0].investigationDecision.type),'reviewed');
  await page.locator('.finding-row').getByRole('button',{name:'Review',exact:true}).first().click();
  await page.locator('[data-disclosure="context"] > summary').click();
  await page.getByRole('button',{name:'Add context',exact:true}).click();
  await page.getByRole('textbox',{name:'Manager context',exact:true}).fill('Draft kept for this session');
  await page.getByRole('button',{name:'Close finding details',exact:true}).click();
  await page.locator('.finding-row').getByRole('button',{name:'Review',exact:true}).first().click();
  assert.equal(await page.locator('#drawerNote').inputValue(),'Draft kept for this session');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Dismiss',exact:true}).click();
  assert.equal(await page.locator('#findingDrawer').count(),0);
  assert(await page.locator('.finding-row').getByRole('button',{name:'Review',exact:true}).first().evaluate(e=>e===document.activeElement));
  await page.reload();
  assert.equal(await page.evaluate(()=>state.patterns[0].status),'dismissed');
  assert.deepEqual(errors,[]);
  console.log('Figma variants, shared interaction states, context, requests, decisions, missing evidence, assets, focus, mobile and persistence passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
