/** Shared campaign milestones. This leaf module must not import game logic. */
export const CAMPAIGN_FLAGS = {
  descent: 'campaign:descent',
  drain: 'campaign:drain',
  trial: 'campaign:trial',
  tram: 'campaign:tram',
  rescue: 'campaign:rescue',
  bells: 'campaign:bells',
  procedure: 'campaign:procedure',
  accepted: 'campaign:accepted',
  ascent: 'campaign:ascent',
  returned: 'campaign:return',
  rite: 'campaign:rite',
  wardReady: 'campaign:wardReady',
  complete: 'campaignComplete',
  irdrath: 'defeated:campaign-irdrath',
  vesper: 'defeated:campaign-vesper',
  lishal: 'defeated:campaign-lishal',
  malificat: 'defeated:campaign-malificat',
} as const;

/** The completion summary has been shown after the final recovery scenes. */
export const CAMPAIGN_SUMMARY_FLAG = 'scene:campaignSummary';

/** The final recovery sequence has finished; only then is the summary due. */
export const CAMPAIGN_RECOVERY_FLAG = 'scene:campaignRecovery';

/** New map IDs, kept separate from the obsolete version-7 Sunken Ruins. */
export const CAMPAIGN_MAP_IDS: ReadonlySet<string> = new Set([
  'sunkenArchive',
  'cisternMarches',
  'rootways',
  'glassWarrens',
  'bellHollows',
  'quietFoundry',
  'upwardRoad',
  'innerWard',
]);
