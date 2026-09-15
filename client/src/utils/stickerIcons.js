import twemoji from 'twemoji'

const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg'

export const getTwemojiUrl = (emoji) =>
  `${TWEMOJI_BASE}/${twemoji.convert.toCodePoint(emoji).replace(/-fe0f$/, '')}.svg`

export const getFluentUrl = (slug) => `https://api.iconify.design/fluent-emoji-flat:${slug}.svg`
