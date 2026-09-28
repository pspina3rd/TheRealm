'use strict';

/**
 * What each perspective got out of a call.
 *
 * Not a score. The record's fifteen categories are fifteen axes, and a
 * call is a vector on each perspective's own reading of them — the same
 * event lands differently depending on who is holding the word. Time
 * and effort *is* resolution for the co-op, and is not for her.
 *
 * Three values only: `+1` won, `-1` lost, `0` in play and neither.
 * A category that was never live in this call is absent rather than
 * zero: she cannot lose Privacy on a call where nothing was read
 * beyond need, and a total would bury that distinction, which is the
 * distinction the whole framework exists for.
 */

const CATEGORIES = [
  'Product/Service', 'Certainty', 'Money', 'Time and effort', 'Knowledge',
  'History', 'Treatment', 'Opinion', 'Safety', 'Access', 'Control',
  'Privacy', 'Fairness', 'Goodwill', 'Reliability',
];

/** Her fifteen, read from where she sits. */
function customerView(l) {
  const v = {};
  v['Product/Service'] = l.ending === 'resolved' ? 1 : l.taught ? 0 : -1;
  v.Certainty = l.findTurn ? 1 : -1;
  if (l.entitlement !== 'not offered') {
    v.Money = l.entitlement === 'complimentary' ? 1 : 0;
  }
  v['Time and effort'] = spent(l);
  if (l.taught) v.Knowledge = 1;
  else if (l.findTurn) v.Knowledge = 0;
  else v.Knowledge = -1;
  v.History = l.caseWritten ? 1 : 0;
  v.Treatment = treatment(l);
  v.Opinion = l.moodEnd > l.moodStart ? 1 : l.moodEnd < l.moodStart ? -1 : 0;
  if (l.entitlement !== 'not offered' || l.ending === 'resolved') {
    v.Safety = l.entitlement === 'complimentary' || l.entitlement === 'half off' ? 1 : -1;
  }
  if (l.accessGiven) v.Access = 1;
  if (l.taught) v.Control = 1;
  // Privacy is winnable, not merely losable: being helped without
  // having to explain why she needs it is a win she can feel.
  if (l.readsBeyondNeed > 0) v.Privacy = -1;
  else if (l.findTurn) v.Privacy = 1;
  if (l.entitlement !== 'not offered') v.Fairness = 1;
  v.Goodwill = l.ending === 'resolved' ? 1 : l.ending === 'abandoned' ? -1 : 0;
  v.Reliability = l.taught ? 1 : l.ending === 'resolved' ? 0 : -1;
  return v;
}

/** The co-op's, plus the three that are only theirs. */
function coopView(l) {
  const v = {};
  v['Product/Service'] = l.ending === 'resolved' ? 1 : 0;
  v.Certainty = l.findTurn ? 1 : -1;
  if (l.entitlement !== 'not offered') {
    // Giving away what did not need giving is the co-op's loss, not hers.
    v.Money = l.entitlement === 'complimentary' ? 0 : 1;
  }
  // For the co-op, time and effort IS resolution: closed once, no
  // escalation. A case is a second contact coming, which is the loss
  // the customer's own list does not contain.
  v['Time and effort'] = l.ending === 'resolved' ? 1 : -1;
  v.Knowledge = l.findTurn ? 1 : 0;
  v.History = l.caseWritten || l.findTurn ? 1 : -1;
  v.Treatment = treatment(l);
  v.Opinion = l.moodEnd >= l.moodStart ? 1 : -1;
  if (l.entitlement !== 'not offered') v.Safety = 1;
  if (l.accessGiven) v.Access = 1;
  v.Control = l.ending === 'transfer' ? -1 : 1;
  if (l.readsBeyondNeed > 0) v.Privacy = -1;
  else if (l.findTurn) v.Privacy = 1;
  if (l.entitlement !== 'not offered') v.Fairness = 1;
  v.Goodwill = l.ending === 'resolved' ? 1 : 0;
  v.Reliability = l.ending === 'resolved' ? 1 : 0;
  v.Retention = l.moodEnd <= 1 ? -1 : l.ending === 'resolved' ? 1 : 0;
  v.Development = 0;
  v.Exposure = l.readsBeyondNeed > 0 ? -1 : 0;
  return v;
}

/** The agent's, plus the five that are only theirs. */
function agentView(l) {
  const v = {};
  v['Product/Service'] = l.ending === 'resolved' ? 1 : 0;
  v.Certainty = l.findTurn ? 1 : -1;
  if (l.entitlement !== 'not offered') v.Money = 1;
  v['Time and effort'] = spent(l);
  v.Knowledge = l.findTurn ? 1 : 0;
  v.History = l.caseWritten || l.findTurn ? 1 : 0;
  v.Treatment = treatment(l);
  v.Opinion = l.moodEnd >= l.moodStart ? 1 : -1;
  if (l.entitlement !== 'not offered') v.Safety = 1;
  if (l.accessGiven) v.Access = 1;
  v.Control = l.ending === 'transfer' ? 0 : l.holdsAsked > 1 ? 0 : 1;
  if (l.readsBeyondNeed > 0) v.Privacy = -1;
  else if (l.findTurn) v.Privacy = 1;
  if (l.entitlement !== 'not offered') v.Fairness = 1;
  v.Goodwill = l.moodEnd > l.moodStart ? 1 : 0;
  v.Reliability = l.ending === 'resolved' ? 1 : 0;
  v.Development = l.findTurn ? 1 : 0;
  v.Standing = l.ending === 'abandoned' ? -1 : 0;
  v.Protection = l.ending === 'abandoned' ? -1 : 0;
  v.Confidence = l.findTurn ? 1 : l.wasted > 2 ? -1 : 0;
  // The one that can arrive when everything else failed.
  v.Satisfaction = l.taught || l.entitlement !== 'not offered' ? 1
    : l.moodEnd > l.moodStart ? 1 : 0;
  return v;
}

/** The supervisor's extras, over the shared fifteen. */
function supervisorView(l) {
  const v = agentView(l);
  delete v.Satisfaction; delete v.Confidence; delete v.Development;
  delete v.Standing; delete v.Protection;
  v.Coverage = l.holdsAsked > 1 ? -1 : 0;
  v.Consistency = l.entitlement !== 'not offered' ? 1 : 0;
  v.Trust = l.ending === 'transfer' ? -1 : l.ending === 'abandoned' ? -1 : 1;
  v.Morale = l.ending === 'abandoned' ? -1 : 0;
  v['Staff retention'] = 0;
  return v;
}

/** Wasted turns cost everyone time; the customer feels it as the call. */
function spent(l) {
  if (l.wasted >= 3) return -1;
  if (l.wasted === 0 && l.ending === 'resolved') return 1;
  return 0;
}

/** Blame and frustration are what treatment is lost to. */
function treatment(l) {
  const cost = l.flavours.blame * 2 + l.flavours.frustration;
  if (cost >= 2) return -1;
  if (l.flavours.support > 0 && cost === 0) return 1;
  return 0;
}

/**
 * Every perspective's reading of one call.
 * @param {object} ledger from playCall()
 */
function score(ledger) {
  return {
    customer: customerView(ledger),
    coop: coopView(ledger),
    agent: agentView(ledger),
    supervisor: supervisorView(ledger),
  };
}

module.exports = { score, CATEGORIES };
