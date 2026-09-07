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
  editor: '[role="textbox"][contenteditable="true"][data-slate-editor="true"], [role="textbox"][contenteditable="true"]',
  form: 'form, [class*="form_"]',
  header: 'section[aria-label][class*="title_"], [class*="title_"][class*="container_"]',
  members: '[class*="membersWrap_"]',
  attachment: '[class*="imageWrapper_"], [class*="imageContainer_"]',
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

export class DiscordAdapter {
  constructor(private doc: Document = document) {}

  discover(): Surface | null {
    const root = queryNative<HTMLElement>(this.doc, selectors.root);
    if (!root) return null;
    const guilds = queryNative<HTMLElement>(root, selectors.guilds);
    const sidebar = queryNative<HTMLElement>(root, selectors.sidebar);
    const list = queryNative<HTMLElement>(root, selectors.list);
    const chat = queryNative<HTMLElement>(root, selectors.chat)
      ?? list?.closest<HTMLElement>('main, [role="main"], [class*="chatContent_"]')
      ?? queryNative<HTMLElement>(root, '[class*="peopleColumn_"], [class*="tabBody_"]');
    if (!guilds || !sidebar || !chat) return null;
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
      const rawLabel = source.getAttribute('aria-label') || source.getAttribute('title')
        || source.querySelector('img')?.getAttribute('alt') || source.textContent?.trim() || '서버';
      const container = source.closest('[class*="listItem_"]') ?? source;
      tabs.push({
        key, label: isHome ? '개인 메시지' : rawLabel,
        selected: isHome ? server === '@me' : key === server,
        unread: /unread|읽지 않|멘션|mention/i.test(rawLabel)
          || Boolean(container.querySelector('[class*="unread_"], [class*="numberBadge_"]')),
        folder, source,
      });
    }
    // Home is always the first sheet; the caller adds a regular link if Discord omitted it.
    return [...tabs.filter(tab => tab.key === '@me'), ...tabs.filter(tab => tab.key !== '@me')];
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
    return rows.filter(row => !row.parentElement?.closest(selectors.row));
  }

  focusSearch(): boolean {
    const search = queryNative<HTMLElement>(this.doc, selectors.search);
    if (!search) return false;
    search.focus();
    search.click();
    return true;
  }
}
