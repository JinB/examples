const CACHE_SIZE = 20
const PAGES = 'pages'
const LIST = 'list'

const storage = {}
storage[PAGES] = new Map()
storage[LIST] = new Map()
const actions = {
    store(type, id, body) {
        if (storage[type].size > CACHE_SIZE) {
            const firstKey = Array.from(storage[type].keys())[0]
            storage[type].delete(firstKey)
        }
        if (storage[type].has(id)) {
            storage[type].delete(id)
        }
        storage[type].set(id, body)
    },
    dump(type) {
        return Array.from(storage[type].keys()).join(', ')
    },
}
module.exports = { storage, actions, PAGES, LIST }
