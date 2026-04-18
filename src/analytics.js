import mixpanel from 'mixpanel-browser'

const token = import.meta.env.VITE_MIXPANEL_TOKEN

if (token) {
  mixpanel.init(token, { track_pageview: false })
}

export function track(event, properties = {}) {
  if (!token) return
  mixpanel.track(event, properties)
}
