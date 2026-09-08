import { allNative, queryNative } from './dom';

// Discord does not publish a DOM contract. Keep volatile class-name fallbacks here.
// Semantic attributes are preferred; no React internals, tokens, or network interception.
export const selectors = {
  root: '#app-mount',
  guilds: '[data-list-id="guildsnav"], nav[class*="guilds_"]',
  guildItem: '[data-list-item-id^="guildsnav___"]',
  sidebar: '[class*="sidebarList_"], nav[aria-label="Channels"], nav[aria-label="채널"], [class*="privateChannels_"]',
  chat: 'main[class*="chatContent_"], [role="main"][class*="chatContent_"]',
  list: '[data-list-id="chat-messages"]',
  row: 'li[id^="chat-messages-"], [data-list-item-id^="chat-messages___"]',
  content: '[id^="message-content-"]',
  author: '[id^="message-username-"], [class*="username_"]',
  avatar: '[class*="avatar_"], [class*="avatarWrapper_"], [class*="avatarContainer_"], [class*="replyAvatar_"], [class*="embedAuthorIcon_"], [class*="embedFooterIcon_"], img[src*="/avatars/"], img[src*="/embed/avatars/"]',
  editor: '[role="textbox"][contenteditable="true"][data-slate-editor="true"], [role="textbox"][contenteditable="true"]',
  form: 'form, [class*="form_"]',
  header: 'section[aria-label][class*="title_"], [class*="title_"][class*="container_"]',
  members: '[class*="membersWrap_"]',
  attachment: '[class*="imageWrapper_"], [class*="imageContainer_"], [class*="embedImage_"], [class*="embedThumbnail_"]',
  mediaLeaf: 'img, video, canvas, [class*="stickerAsset_"]',
  mediaLayout: '[class*="mosaic"], [class*="accessories_"], [class*="stickerContainer_"], [class*="stickerWrapper_"], [class*="attachmentContainer_"], [class*="mediaContainer_"]',
  expressionPicker: '#emoji-picker-tab-panel, #sticker-picker-tab-panel, #gif-picker-tab-panel, [class*="emojiPicker_"], [class*="stickerPicker_"], [class*="gifPicker_"]',
  expressionItem: '[class*="emojiItem_"], [class*="sticker_"][role="button"], [class*="stickerNode_"], [class*="stickerAsset_"], [class*="result_"], [role="gridcell"], button:has(img, video, canvas), [role="button"]:has(img, video, canvas)',
  reaction: '[class*="reaction_"][role="button"], button[class*="reaction_"], [class*="reaction_"]',
  search: '[role="searchbox"], [contenteditable="true"][data-slate-editor="true"][aria-label*="검색"], [class*="searchBar_"] [contenteditable="true"], [class*="searchBar_"] input',
};

export interface Surface {
  root: HTMLElement;
  guilds: HTMLElement;
  sidebar: HTMLElement;
  chat: HTMLElement;
  list: HTMLElement | null;
  editor: HTMLElement | null;
  form: HTMLElement | null;
  header: HTMLElement | null;
  members: HTMLElement[];
}

export interface GuildTab {
  key: string;
  label: string;
  selected: boolean;
  unread: boolean;
  folder: boolean;
  source: HTMLElement;
}

export interface ChannelEntry { key: string; label: string; selected: boolean; source: HTMLElement }

