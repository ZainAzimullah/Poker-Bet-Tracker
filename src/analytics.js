import mixpanel from 'mixpanel-browser'

const token = import.meta.env.VITE_MIXPANEL_TOKEN

const DISTINCT_ID_STORAGE_KEY = 'pbt_mixpanel_distinct_id'

function getOrCreateDistinctId() {
  try {
    let id = localStorage.getItem(DISTINCT_ID_STORAGE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(DISTINCT_ID_STORAGE_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

if (token) {
  mixpanel.init(token, {
    persistence: 'localStorage',
    track_pageview: false,
  })
  const distinctId = getOrCreateDistinctId()
  if (distinctId) {
    mixpanel.identify(distinctId)
  }
}

export function track(event, properties = {}) {
  if (!token) return
  const isDeveloper = localStorage.getItem('__developer') === 'true'
  mixpanel.track(event, { ...properties, ...(isDeveloper && { developer: true }) })
}
