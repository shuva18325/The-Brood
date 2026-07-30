/**
 * sketchy.js — the part of the web the search engines gave up on.
 *
 * Two hosts, both mirrors, both in Chinese, both several hops from anything
 * anybody would defend. They are where the photographs end up after the
 * forums delete them and the news site stops carrying them: somebody in a
 * different country scrapes the thread, runs it through machine
 * translation, wraps it in a 2004 table layout, and sells advertising
 * against it. That is genuinely how this material travels.
 *
 * WHY THEY EXIST MECHANICALLY:
 *
 *   1. They are the only place some of the images survive past the day the
 *      forums scrub them, so a player who has been paying attention has a
 *      reason to be here that is not curiosity.
 *   2. They carry THE RED LINK. Everywhere else in the game the bait comes
 *      to the player, in the mail, and the player only has to not click.
 *      Here the player has to go and find it, and what they find is not a
 *      document — it is an address. Handing over an address is the one
 *      thing in the game that reaches back out of the screen.
 *
 * THE RULE FOR THIS FILE: nothing here is ever validated. No page confirms
 * that the sites are connected to anything. They are two bad websites, and
 * they stay two bad websites, and the only thing that ever happens as a
 * result of visiting them is that mail arrives.
 */

import { h } from '../index.js';
import state, { save } from '../../state.js';
import audio from '../../audio.js';
import IMG from '../imagery.js';

export const HOSTS = {
  jiance: 'www.wlaq-jiance.com.cn',
  pan:    'pan.7yue-tan.net',
};

/** The address the red link hands over. It is a real mailbox in the game. */
export const CONTACT = 'zw@wlaq-jiance.com.cn';

/* ------------------------------------------------------------------ */
/* the furniture every page on both sites carries                      */
/* ------------------------------------------------------------------ */

/**
 * A visitor counter. It is a seven-digit odometer, it has been running
 * since 2006, and it does not increment while you watch — which is the
 * detail that makes it a counter rather than a graphic. It ticks once per
 * in-game day, and the player will not notice that for a week.
 */
function counter(seed) {
  const n = (seed + state.day * 3) % 10000000;
  const s = String(1284000 + n).padStart(7, '0');
  return h('span', { class: 'sk-count' },
    ...s.split('').map(d => h('i', {}, d)));
}

/** The ad that every page of this kind has had since about 2009. */
function adBar(which) {
  const ADS = [
    ['【推荐】海外服务器 不限内容 秒开', '$4.9/月'],
    ['一元夺宝 · 天天开奖 · 立即注册', '点击进入'],
    ['最新影视资源 无广告 高清在线', '免费观看'],
    ['网络安全检测工具包 v11.3 破解版', '下载'],
  ];
  const [text, cta] = ADS[which % ADS.length];
  return h('div', { class: 'sk-ad' },
    h('span', { class: 'sk-ad-t' }, text),
    h('span', { class: 'sk-ad-c' }, cta));
}

/**
 * The page furniture: a banner, a nav strip, and the ICP filing number in
 * the footer. The filing number is for a company that makes doors.
 */
function chrome(host, nav, body) {
  const page = h('div', { class: 'sketchy' });
  page.appendChild(h('div', { class: 'sk-banner' },
    h('div', { class: 'sk-logo' }, host === HOSTS.jiance ? '网络安全检测中心' : '七月潭 · 网盘'),
    h('div', { class: 'sk-sub' }, host === HOSTS.jiance
      ? 'NETWORK SAFETY INSPECTION CENTRE — 境外事件观察'
      : 'FILE SHARING · 文件分享 · 无需注册')));

  const N = (path) => nav.href(host === HOSTS.jiance ? 'jiance' : 'pan', path);
  page.appendChild(h('div', { class: 'sk-nav' },
    h('a', { href: '#', onclick: (e) => { e.preventDefault(); nav.go(N('/')); } }, '首页'),
    h('a', { href: '#', onclick: (e) => { e.preventDefault(); nav.go(N('/tw/')); } }, '图文'),
    h('a', { href: '#', onclick: (e) => { e.preventDefault(); nav.go(N('/xz/')); } }, '下载'),
    h('a', { href: '#', onclick: (e) => { e.preventDefault(); nav.go(N('/gy/')); } }, '关于'),
    // §4.1. Every link navigates. This one navigates to a 404, which is a
    // real destination and an honest one — the page is gone.
    h('a', { href: '#', onclick: (e) => { e.preventDefault(); nav.go(N('/luntan/')); } }, '论坛')));

  page.appendChild(body);

  page.appendChild(h('div', { class: 'sk-foot' },
    h('div', {}, '访问量 ', counter(host === HOSTS.jiance ? 41 : 907), ' 人次'),
    h('div', {}, 'Copyright © 2006-2019  本站所有内容均来自互联网，如有侵权请联系删除。'),
    h('div', {}, '粤ICP备09' + (host === HOSTS.jiance ? '118742' : '204471') + '号-3')));
  return page;
}

