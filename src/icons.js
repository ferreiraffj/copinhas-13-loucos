const paths = {
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m5 5h-2"/>',
  pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/><circle cx="9" cy="7" r="4"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4m-4 4v2"/>',
  shield: '<path d="M12 22s7-3.5 7-10V5l-7-3-7 3v7c0 6.5 7 10 7 10Z"/><path d="m9 12 2 2 4-4"/>',
  note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8m-8 4h8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  refresh: '<path d="M19 10a7 7 0 1 0-1 7m1-12v5h-5"/>',
}
export const icon = name => `<svg class="icon" aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`
export const google = '<svg aria-hidden="true" class="icon" width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5a13.3 13.3 0 0 1 9.4 3.7l7-7A23.5 23.5 0 0 0 24 0 24 24 0 0 0 2.6 13.2l8.1 6.3A14 14 0 0 1 24 9.5Z"/><path fill="#4285F4" d="M47 24.5c0-1.5-.1-3-.4-4.5H24v9h12.9a11 11 0 0 1-4.8 7.2l7.7 6A23.4 23.4 0 0 0 47 24.5Z"/><path fill="#FBBC05" d="M10.7 28.5a14.4 14.4 0 0 1 0-9l-8.1-6.3a24 24 0 0 0 0 21.6Z"/><path fill="#34A853" d="M24 48c6.5 0 12-2.1 15.8-5.8l-7.7-6a14.6 14.6 0 0 1-21.4-7.7l-8.1 6.3A24 24 0 0 0 24 48Z"/></svg>'
