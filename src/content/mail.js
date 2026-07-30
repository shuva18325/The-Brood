/**
 * mail.js — the mail client on the old desktop.
 *
 * The mechanic is not discernment. The player will know with total
 * certainty what every one of these is. The mechanic is temptation.
 *
 * Each bait mail shows a preview line that is visible WITHOUT clicking, and
 * the preview is real: a case number nobody on the forums has, a verified
 * fact, better intelligence than any other source in the game. It gives
 * that away for free, as the hook. The link is what kills you.
 *
 * It never lies. It never disguises itself. It tells you not to open it.
 */

export const MAIL = [

/* ---- ordinary mail, because a life is still happening ---- */
{ id:'m01', day:1, from:'Norfolk Public Library', subject:'Your hold is ready for pickup',
  preview:'Item: "The Oyster Wars of the Chesapeake"...',
  body:`Your hold is ready for pickup at the Blyden Branch.

Holds are kept for seven days.

Branch hours have changed. Please check norfolkpubliclibrary.org before travelling.`,
  u:0 },

{ id:'m02', day:2, from:'Dominion Energy', subject:'Outage in your area',
  preview:'We are aware of an outage affecting your service address...',
  body:`We are aware of an outage affecting your service address.

Estimated restoration: unavailable.

This is an automated message. Do not reply.`,
  u:0 },

{ id:'m03', day:4, from:'mom', subject:'call me',
  preview:'I know you don\'t like the phone but call me...',
  body:`I know you don't like the phone but call me.

Your father saw it on the news and he has been on the porch for two hours.

We can come and get you. I know you said no. I am saying it again anyway.

Love, Mom`,
  u:0 },

{ id:'m04', day:6, from:'VDEM (no-reply)', subject:'EMERGENCY ALERT — Hampton Roads',
  preview:'Shelter in place. Do not travel between 8 p.m. and 6 a.m...',
  body:`Shelter in place.

Do not travel between 8 p.m. and 6 a.m.
Do not approach standing water.
Do not gather in groups outdoors.

This alert was sent to all devices registered in the affected area.`,
  u:1 },

{ id:'m05', day:10, from:'mom', subject:'(no subject)',
  preview:'Your father has the truck packed...',
  body:`Your father has the truck packed. He packed it yesterday and he has not unpacked it.

He says he can be there in four hours. I told him about the roads and he says he does not care about the roads.

Please just come home. Please.`,
  u:0 },

/* ---- ordinary spam, rising in volume, which is the signature ---- */
{ id:'m10', day:5, from:'Auto Warranty Services', subject:'FINAL NOTICE regarding your vehicle',
  preview:'Our records indicate your factory warranty...', body:`Our records indicate your factory warranty is expiring.

Press 1 to speak with a representative.`, u:0, junk:true },

{ id:'m11', day:7, from:'RE: RE: RE: fwd', subject:'you have to see this',
  preview:'lol', body:`lol`, u:0, junk:true },

{ id:'m12', day:8, from:'Auto Warranty Services', subject:'FINAL NOTICE regarding your vehicle',
  preview:'Our records indicate your factory warranty...', body:`Our records indicate your factory warranty is expiring.`, u:0, junk:true },

{ id:'m13', day:11, from:'Auto Warranty Services', subject:'FINAL NOTICE regarding your vehicle',
  preview:'Our records indicate your factory warranty...', body:`Our records indicate your factory warranty is expiring.`, u:0, junk:true },

{ id:'m14', day:12, from:'—', subject:'(no subject)',
  preview:'', body:``, u:0, junk:true },

{ id:'m15', day:14, from:'—', subject:'(no subject)',
  preview:'', body:``, u:0, junk:true },

{ id:'m16', day:16, from:'—', subject:'(no subject)',
  preview:'', body:``, u:0, junk:true },

{ id:'m17', day:18, from:'—', subject:'(no subject)',
  preview:'', body:``, u:0, junk:true },

/* ================================================================== */
/* BAIT. Everything below this line is the Pathogen.                   */
/*                                                                     */
/* The preview is free and it is genuinely better than anything the    */
/* forums have. The link is the cost. The player will sit and stare.   */
/* ================================================================== */

{ id:'p01', day:6, bait:true,
  from:'no sender', subject:'do not open this',
  preview:`CF-2001-0448 §4(b): "Officers should record the length of the pauses. A short pause means it got something." — the rest of §4 is not in circulation. It is here.`,
  warning:'do not open this link, you shall be forsaken',
  reward:['tormentor_noise_light'],
  body:`do not open this link, you shall be forsaken

    ▸ CF-2001-0448 §4, complete`,
  u:0 },

{ id:'p02', day:8, bait:true,
  from:'no sender', subject:'do not open this',
  preview:`The officer's statement has an Appendix C. The forums have A and B. Appendix C is the assessing officer's note about what happens to the next twelve people who read Appendix B.`,
  warning:'do not open this link, you shall be forsaken',
  reward:['anguish_officer_context'],
  body:`do not open this link, you shall be forsaken

    ▸ CF-1996-0202 Appendix C`,
  u:0 },

{ id:'p03', day:11, bait:true,
  from:'no sender', subject:'do not open this',
  preview:`Norfolk's assessment was completed on the 7th. It was not published. It names what is in this district, by tier, with counts, and it names what is expected here within the week.`,
  warning:'do not open this link, you shall be forsaken',
  reward:['city_composition'],
  body:`do not open this link, you shall be forsaken

    ▸ VDEM/CF joint assessment — Norfolk, districts 9–19`,
  u:0 },

{ id:'p04', day:12, bait:true,
  from:'no sender', subject:'do not open this',
  preview:`The gap between impact and adaptation was measured. Once. In 2011. By an officer who could not get funding to measure it twice. The number is in the unfiled note's second page, which was never scanned.`,
  warning:'do not open this link, you shall be forsaken',
  reward:['roadkill_window','roadkill_adapt'],
  body:`do not open this link, you shall be forsaken

    ▸ CF-2011-1180 p.2`,
  u:0 },

{ id:'p05', day:14, bait:true,
  from:'no sender', subject:'do not open this',
  preview:`Your friend's phone was last on a tower at 04:12 on the tenth. It has been on eleven towers since. The list of towers is a map of where it has been walking.`,
  warning:'do not open this link, you shall be forsaken',
  reward:['texts_are_bait'],
  body:`do not open this link, you shall be forsaken

    ▸ tower list, 10th–present`,
  u:0 },

/* The day 13 message. It is in Chinese. This is Virginia.
   It speaks the language of the region, not the victim. So either it is
   not local, or the network is routing from somewhere it should not be,
   or something has moved. Nobody can say which. */
{ id:'p06', day:16, bait:true, chinese:true,
  from:'no sender', subject:'不要打开',
  preview:`CF-1991-0067 附录 D。塔布勒石板的第四段。它站起来的那一次。`,
  warning:'不要打开这个链接，你将被抛弃',
  reward:['crippled_mistranslation','crippled_exists'],
  body:`不要打开这个链接，你将被抛弃

    ▸ CF-1991-0067 附录 D`,
  u:0 },

{ id:'p07', day:18, bait:true,
  from:'no sender', subject:'do not open this',
  preview:`I-64 westbound, milepost 238, 04:10. The box truck. The driver called back at 09:40 this morning and the sheet has not been updated because sheetmom has not logged in.`,
  warning:'do not open this link, you shall be forsaken',
  reward:['roadkill_window','spreadsheet_impacts'],
  body:`do not open this link, you shall be forsaken

    ▸ callback log, 64W`,
  u:0 },

/* ================================================================== */
/* THE REPLY                                                           */
/*                                                                     */
/* This one is not on the schedule. It arrives the day after the player */
/* clicks the red link on wlaq-jiance.com.cn — the link that does       */
/* nothing except reveal an address.                                    */
/*                                                                     */
/* It is not bait in the sense that p01–p07 are bait. There is no       */
/* document behind it, nothing is offered, and opening it does not end  */
/* the game. It is a reply from a webmaster who does not reply, and the */
/* only thing in it is a red link, and behind the red link is one       */
/* sentence, and the sentence is not addressed to the player alone.     */
/*                                                                     */
/* The player was never asked for an address. They clicked a link on a  */
/* website. That is the entire mechanism and it is not explained.       */
/* ================================================================== */

{ id:'r01', day:1, needs:'redLink', after:1, redReply:true,
  from:'zw@wlaq-jiance.com.cn', subject:'回复：（无主题）',
  preview:'本站不回复任何来信。',
  body:`本站不回复任何来信。

The station does not reply to any incoming letter.`,
  u:0 },

];

/**
 * The terminal line. Deployed exactly once, on a bad ending, and never as
 * a scare. The real horror is the near miss: reading about it on Day 4,
 * seeing it referenced on Day 8, and on Day 12 having the cursor sitting
 * on a link.
 */
export const TERMINAL_LINE = {
  zh: '没人能帮你，你完了。',
  en: "There's no Help for you; you're doomed.",
};

/**
 * What is behind the red link in the reply. Second person plural — 你们,
 * not 你. It is not talking to the person reading it. That is the only
 * thing about it that is worth noticing and the game never points at it.
 */
export const RED_REPLY_LINE = {
  zh: '你对此无能为力。你们都将终生受苦。',
  en: 'There is nothing you can do about this. You will all suffer for the rest of your lives.',
};

/**
 * §4.1. Mail is gated on the day AND on flags, so a message can arrive
 * because of something the player did rather than because of the calendar.
 * `needs` names a flag; `after` is how many days later it turns up.
 */
export function mailFor(day, flags = {}) {
  return MAIL.filter(m => {
    if (!m.needs) return m.day <= day;
    if (!flags[m.needs]) return false;
    const since = flags[m.needs + 'Day'] || day;
    return day >= since + (m.after || 0);
  });
}

export default MAIL;