/* ------------------------------------------------------------------ */
/* THE RED LINK                                                        */
/*                                                                     */
/* It is red because every link on both of these sites is red — the    */
/* stylesheet sets a:link to #cc0000 and always has. That is the whole */
/* trick, and it is not a trick: the game never colours a link to warn */
/* the player, so the one red link that matters is red for the same    */
/* boring reason as the fourteen that do not.                          */
/* ------------------------------------------------------------------ */

/**
 * What the contact link does. It does not navigate and it does not open a
 * mail composer — it reveals an address, and two hours later mail arrives.
 *
 * The player gave nothing away. They did not type anything, they did not
 * submit a form, they clicked a link on a website. That is the point.
 */
function contactLink(ui) {
  const wrap = h('div', { class: 'sk-contact' });
  const show = () => {
    wrap.textContent = '';
    wrap.appendChild(h('div', { class: 'sk-mailto' },
      '站长信箱 / webmaster: ',
      h('b', {}, CONTACT)));
    wrap.appendChild(h('div', { class: 'sk-note' },
      '（本站不回复任何来信。请勿重复发送。）'));
    if (!state.flags.redLink) {
      state.flags.redLink = true;
      state.flags.redLinkDay = state.day;
      save();
      audio.play('menu_select');
      // No stinger, no cut, no flash. A website did what websites do.
      if (ui && ui.say) ui.say('The page expanded.', 2600);
    }
  };
  if (state.flags.redLink) { show(); return wrap; }
  wrap.appendChild(h('a', {
    class: 'sk-red', href: '#',
    onclick: (e) => { e.preventDefault(); show(); },
  }, '联系站长 / CONTACT WEBMASTER'));
  return wrap;
}

/* ------------------------------------------------------------------ */
/* pages                                                               */
/* ------------------------------------------------------------------ */

/** The mirrored photographs, with captions that have been through a machine. */
const MIRRORED = [
  { kind: 'crawler',   zh: '美国弗吉尼亚州 诺福克市 街道拍摄 多足生物',
    en: 'Norfolk, Virginia, USA — street photograph — many-legged organism',
    mt: 'The United States Virginia state Norfolk city street shoot many foot creature',
    day: 3 },
  { kind: 'tormentor', zh: '同一地区 夜间 高大个体 路灯下',
    en: 'Same district — night — tall individual under a streetlight',
    mt: 'Same one region night tall individual under road lamp', day: 6 },
  { kind: 'gleaner',   zh: '白天 三个 人行道 未确认',
    en: 'Daytime — three — pavement — unconfirmed',
    mt: 'Daytime three sidewalk not yet confirm', day: 9 },
  { kind: 'incursion', zh: '室内 走廊 闪光灯 手部特写',
    en: 'Indoors — corridor — flash — close view of the hand',
    mt: 'Indoor corridor flash light hand part special写', day: 12 },
  { kind: 'anguish',   zh: '标本 编号四 完整 来源不明',
    en: 'Specimen — number four — intact — provenance unknown',
    mt: 'Sample number four complete origin not clear', day: 15 },
];

