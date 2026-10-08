/* Run with node outputs/tests/zevian-investigation.cjs. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../assets/zevian-v4.js'), 'utf8');
const sandbox = {
  fields: {meetings_booked: 'Meetings booked', calls: 'Calls', connect_rate: 'Connect rate'},
  esc: value => String(value).replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
  v4FindingValue: (metric, value) => String(value)
};
vm.createContext(sandbox);
vm.runInContext(source.slice(source.indexOf('function v4EvidenceAssessment'), source.indexOf('const v4DecisionDrafts')), sandbox);
const metric = (name, value, baseline) => ({metric: name, value, baseline, change: (value - baseline) / baseline * 100});
const signal = metric('meetings_booked', 19, 25);
const finding = {id: 'test-finding', signal, evidence: [signal, metric('calls', 100, 100), metric('connect_rate', 20, 20)], contexts: []};
assert.match(sandbox.v4EvidenceDetails(finding), /Evidence breakdown/);
assert.match(sandbox.v4EvidenceDetails(finding), /Missing:/);
assert.doesNotMatch(sandbox.v4CheckDetails(finding), /Possible reasons|reason-list/);
assert.equal(sandbox.v4ManagerInvestigation(finding), null);
assert.match(sandbox.v4ContextHints(finding), /Enterprise leads/);

// Exercise the real save handler: it saves context and reopens the drawer.
const elements = Object.fromEntries(['findingDrawer', 'drawerContextEditor', 'drawerContextForm', 'drawerNote', 'managerInvestigation'].map(id => [id, {classList: {remove() {}}, focus() {}, scrollIntoView() {}}]));
let persisted, reopened;
Object.assign(sandbox, {
  state: {patterns: [finding]},
  $: id => elements[id],
  crypto: {randomUUID: () => 'manager-note'},
  classifyContext: () => [],
  buildDiagnosis: () => ({}),
  record() {},
  persist: () => {persisted = JSON.parse(JSON.stringify(finding));},
  openFindingDrawer: () => {reopened = sandbox.v4InvestigationDetails(finding);},
  notify() {}
});
vm.runInContext(source.slice(source.indexOf('function v4EditContext'), source.indexOf('function v4Request(id)')), sandbox);
sandbox.v4EditContext(finding.id);
assert.match(elements.drawerContextEditor.innerHTML, /aria-describedby="drawerNoteHint"/);
elements.drawerNote.value = 'We switched to Enterprise leads two weeks ago.';
elements.drawerContextForm.onsubmit({preventDefault() {}});
assert.equal(persisted.contexts[0].content, elements.drawerNote.value);
assert.match(reopened, /Investigation updated/);
assert.match(reopened, /Enterprise leads may affect/);
assert.match(reopened, /Enterprise and non-Enterprise booking rates/);
assert.match(reopened, /Hypothesis only.*Context provided by manager.*Cause unconfirmed/);
assert.match(sandbox.v4NextCheck(persisted).text, /Enterprise and non-Enterprise/);

finding.contexts[0].relevance = 'ignored';
assert.equal(sandbox.v4ManagerInvestigation(finding), null);
finding.contexts[0].relevance = 'pending';
assert.equal(sandbox.v4ManagerInvestigation(finding), null);
finding.contexts[0].relevance = 'accepted';
finding.contexts[0].source = 'employee';
assert.equal(sandbox.v4ManagerInvestigation(finding), null);
finding.contexts[0].source = 'manager';
finding.contexts[0].content = 'We did not switch to Enterprise leads.';
assert.equal(sandbox.v4ManagerInvestigation(finding), null);
finding.contexts[0].content = '<script>something</script>';
assert.doesNotMatch(sandbox.v4InvestigationDetails(finding), /<script>/);
const limited = {...finding, evidence: [signal, {metric: 'calls', value: null, baseline: 100, change: null}], contexts: []};
assert.match(sandbox.v4EvidenceDetails(limited), /Limited evidence/);
assert.match(sandbox.v4EvidenceDetails(limited), /No supporting metrics/);
assert(source.includes('<h3>What changed outside the data?</h3>'));
console.log('Passed evidence breakdown, context save, investigation updates, persistence, and unconfirmed-cause checks.');

// Context must match the note and the finding; follow-up is optional.
finding.contexts[0].content = 'The team was undergoing coaching sessions between these periods. So activity metrics are low';
finding.evidence[1] = metric('calls', 80, 100);
let update = sandbox.v4ManagerInvestigation(finding);
assert.match(update.consideration, /Coaching sessions may explain lower activity/);
assert.equal(update.label, 'Suggested follow-up');
assert.match(update.next, /after coaching/);
assert.doesNotMatch(sandbox.v4InvestigationDetails(finding), /Verify next|supporting records/);
finding.contexts[0].content = 'Coaching reduced selling time. It has finished. No follow-up needed.';
update = sandbox.v4ManagerInvestigation(finding);
assert.equal(update.next, null);
assert.doesNotMatch(sandbox.v4InvestigationDetails(finding), /<h4>/);
assert.equal(sandbox.v4NextCheck(finding).text, null);
finding.contexts[0].content = 'We repainted the office last week.';
assert.equal(sandbox.v4ManagerInvestigation(finding), null);
assert.equal(sandbox.v4InvestigationDetails(finding), '');
finding.contexts[0].content = 'We switched to Enterprise leads two weeks ago.';
const irrelevantMetric = {...finding, signal: metric('calls', 80, 100)};
assert.equal(sandbox.v4ManagerInvestigation(irrelevantMetric), null);
finding.contexts[0].content = 'Coaching sessions reduced activity.';
finding.evidence[1] = metric('calls', 100, 100);
assert.match(sandbox.v4ManagerInvestigation(finding).consideration, /recorded activity stayed stable/);
console.log('Passed coaching follow-up, no-action, unrelated context, metric relevance, and conflicting evidence checks.');