// A nonempty attribute may still be visually blank (spaces, zero-width characters).
// Keep ZWJ/ZWNJ intact: they are meaningful in emoji sequences and some scripts.
function cleanLabel(value: string | null | undefined): string {
  return (value ?? '').replace(/[\u200B\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
}

export function accessibleLabel(element: Element): string {
  const referenced = (element.getAttribute('aria-labelledby') ?? '').split(/\s+/)
    .filter(Boolean).map(id => cleanLabel(element.ownerDocument.getElementById(id)?.textContent)).filter(Boolean).join(' ');
  return referenced || cleanLabel(element.getAttribute('aria-label')) || cleanLabel(element.getAttribute('title'));
}

/** Read names already exposed by the page; never derive labels from signed media URLs. */
export function expressionName(element: Element, fallback: string): string {
  const direct = cleanLabel(element.getAttribute('data-name')) || accessibleLabel(element);
  if (direct) return direct;
  for (const child of [element, ...element.querySelectorAll('[data-name], [alt], [aria-label], [aria-labelledby], [title]')]) {
    const name = cleanLabel(child.getAttribute('data-name')) || accessibleLabel(child) || cleanLabel(child.getAttribute('alt'));
    if (name) return name;
  }
  const nativeText = [...element.childNodes].filter(node => !(node instanceof Element && node.hasAttribute('data-sc-owned')))
    .map(node => node.textContent).join(' ');
  return cleanLabel(nativeText) || fallback;
}

function guildLabel(source: HTMLElement): string {
  const semanticText = [...source.querySelectorAll('[class*="hiddenVisually_"]')]
    .map(node => cleanLabel(node.textContent)).filter(label => label && !/^(읽지 않은 메시지|unread messages?|멘션 \d+)$/i.test(label));
  if (semanticText.length) return semanticText.join(' ');
  const direct = accessibleLabel(source);
  if (direct) return direct;
  for (const child of allNative(source, '[aria-labelledby], [aria-label], [title], img[alt]')) {
    const label = accessibleLabel(child) || cleanLabel(child.getAttribute('alt'));
    if (label) return label;
  }
  return cleanLabel(source.textContent);
}

export class DiscordAdapter {
  constructor(private doc: Document = document) {}

  discover(): Surface | null {
    const root = queryNative<HTMLElement>(this.doc, selectors.root);
    if (!root) return null;
    const guilds = queryNative<HTMLElement>(root, selectors.guilds);
    const sidebarList = queryNative<HTMLElement>(root, selectors.sidebar);
    const list = queryNative<HTMLElement>(root, selectors.list);
    const chat = queryNative<HTMLElement>(root, selectors.chat)
      ?? list?.closest<HTMLElement>('main, [role="main"], [class*="chatContent_"]')
      ?? queryNative<HTMLElement>(root, '[class*="peopleColumn_"], [class*="tabBody_"], main, [role="main"], [class*="applicationStore_"], [class*="shop_"], [class*="questHome_"]')
      ?? queryNative<HTMLElement>(root, '[class*="page_"]');
    if (!guilds || !sidebarList || !chat) return null;
    // Discord can place navigation and the account panel inside a separate sidebar.
    // Style that column too, but never expand the scope into guilds or the chat pane.
    const sidebarColumn = sidebarList.closest<HTMLElement>('[class*="sidebar_"]');
    const sidebar = sidebarColumn && !sidebarColumn.contains(chat) && !sidebarColumn.contains(guilds)
      ? sidebarColumn : sidebarList;
    const form = allNative<HTMLElement>(chat, selectors.form).find(element => !element.closest(selectors.row)) ?? null;
    const editor = form ? queryNative<HTMLElement>(form, selectors.editor) : null;
    const chatContainer = chat.closest<HTMLElement>('[class*="chat_"]') ?? chat.parentElement ?? chat;
    return {
      root, guilds, sidebar, chat, list, editor, form,
      header: queryNative<HTMLElement>(chatContainer, selectors.header),
      members: allNative<HTMLElement>(root, selectors.members),
    };
  }

  tabs(surface: Surface): GuildTab[] {
    const pathname = this.doc.defaultView?.location.pathname ?? '';
    const server = pathname.split('/')[2] ?? '@me';
    const elements = allNative<HTMLElement>(surface.guilds, selectors.guildItem);
    const tabs: GuildTab[] = [];
    const seen = new Set<string>();
    for (const source of elements) {
      const id = source.getAttribute('data-list-item-id')!.replace('guildsnav___', '');
      const isHome = /^(home|@me)$/.test(id) || source.getAttribute('href') === '/channels/@me';
      const folder = id.includes('folder');
      if (!isHome && !folder && !/^\d+$/.test(id)) continue;
      const key = isHome ? '@me' : id;
      if (seen.has(key)) continue;
      seen.add(key);
      const rawLabel = guildLabel(source);
      const label = rawLabel.replace(/^(?:읽지 않은 메시지|unread messages?)\s*,\s*/i, '') || `${folder ? '서버 폴더' : '서버'} (${key})`;
      const container = source.closest('[class*="listItem_"]') ?? source;
      tabs.push({
        key, label: isHome ? '개인 메시지' : label,
        selected: isHome ? server === '@me' : key === server,
        unread: /unread|읽지 않|멘션|mention/i.test(rawLabel)
          || Boolean(container.querySelector('[class*="unread_"], [class*="numberBadge_"]')),
        folder, source,
      });
    }
    // Home is always the first sheet; the caller adds a regular link if Discord omitted it.
    return [...tabs.filter(tab => tab.key === '@me'), ...tabs.filter(tab => tab.key !== '@me')];
  }

  channels(surface: Surface): ChannelEntry[] {
    const seen = new Set<string>();
    return allNative<HTMLAnchorElement>(surface.sidebar, 'a[href^="/channels/"]').flatMap(source => {
      const key = source.getAttribute('href')!;
      if (!/^\/channels\/[^/]+\/[^/]+$/.test(key) || seen.has(key)) return [];
      seen.add(key);
      const label = cleanLabel(source.querySelector('[class*="name_"], [class*="channelName_"]')?.textContent)
        || accessibleLabel(source) || cleanLabel(source.textContent);
      return label ? [{ key, label, selected: key === this.doc.defaultView?.location.pathname, source }] : [];
    });
  }

  channelLabel(surface: Surface): string {
    const selected = queryNative<HTMLElement>(surface.sidebar, '[aria-current="page"], [aria-selected="true"], [class*="selected_"] a[href^="/channels/"]');
    return (selected?.querySelector('[class*="name_"], [class*="channelName_"]')?.textContent ?? selected?.textContent)?.trim().replace(/\s+/g, ' ')
      || surface.header?.querySelector('h1, h2, [class*="title_"]')?.textContent?.trim()
      || (location.pathname === '/channels/@me' ? '개인 메시지' : '대화');
  }

  rows(surface: Surface): HTMLElement[] {
    if (!surface.list) return [];
    const rows = allNative<HTMLElement>(surface.list, selectors.row);
    return rows.filter(row => !row.matches('[role="separator"], [class*="divider_"]') && !row.parentElement?.closest(selectors.row));
  }

  emojiLabels(surface: Surface): HTMLElement[] {
    return allNative<HTMLElement>(surface.sidebar, 'a[href^="/channels/"] [class*="name_"], a[href^="/channels/"] [class*="channelName_"]');
  }

  focusSearch(): boolean {
    const search = queryNative<HTMLElement>(this.doc, selectors.search);
    if (!search) return false;
    search.focus();
    search.click();
    return true;
  }
}