function renderHome(host, nav, ui) {
  const b = h('div', { class: 'sk-body' });
  b.appendChild(adBar(state.day));

  b.appendChild(h('div', { class: 'sk-marq' },
    h('span', {},
      '★ 本站于 2019 年恢复更新 ★ 境外来源 未经核实 ★ 请勿转载至境内平台 ★ ' +
      '★ 站长在线时间 03:00-05:00 ★')));

  b.appendChild(h('h2', { class: 'sk-h' }, '最新图文 / LATEST'));
  const list = h('div', { class: 'sk-list' });
  b.appendChild(list);
  const avail = MIRRORED.filter(m => m.day <= state.day);
  for (const m of avail) {
    list.appendChild(h('div', { class: 'sk-item' },
      h('a', {
        href: '#',
        onclick: (e) => { e.preventDefault(); nav.go(nav.href('jiance', '/tw/' + m.kind)); },
      }, m.zh),
      h('span', { class: 'sk-date' },
        `2019-11-${String(m.day + 3).padStart(2, '0')}`)));
  }
  if (!avail.length) {
    list.appendChild(h('div', { class: 'sk-item' },
      h('span', { style: 'color:#777' }, '暂无内容')));
  }

  /* The mojibake block. The page declares GB2312 in a meta tag and is being
   * served as UTF-8, so exactly one block — the one pasted in from a
   * different editor — comes through as garbage. It is the only genuinely
   * broken thing on the site and it is broken in the way real pages are. */
  b.appendChild(h('div', { class: 'sk-moji' },
    'ç½‘ç«™å…¬å‘Šï¼šæœ¬ç«™ä¸å†æ›´æ–°å›½å†…å†…å®¹ã€‚'));

  b.appendChild(adBar(state.day + 2));
  b.appendChild(h('h2', { class: 'sk-h' }, '关于本站 / ABOUT'));
  b.appendChild(h('p', { class: 'sk-p' },
    '本站为网络安全爱好者交流平台，所有资料均转载自公开渠道，仅供研究使用。'));
  b.appendChild(h('p', { class: 'sk-p sk-mt' },
    'This station is the network safety enthusiast exchange platform, all ' +
    'materials are reproduced from the open channel, only supplies the ' +
    'research use.'));
  b.appendChild(contactLink(ui));
  return b;
}

function renderPhoto(host, nav, ui, kind) {
  const m = MIRRORED.find(x => x.kind === kind);
  const b = h('div', { class: 'sk-body' });
  if (!m || m.day > state.day) {
    b.appendChild(h('div', { class: 'sk-gone' },
      h('div', {}, '该内容已被删除或不存在。'),
      h('div', { class: 'sk-mt' }, 'The content has been deleted or does not exist.')));
    return b;
  }
  b.appendChild(adBar(state.day + 1));
  b.appendChild(h('h2', { class: 'sk-h' }, m.zh));
  b.appendChild(h('div', { class: 'sk-shot' },
    h('img', { src: IMG.phoneSnap(kind), alt: m.en })));
  b.appendChild(h('div', { class: 'sk-cap' },
    h('div', { class: 'sk-mt-lb' }, '机器翻译 / machine translation:'),
    h('div', { class: 'sk-mt' }, m.mt)));
  b.appendChild(h('p', { class: 'sk-p' },
    '来源：境外论坛。原帖已删除。本站保留镜像。'));
  b.appendChild(h('p', { class: 'sk-p sk-mt' },
    'Source: overseas forum. The original posting already deleted. This ' +
    'station retains the mirror image.'));
  b.appendChild(h('div', { class: 'sk-links' },
    h('a', {
      href: '#',
      onclick: (e) => { e.preventDefault(); nav.go(nav.href('pan', '/f/' + kind)); },
    }, '下载原图 (RAR)'),
    h('a', {
      href: '#', onclick: (e) => { e.preventDefault(); nav.go(nav.href('jiance', '/')); },
    }, '返回首页')));
  b.appendChild(contactLink(ui));
  return b;
}

function renderDownloads(host, nav, ui) {
  const b = h('div', { class: 'sk-body' });
  b.appendChild(adBar(state.day + 3));
  b.appendChild(h('h2', { class: 'sk-h' }, '下载 / DOWNLOADS'));
  const t = h('table', { class: 'sk-tbl' });
  b.appendChild(t);
  t.appendChild(h('tr', {},
    h('th', {}, '文件名'), h('th', {}, '大小'), h('th', {}, '提取码')));
  const rows = [
    ['norfolk_2019_全部图片.rar', '184 MB', 'a4k9'],
    ['CF文件_扫描件_1991-2019.rar', '2.1 GB', 'm2xx'],
    ['录音_未整理.zip', '41 MB', '——'],
    ['勿传.rar', '7 KB', '——'],
  ];
  for (const [n, s, c] of rows) {
    t.appendChild(h('tr', {},
      h('td', {}, h('a', {
        href: '#',
        onclick: (e) => { e.preventDefault(); nav.go(nav.href('pan', '/f/' + encodeURIComponent(n))); },
      }, n)),
      h('td', {}, s), h('td', {}, c)));
  }
  b.appendChild(h('p', { class: 'sk-p sk-mt' },
    'The extraction code please the contact station elder brother.'));
  b.appendChild(contactLink(ui));
  return b;
}

