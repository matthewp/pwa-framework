import { h, Component, cloneElement } from 'preact';

const DOMAttributeNames = {
  acceptCharset: 'accept-charset',
  className: 'class',
  htmlFor: 'for',
  httpEquiv: 'http-equiv'
}

const browser = typeof window !== 'undefined'
let mounted = []

function reducer(components) {
  return components
  .map(c => c.children)
  .filter((c) => !!c)
  .reduce((a, b) => a.concat(b), [])
  .reverse()
  .filter(unique())
  .reverse()
  .map((c) => {
    const className = (c.className ? c.className + ' ' : '') + 'fwk-head'
    return cloneElement(c, { className })
  })
}

function updateClient (head) {
  const tags = {}
  head.forEach((h) => {
    const components = tags[h.type] || []
    components.push(h)
    tags[h.type] = components
  })

  updateTitle(tags.title ? tags.title[0] : null)

  const types = ['meta', 'base', 'link', 'style', 'script']
  types.forEach((type) => {
    updateElements(type, tags[type] || [])
  })
}

function updateElements (type, components) {
  const headEl = document.getElementsByTagName('head')[0]
  const oldTags = Array.prototype.slice.call(headEl.querySelectorAll(type + '.fwk-head'))
  const newTags = components.map(domify).filter((newTag) => {
    for (let i = 0, len = oldTags.length; i < len; i++) {
      const oldTag = oldTags[i]
      if (oldTag.isEqualNode(newTag)) {
        oldTags.splice(i, 1)
        return false
      }
    }
    return true
  })
  
  oldTags.forEach((t) => t.parentNode.removeChild(t))
  newTags.forEach((t) => headEl.appendChild(t))
}

function domify (component) {
  const el = document.createElement(component.type)
  const attrs = component.props || {}
  const children = attrs.children
  
  for (const p in attrs) {
    if (!attrs.hasOwnProperty(p)) continue
    if (p === 'dangerouslySetInnerHTML') continue

    const attr = DOMAttributeNames[p] || p.toLowerCase()
    el.setAttribute(attr, attrs[p])
  }

  if (attrs['dangerouslySetInnerHTML']) {
    el.innerHTML = attrs['dangerouslySetInnerHTML'].__html || ''
  } else if (children) {
    el.textContent = typeof children === 'string' ? children : children.join('')
  }

  return el
}

const METATYPES = ['name', 'httpEquiv', 'charSet', 'itemProp']

// returns a function for filtering head child elements
// which shouldn't be duplicated, like <title/>.
function unique () {
  const tags = []
  const metaTypes = []
  const metaCategories = {}
  return (h) => {
    switch (h.type) {
      case 'title':
      case 'base':
        if (~tags.indexOf(h.type)) return false
        tags.push(h.type)
        break
      case 'meta':
        for (let i = 0, len = METATYPES.length; i < len; i++) {
          const metatype = METATYPES[i]
          if (!h.props.hasOwnProperty(metatype)) continue
          if (metatype === 'charSet') {
            if (~metaTypes.indexOf(metatype)) return false
            metaTypes.push(metatype)
          } else {
            const category = h.props[metatype]
            const categories = metaCategories[metatype] || []
            if (~categories.indexOf(category)) return false
            categories.push(category)
            metaCategories[metatype] = categories
          }
        }
        break
    }
    return true
  }
}

function updateTitle (component) {
  let title
    if (component) {
      const { children } = component.props
      title = typeof children === 'string' ? children : children.join('')
    } else {
      title = ''
    }
    if (title !== document.title) {
      document.title = title
    }
}

function update() {
  const state = reducer(mounted.map(mount => mount.props))
  if (browser) updateClient(state)
}

export class Head extends Component {
  static rewind () {
    const state = reducer(mounted.map(mount => mount.props))
    mounted = []
    return state
  }

  componentDidUpdate() {
    update()
  }
  
  componentWillMount() {
    mounted.push(this)
    update()
  }
  
  componentWillUnmount() {
    const i = mounted.indexOf(this)
    if (~i) mounted.splice(i, 1)
    update()
  }

  render() {
    return null
  }
}