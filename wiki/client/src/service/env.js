const VERSION = '0.06'
const VARIANT = { development: 'development', production: 'production' }

const mode = /localhost/.test(window.location.href) ? VARIANT.development : VARIANT.production
const backendUrl = mode === VARIANT.development ? 'http://localhost:4000' : 'https://wiki.4dates.net'

export { VERSION, mode, backendUrl }