function renderPan(host, nav, ui, file) {
  const b = h('div', { class: 'sk-body' });
  b.appendChild(adBar(state.day));
  b.appendChild(h('h2', { class: 'sk-h' }, file ? decodeURIComponent(file) : '七月潭网盘'));
  /* Every download on this host is dead, and it is dead in the specific way
   * a Chinese file host is dead: the file is there, the link resolves, and
   * the download requires a client you are not going to install. */
  b.appendChild(h('div', { class: 'sk-pan' },
    h('div', { class: 'sk-pan-row' }, '状态：', h('b', {}, '正常')),
    h('div', { class: 'sk-pan-row' }, '有效期：', h('b', {}, '永久')),
    h('div', { class: 'sk-pan-row' }, '下载方式：', h('b', {}, '需安装客户端')),
    h('button', { class: 'sk-pan-btn', type: 'button',
      onclick: () => { audio.play('menu_move'); if (ui && ui.say) ui.say('Nothing happened.', 2400); },
    }, '下载 (需客户端)')));
  b.appendChild(h('p', { class: 'sk-p sk-mt' },
    'Downloading needs the client end. The client end no longer provides ' +
    'the downloading.'));
  b.appendChild(contactLink(ui));
  return b;
}

function renderAbout(host, nav, ui) {
  const b = h('div', { class: 'sk-body' });
  b.appendChild(h('h2', { class: 'sk-h' }, '关于 / ABOUT'));
  b.appendChild(h('p', { class: 'sk-p' },
    '本站成立于二〇〇六年，站长一人维护。不接受采访，不接受合作，不接受删稿请求。'));
  b.appendChild(h('p', { class: 'sk-p sk-mt' },
    'This station was established in 2006 and is maintained by one person. ' +
    'No interviews, no cooperation, no takedown requests.'));
  /* The one sentence on either site that is not machine-translated, and
   * therefore the one sentence a person wrote. It is not a threat and it is
   * not an explanation, and it is by some distance the worst thing on the
   * site. */
  b.appendChild(h('p', { class: 'sk-p sk-hand' },
    '我们已经看过了。你们那边比较晚。'));
  b.appendChild(h('p', { class: 'sk-p sk-mt' },
    'We have already watched it. Over there at your side is comparatively late.'));
  b.appendChild(contactLink(ui));
  return b;
}

/* ------------------------------------------------------------------ */

export function titleFor(loc) {
  if (loc.host === HOSTS.pan) return '七月潭网盘 — pan.7yue-tan.net';
  if (loc.path.startsWith('/tw/')) return '图文 — 网络安全检测中心';
  if (loc.path.startsWith('/xz/')) return '下载 — 网络安全检测中心';
  if (loc.path.startsWith('/gy/')) return '关于 — 网络安全检测中心';
  return '网络安全检测中心';
}

export function render(host, loc, nav, ui) {
  const H = loc.host;
  let body;
  if (H === HOSTS.pan) {
    const m = loc.path.match(/^\/f\/(.+)$/);
    body = renderPan(H, nav, ui, m ? m[1] : null);
  } else if (loc.path.startsWith('/tw/')) {
    body = renderPhoto(H, nav, ui, loc.path.slice(4));
  } else if (loc.path.startsWith('/xz')) {
    body = renderDownloads(H, nav, ui);
  } else if (loc.path.startsWith('/gy')) {
    body = renderAbout(H, nav, ui);
  } else if (loc.path.startsWith('/luntan')) {
    // An honest 404, in the site's own voice.
    body = h('div', { class: 'sk-body' },
      h('div', { class: 'sk-gone' },
        h('div', {}, '404 — 论坛已于 2017 年关闭。'),
        h('div', { class: 'sk-mt' }, 'The forum already closed in 2017.')));
  } else {
    body = renderHome(H, nav, ui);
  }
  host.appendChild(chrome(H, nav, body));
}
