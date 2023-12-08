// @ts-nocheck
// the body of the function is copy-paste from the GTM website, it's JS, not TS

export function initializeGTM(containerId: string, { dataLayerName = "dataLayer" }: { dataLayerName?: string } = {}) {
  //this weird code is a copy-paste from the GTM website
  ;(function (w, d, s, l, i) {
    w[l] = w[l] || []
    w[l].push({
      "gtm.start": new Date().getTime(),
      event: "gtm.js",
    })
    var f = d.getElementsByTagName(s)[0],
      j = d.createElement(s),
      dl = l != "dataLayer" ? "&l=" + l : ""
    j.async = true
    j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl
    f.parentNode.insertBefore(j, f)
  })(window, document, "script", dataLayerName, containerId)
  return window[dataLayerName]
}

export default initializeGTM
