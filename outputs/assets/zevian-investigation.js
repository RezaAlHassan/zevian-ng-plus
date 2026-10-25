/* Shared investigation views. Static examples and uploaded findings use the same model. */
'use strict';
const investigationViews = new Map();
function investigationView(id) {
  if (!investigationViews.has(id)) investigationViews.set(id, {details:false, scroll:0, action:false, draft:''});
  return investigationViews.get(id);
}
function investigationMetric(metric, previous, current) {
  return {metric, baseline:previous, value:current, change:(current-previous)/previous*100, periods:4, previous, team:null};
}
function investigationExamples() {
  const make=(id,rep,metric,previous,current,investigation,extra=[])=>({id,rep,period:'2026-10-07',signal:investigationMetric(metric,previous,current),evidence:[investigationMetric(metric,previous,current),...extra],type:metric==='reply_rate'?'reply':'meeting',severity:'Needs review',status:'needs_context',contexts:[],diagnosis:null,investigation});
  const period='10 Sep–7 Oct vs 13 Aug–9 Sep';
  const rows=[{label:'SDR A',previous:24,current:14},{label:'SDR B',previous:20,current:12},{label:'Unaffected peers',previous:22,current:21,peer:true}];
  return [
    make('investigation-reps','SDR A & SDR B','meetings_booked',44,26,{
      template:'performance',title:'Meetings booked declined for two SDRs',population:'SDR A · SDR B',period,metricLabel:'Meetings booked',source:'Prototype CRM export',unit:'meetings',visualization:'grouped',comparison:rows,
      observations:[
        {kind:'Observed',text:'Unaffected peers stayed broadly stable.',date:period,source:'CRM · meeting totals',evidence:'peer'},
        {kind:'Observed',text:'New-source lead share rose for both SDRs.',date:period,source:'CRM · lead assignments',evidence:'leads'},
        {kind:'Possible link',text:'The new lead source may affect booking conversion.',date:'Current comparison period',source:'Lead mix + booking totals',evidence:'leads'}
      ],
      next:'Compare booking conversion from old and new lead sources among similar prospects.',
      limitations:['Peer baseline excludes SDR A and SDR B. It averages three unaffected SDRs.','Lead mix and meeting totals show an association, not a cause. Compare similar prospects before acting.'],
      leadRows:[{label:'SDR A',previous:'20%',current:'60%'},{label:'SDR B',previous:'25%',current:'65%'}],
      records:[{name:'SDR A',previous:24,current:14},{name:'SDR B',previous:20,current:12},{name:'Peer C',previous:20,current:20},{name:'Peer D',previous:22,current:21},{name:'Peer E',previous:24,current:22}],
      timeline:[{date:'13 Aug–9 Sep',text:'Previous comparison period'},{date:'10 Sep',text:'New-source assignments increased'},{date:'10 Sep–7 Oct',text:'Current comparison period'}]
    }),
    make('investigation-sequence','Enterprise SDRs','reply_rate',8.1,5.5,{
      template:'process',title:'Enterprise reply rate fell after a sequence change',population:'Enterprise segment',period:'15 Sep–7 Oct vs 19 Aug–11 Sep',metricLabel:'Reply rate',source:'Prototype sequence export',unit:'%',visualization:'before-after',comparison:[{label:'Previous sequence',previous:8.1,current:5.5}],
      observations:[
        {kind:'Observed',text:'A new sequence replaced tailored openings.',date:'12 Sep 2026',source:'Sequence change log',evidence:'messages'},
        {kind:'Observed',text:'Outreach volume stayed stable.',date:'Comparison periods',source:'Sequence · sent counts',evidence:'volume'},
        {kind:'Possible link',text:'The sequence change preceded the reply decline.',date:'12–15 Sep 2026',source:'Change log + reply trend',evidence:'timeline'}
      ],next:'Compare old and new sequences among similar Enterprise prospects before reverting the change.',
      messages:{previous:'Hi Morgan, I saw your team is hiring regional SDRs. How are you keeping lead routing consistent as those teams grow?',current:'Hi Morgan, we help sales teams grow pipeline. Would you be open to a quick call to learn more?'},
      timeline:[{date:'19 Aug–11 Sep',text:'Previous sequence measured'},{date:'12 Sep',text:'New sequence introduced'},{date:'15 Sep–7 Oct',text:'New sequence measured'}],
      trend:[{label:'19–26 Aug',value:8.4},{label:'27 Aug–3 Sep',value:8.1},{label:'4–11 Sep',value:7.8},{label:'15–22 Sep',value:5.8},{label:'23–30 Sep',value:5.5},{label:'1–7 Oct',value:5.2}],
      limitations:['Timing does not establish causation. Lead mix and deliverability could also affect replies.','Both periods contain 24 calendar days. The three transition days are excluded.'],
      records:[{name:'Previous sequence',sent:3000,replies:243},{name:'New sequence',sent:3000,replies:165}]
    },[investigationMetric('emails',3000,3000)]),
    make('investigation-limited','SDR A & SDR B','meeting_conversion_rate',10,6,{
      template:'performance',title:'Meeting conversion declined for two SDRs',population:'SDR A · SDR B',period,metricLabel:'Meeting conversion',source:'Prototype CRM export',unit:'%',visualization:'grouped',comparison:[{label:'SDR A',previous:10,current:6},{label:'SDR B',previous:10,current:6}],
      observations:[{kind:'Observed',text:'Conversation volume stayed stable.',date:period,source:'CRM · connected conversations',evidence:'volume'},{kind:'Observed',text:'No related process change was found in available records.',date:period,source:'Available CRM change log',evidence:'limits'}],
      missing:['Conversation content unavailable','Lead-segment history unavailable'],next:'Review conversation samples from both periods, if available, to locate where booking conversion changed.',
      limitations:['Meeting conversion = booked meetings / connected conversations.','Available CRM records show no related change; this does not mean no change occurred.'],
      records:[{name:'SDR A',previous:20,current:12,conversations:200},{name:'SDR B',previous:20,current:12,conversations:200}]
    })
  ];
}
fields.meeting_conversion_rate='Meeting conversion';
const investigationOriginalPeriod=v4Period;
v4Period=()=>state.upload?.investigationExamples?'Aug-Oct 2026':investigationOriginalPeriod();
const investigationOriginalTitle=v4FindingTitle;
v4FindingTitle=p=>p.investigation?.title||investigationOriginalTitle(p);
function investigationModel(p) {
  if(p.investigation)return p.investigation;
  const e=p.signal,a=v4EvidenceAssessment(p),snapshot=v4ComparisonSnapshot(p),valid=a.supporting.slice(0,2);
  return {template:'performance',title:v4FindingTitle(p),population:p.rep,period:v4ComparisonPeriod(p),metricLabel:fields[e.metric]||e.metric,source:snapshot.source,unit:e.metric.endsWith('_rate')?'%':'',visualization:'before-after',comparison:[{label:fields[e.metric]||e.metric,previous:e.baseline,current:e.value}],
    observations:valid.map(x=>({kind:'Observed',text:(fields[x.metric]||x.metric)+' '+(Math.abs(x.change)<=5?'stayed stable.':x.change<0?'also declined.':'increased.'),date:v4ComparisonPeriod(p),source:snapshot.source,evidence:'records'})),missing:valid.length<2?[a.missing]:[],next:p.nextCheck||a.check,
    limitations:['Cause unconfirmed. Uploaded totals cannot establish why performance changed.'],records:p.evidence.filter(x=>Number.isFinite(x.value)&&Number.isFinite(x.baseline)).map(x=>({name:fields[x.metric]||x.metric,previous:x.baseline,current:x.value})),
    trend:snapshot.records.map(r=>({label:formatDate(r.period),value:r.metrics[e.metric]})).filter(r=>Number.isFinite(r.value)).concat([{label:formatDate(p.period),value:e.value}])};
}
function investigationAmount(value,unit) {return fmt(value)+(unit==='%'?'%':'');}
function investigationBars(m) {
  const maximum=Math.max(1,...m.comparison.flatMap(r=>[r.previous,r.current]));
  return '<figure class="investigation-chart"><figcaption>'+esc(m.metricLabel)+(m.unit&&m.unit!=='%'?' · '+esc(m.unit):'')+'</figcaption><div class="chart-key"><span><i class="previous-key"></i>Previous</span><span><i class="current-key"></i>Current</span></div>'+m.comparison.map(r=>'<div class="bar-group '+(r.peer?'peer-group':'')+'"><strong>'+esc(r.label)+'</strong><div class="bar-track"><span class="bar previous-bar" style="width:'+Math.max(0,r.previous/maximum*100)+'%"></span><span>'+esc(investigationAmount(r.previous,m.unit))+'</span></div><div class="bar-track"><span class="bar current-bar" style="width:'+Math.max(0,r.current/maximum*100)+'%"></span><span>'+esc(investigationAmount(r.current,m.unit))+'</span></div></div>').join('')+'</figure>';
}
function investigationBeforeAfter(m) {
  const row=m.comparison[0];return '<figure class="investigation-chart"><figcaption>'+esc(m.metricLabel)+'</figcaption><div class="before-after"><div><span>Previous</span><strong>'+esc(investigationAmount(row.previous,m.unit))+'</strong></div><span aria-hidden="true">→</span><div><span>Current</span><strong>'+esc(investigationAmount(row.current,m.unit))+'</strong></div></div></figure>';
}
function investigationTrend(m) {
  if(!m.trend||m.trend.length<2)return '';
  const maximum=Math.max(1,...m.trend.map(r=>r.value)),points=m.trend.map((r,i)=>(24+i*552/(m.trend.length-1))+','+(112-r.value/maximum*90)).join(' ');
  return '<figure class="investigation-trend"><figcaption>'+esc(m.metricLabel)+' over time</figcaption><svg viewBox="0 0 600 140" role="img" aria-label="'+esc(m.trend.map(r=>r.label+': '+investigationAmount(r.value,m.unit)).join('; '))+'"><path d="M24 112H576" class="trend-axis"/><polyline points="'+points+'" class="trend-line"/>'+m.trend.map((r,i)=>'<circle cx="'+(24+i*552/(m.trend.length-1))+'" cy="'+(112-r.value/maximum*90)+'" r="3"/>').join('')+'</svg><div class="trend-ends"><span>'+esc(m.trend[0].label)+'</span><span>'+esc(m.trend.at(-1).label)+'</span></div><details class="drawer-disclosure"><summary>View trend values</summary><dl class="trend-values">'+m.trend.map(r=>'<div><dt>'+esc(r.label)+'</dt><dd>'+esc(investigationAmount(r.value,m.unit))+'</dd></div>').join('')+'</dl></details></figure>';
}
function investigationTimeline(m) {return m.timeline?'<section id="evidence-timeline"><h3>Change timeline</h3><ol class="change-timeline">'+m.timeline.map(r=>'<li><time>'+esc(r.date)+'</time><span>'+esc(r.text)+'</span></li>').join('')+'</ol></section>':'';}
function investigationComparison(m) {return m.visualization==='grouped'?investigationBars(m):investigationBeforeAfter(m);}
function investigationObservations(p,m) {
  const context=v4ManagerInvestigation(p),observations=m.observations.slice(0,context?2:3);
  return '<section class="review-section"><h3>What changed</h3><div class="investigation-observations">'+observations.map(o=>'<button class="observation" data-action="investigationEvidence:'+p.id+':'+o.evidence+'"><span class="observation-kind '+(o.kind==='Possible link'?'possible':'')+'">'+esc(o.kind)+'</span><strong>'+esc(o.text)+'</strong><small>'+esc(o.date)+' · '+esc(o.source)+' <span aria-hidden="true">↗</span></small></button>').join('')+(context?'<div class="observation context-observation"><span class="observation-kind possible">Possible link · Manager context</span><strong>'+esc(context.consideration)+'</strong></div>':'')+'</div>'+(m.missing?.length?'<div class="investigation-missing"><strong>Missing evidence</strong><ul>'+m.missing.map(text=>'<li>'+esc(text)+'</li>').join('')+'</ul></div>':'')+'</section>';
}
function investigationRecommendation(p,m) {
  const context=v4ManagerInvestigation(p),next=context?context.next:m.next;
  return next?'<section class="review-section investigation-next"><h3>'+esc(context?.label||'Suggested next step')+'</h3><p>'+esc(next)+'</p></section>':'';
}
function investigationContext(p) {
  return '<details class="drawer-disclosure investigation-context"><summary>What changed outside the data?'+(p.contexts.length?' · '+plural(p.contexts.length,'note'):'')+'</summary><div class="disclosure-content">'+(p.contexts.some(c=>c.relevance!=='ignored')?v4Notes(p):'<p>Add what the metrics miss.</p>')+'<div class="actions">'+button(p.contexts.length?'Edit context':'Add context','v4Edit:'+p.id)+button(p.contextRequest?.status==='sent'?'Request sent':'Request employee context','v4Request:'+p.id)+'</div><div id="drawerContextEditor" class="hidden"></div><div id="drawerRequest" class="hidden"></div></div></details>';
}
function investigationDecision(p) {
  const v=investigationView(p.id);return '<section class="review-section investigation-decision"><h3>Decision <span>Optional</span></h3><div class="actions">'+button('Mark reviewed','investigationReviewed:'+p.id)+button('Take action / Investigate further','investigationAction:'+p.id)+button('Dismiss','investigationDismiss:'+p.id)+'</div><div id="investigationActionEditor" class="'+(v.action?'':'hidden')+'"><label for="investigationActionText">Intended next step <span class="muted">(optional)</span></label><textarea id="investigationActionText" placeholder="Add your next step, or save without a note.">'+esc(v.draft)+'</textarea><div class="actions">'+button('Save action','investigationSave:'+p.id,true)+button('Cancel','investigationCancel:'+p.id)+'</div></div>'+(p.investigationDecision?'<p class="saved-investigation-decision" role="status">'+esc(p.investigationDecision.label)+(p.investigationDecision.text?' · '+esc(p.investigationDecision.text):'')+'</p>':'')+'</section>';
}
function investigationEvidence(m) {
  const messages=m.messages?'<section id="evidence-messages"><h3>Representative messages</h3><div class="message-comparison"><article><h4>Previous · tailored opening</h4><p>'+esc(m.messages.previous)+'</p></article><article><h4>Current · generic opening</h4><p>'+esc(m.messages.current)+'</p></article></div><p class="muted">Illustrative samples from the prototype sequence export.</p></section>':'';
  const leads=m.leadRows?'<section id="evidence-leads"><h3>New-source lead share</h3><div class="evidence-table-scroll"><table class="investigation-table"><thead><tr><th>SDR</th><th>Previous</th><th>Current</th></tr></thead><tbody>'+m.leadRows.map(r=>'<tr><td>'+esc(r.label)+'</td><td>'+esc(r.previous)+'</td><td>'+esc(r.current)+'</td></tr>').join('')+'</tbody></table></div></section>':'';
  const sequence=m.template==='process',limited=m.records[0]?.conversations!=null;
  const records='<section id="evidence-records"><h3>Source records</h3><p class="muted">'+esc(m.source)+' · '+esc(m.period)+'</p><div class="evidence-table-scroll"><table class="investigation-table"><thead><tr><th>'+(sequence?'Sequence':'Metric / population')+'</th><th>'+(sequence?'Sent':'Previous')+'</th><th>'+(sequence?'Replies':'Current')+'</th>'+(limited?'<th>Conversations per period</th>':'')+'</tr></thead><tbody>'+m.records.map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+esc(sequence?r.sent:r.previous)+'</td><td>'+esc(sequence?r.replies:r.current)+'</td>'+(limited?'<td>'+esc(r.conversations)+'</td>':'')+'</tr>').join('')+'</tbody></table></div></section>';
  return (sequence?'<section>'+investigationBeforeAfter(m)+'</section>':'')+investigationTimeline(m)+messages+leads+(m.trend?.length>1?'<section>'+investigationTrend(m)+'</section>':'')+records+'<section id="evidence-limits"><h3>Comparison limits</h3><ul class="comparison-limits">'+m.limitations.map(text=>'<li>'+esc(text)+'</li>').join('')+'</ul></section>';
}
function investigationBody(p,m) {
  const v=investigationView(p.id);
  return v.details?'<button class="link-btn evidence-back" data-action="investigationBack:'+p.id+'">← Back to summary</button><h2 class="evidence-heading" tabindex="-1">Supporting evidence</h2>'+investigationEvidence(m):
    '<section class="review-section comparison-section">'+investigationComparison(m)+'<p class="investigation-caution">'+(m.missing?.length?'Limited evidence · ':'')+'Cause unconfirmed</p></section>'+investigationObservations(p,m)+investigationRecommendation(p,m)+investigationContext(p)+investigationDecision(p);
}
openFindingDrawer=function(id) {
  const p=state.patterns.find(p=>p.id===id);if(!p)return;
  const existing=$('findingDrawer'),origin=existing?v4DrawerOrigin:document.activeElement;
  if(existing)existing.remove();v4DrawerOrigin=origin;selected=p;
  const m=investigationModel(p),v=investigationView(id);
  document.body.insertAdjacentHTML('beforeend','<div class="drawer-layer" id="findingDrawer"><button class="drawer-backdrop" data-action="closeDrawer" aria-label="Close finding details" tabindex="-1"></button><aside class="finding-drawer compact-drawer investigation-drawer" role="dialog" aria-modal="true" aria-labelledby="drawerTitle"><header><div class="drawer-person"><strong>'+esc(m.population)+'</strong><button class="drawer-close" data-action="closeDrawer" aria-label="Close finding details">&times;</button></div><h2 id="drawerTitle">'+esc(m.title)+'</h2><p>'+esc(m.period)+'</p><div class="investigation-header-meta"><span>'+esc(pct(p.signal.change))+' '+esc(m.metricLabel.toLowerCase())+'</span>'+(p.investigationDecision?'<span>'+esc(p.investigationDecision.label)+'</span>':'')+'</div></header><div class="drawer-body">'+investigationBody(p,m)+'</div><footer>'+button(v.details?'Back to summary':'Review evidence',(v.details?'investigationBack:':'investigationEvidence:')+id)+button('Close','closeDrawer')+'</footer></aside></div>');
  document.body.classList.add('drawer-open');
  if(!v.details)document.querySelector('.drawer-body').scrollTop=v.scroll;
  document.querySelector('.drawer-close').focus();
  $('investigationActionText')?.addEventListener('input',e=>v.draft=e.target.value);
};
const investigationOriginalClose=closeFindingDrawer;
closeFindingDrawer=function(restore=true){if(selected&&$('findingDrawer')){const v=investigationView(selected.id);if(!v.details)v.scroll=document.querySelector('.drawer-body').scrollTop;}investigationOriginalClose(restore);};
const investigationOriginalEdit=v4EditContext;
v4EditContext=function(id,source='manager') {investigationOriginalEdit(id,source);const details=document.querySelector('.investigation-context');if(details)details.open=true;};
function investigationSave(p,type,text='') {
  p.status=type==='dismissed'?'dismissed':type==='reviewed'?'explained':'action_recorded';
  p.decisionDate=new Date().toISOString();
  p.investigationDecision={type,label:({dismissed:'Dismissed',reviewed:'Reviewed',action:'Action saved'})[type],text,date:p.decisionDate};
  p.diagnosis=buildDiagnosis(p);
  p.diagnosis.nextAction={text:text||p.investigationDecision.label,categories:[p.investigationDecision.label],source:'manager',date:p.decisionDate};
  record(p,type==='reviewed'?'Finding reviewed':type==='dismissed'?'Finding dismissed':'Next action saved',text);
  state.history.at(-1).investigation=structuredClone(investigationModel(p));
  investigationView(p.id).action=false;persist();
  if(type==='dismissed')closeFindingDrawer();else openFindingDrawer(p.id);
  notify(p.investigationDecision.label+'.');
}
function loadInvestigationExamples() {
  state={upload:{id:'investigation-examples',file:'Prototype CRM and sequence exports',date:'2026-10-07',period:'2026-10-07',mappingStatus:'confirmed',investigationExamples:true},columns:[],rows:[],mapping:[],records:[],history:[],patterns:investigationExamples()};
  investigationViews.clear();persist();patternsScreen();
}
const investigationOriginalUpload=uploadScreen;
uploadScreen=function(){investigationOriginalUpload();document.querySelector('.help .actions')?.insertAdjacentHTML('beforeend',button('Try investigation examples','investigationExamples'));};
actions.upload=uploadScreen;
$('uploadNav').onclick=uploadScreen;
document.addEventListener('click',e=>{
  const target=e.target.closest('[data-action]');if(!target)return;
  const [action,id,anchor]=target.dataset.action.split(':');
  if(action==='investigationExamples'){loadInvestigationExamples();return;}
  if(!action.startsWith('investigation'))return;
  const p=state.patterns.find(p=>p.id===id);if(!p)return;const v=investigationView(id);
  if(action==='investigationEvidence'){
    if(!v.details)v.scroll=document.querySelector('.drawer-body').scrollTop;
    v.details=true;openFindingDrawer(id);document.querySelector('.evidence-heading').focus();
    const section=$('evidence-'+({peer:'records',volume:'records'}[anchor]||anchor));section?.scrollIntoView({block:'start'});
  }else if(action==='investigationBack'){v.details=false;openFindingDrawer(id);document.querySelector('.drawer-body').scrollTop=v.scroll;document.querySelector('.compact-drawer footer button').focus();}
  else if(action==='investigationAction'){v.action=true;$('investigationActionEditor').classList.remove('hidden');$('investigationActionText').focus();}
  else if(action==='investigationCancel'){v.action=false;$('investigationActionEditor').classList.add('hidden');document.querySelector('[data-action="investigationAction:'+id+'"]').focus();}
  else if(action==='investigationSave')investigationSave(p,'action',$('investigationActionText').value.trim());
  else if(action==='investigationReviewed')investigationSave(p,'reviewed');
  else if(action==='investigationDismiss')investigationSave(p,'dismissed');
});
// Existing list and upload paths expose the examples; preview remains isolated from saved data.
if(v4Preview&&!['upload','match'].includes(new URLSearchParams(location.search).get('screen'))){
  const previewScreen=new URLSearchParams(location.search).get('screen');loadInvestigationExamples();
  if(['drawer','context'].includes(previewScreen))openFindingDrawer('investigation-reps');
}else if(mode==='upload')uploadScreen();
