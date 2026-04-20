;(function () {
  'use strict'

  var AI_SOURCES = {
    'chat.openai.com': 'ChatGPT',
    'chatgpt.com': 'ChatGPT',
    'gemini.google.com': 'Gemini',
    'bard.google.com': 'Gemini',
    'perplexity.ai': 'Perplexity',
    'claude.ai': 'Claude',
    'copilot.microsoft.com': 'Copilot',
    'bing.com': 'Copilot',
    'you.com': 'You.com',
    'phind.com': 'Phind',
  }

  var UA_PATTERNS = [
    { pattern: /ChatGPT/i, source: 'ChatGPT' },
    { pattern: /Gemini/i, source: 'Gemini' },
    { pattern: /Perplexity/i, source: 'Perplexity' },
    { pattern: /Claude/i, source: 'Claude' },
    { pattern: /Copilot/i, source: 'Copilot' },
  ]

  function detectSource() {
    var referrer = document.referrer || ''
    var ua = navigator.userAgent || ''

    // Check referrer hostname
    if (referrer) {
      try {
        var hostname = new URL(referrer).hostname.replace(/^www\./, '')
        for (var key in AI_SOURCES) {
          if (hostname === key || hostname.endsWith('.' + key)) {
            return AI_SOURCES[key]
          }
        }
      } catch (e) { /* ignore invalid referrer */ }
    }

    // Fallback: user-agent patterns
    for (var i = 0; i < UA_PATTERNS.length; i++) {
      if (UA_PATTERNS[i].pattern.test(ua)) {
        return UA_PATTERNS[i].source
      }
    }

    return null
  }

  function getApiBase() {
    var scripts = document.querySelectorAll('script[data-tenant-id]')
    // find this script's own tag
    for (var i = 0; i < scripts.length; i++) {
      var s = scripts[i]
      if (s.src && s.src.indexOf('orffia.js') !== -1) {
        return s.getAttribute('data-api-url') || ''
      }
    }
    return ''
  }

  function run() {
    var script = document.querySelector('script[data-tenant-id]')
    if (!script) return

    var tenantId = script.getAttribute('data-tenant-id')
    if (!tenantId) return

    var source = detectSource()
    if (!source) return

    var apiBase = script.getAttribute('data-api-url') || ''
    var endpoint = apiBase + '/api/v1/geo/track'

    var payload = JSON.stringify({
      tenantId: tenantId,
      source: source,
      page: window.location.href,
      timestamp: new Date().toISOString(),
    })

    // Use sendBeacon when available, fallback to fetch
    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon(endpoint, blob)
    } else if (typeof fetch !== 'undefined') {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(function () { /* silent */ })
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run)
  } else {
    run()
  }
})()
