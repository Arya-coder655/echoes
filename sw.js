/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-25ee6505'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "thunder.mp3",
    "revision": "67dc9b2ae9d304542720a2afe6b33444"
  }, {
    "url": "rain.mp3",
    "revision": "c64852b8311545e7a2b790c5e19663dc"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "297a64812f07321f9d51c286a391bcf3"
  }, {
    "url": "pwa-512x512.png",
    "revision": "bc0143862d62c0e572b955593ba17ba9"
  }, {
    "url": "pwa-192x192.png",
    "revision": "3779299837ee0a603198667e3cc59ba0"
  }, {
    "url": "og-banner.png",
    "revision": "a92882470c521eec7597a4e49bb38d3b"
  }, {
    "url": "index.html",
    "revision": "5b1aa73cd57656bf4332224650ad6d04"
  }, {
    "url": "icons.svg",
    "revision": "3b4fcfcf393eca4d264dca4a4663bc37"
  }, {
    "url": "favicon.svg",
    "revision": "7e840862161341271697daa99a40d76b"
  }, {
    "url": "brand-art.jpg",
    "revision": "6a755c469050002a4f346f6e10bf8a6d"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "ac2b58c5dcbbedff3a96e1ba4c5f83a2"
  }, {
    "url": "assets/ZenCinemaModal-B-mp5zUI.js",
    "revision": null
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/WhisperingWellModal-C5vvJLLr.js",
    "revision": null
  }, {
    "url": "assets/users-Ek8PxMj_.js",
    "revision": null
  }, {
    "url": "assets/triangle-alert-C2zQfYOb.js",
    "revision": null
  }, {
    "url": "assets/SoundscapeMixerModal-8w1lImH3.js",
    "revision": null
  }, {
    "url": "assets/shield-check-CNcxPrWF.js",
    "revision": null
  }, {
    "url": "assets/ShareModal-BmEfipuY.js",
    "revision": null
  }, {
    "url": "assets/send-y4qCwo7U.js",
    "revision": null
  }, {
    "url": "assets/ReportModal-BDzkhSHO.js",
    "revision": null
  }, {
    "url": "assets/play-CWeWpV8Y.js",
    "revision": null
  }, {
    "url": "assets/InstallAppModal-DvPT0R9T.js",
    "revision": null
  }, {
    "url": "assets/index-C5ke98CI.css",
    "revision": null
  }, {
    "url": "assets/index-By0jSdiB.js",
    "revision": null
  }, {
    "url": "assets/eye-DXwZRrgH.js",
    "revision": null
  }, {
    "url": "assets/EchoComposer-C8tF48_R.js",
    "revision": null
  }, {
    "url": "assets/download-DKp1LPSc.js",
    "revision": null
  }, {
    "url": "assets/confetti.module-75bydEUS.js",
    "revision": null
  }, {
    "url": "assets/CommentsDrawer-HoU39EAM.js",
    "revision": null
  }, {
    "url": "assets/circle-check-DGtfkQgS.js",
    "revision": null
  }, {
    "url": "assets/CatharsisRitualModal-DJzIup9i.js",
    "revision": null
  }, {
    "url": "assets/BeerEasterEggModal-Dm10FliD.js",
    "revision": null
  }, {
    "url": "assets/AdminDashboardModal-DWQ8Tyh-.js",
    "revision": null
  }, {
    "url": "assets/AboutModal-DozB7s4-.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "ac2b58c5dcbbedff3a96e1ba4c5f83a2"
  }, {
    "url": "brand-art.jpg",
    "revision": "6a755c469050002a4f346f6e10bf8a6d"
  }, {
    "url": "favicon.svg",
    "revision": "7e840862161341271697daa99a40d76b"
  }, {
    "url": "icons.svg",
    "revision": "3b4fcfcf393eca4d264dca4a4663bc37"
  }, {
    "url": "og-banner.png",
    "revision": "a92882470c521eec7597a4e49bb38d3b"
  }, {
    "url": "pwa-192x192.png",
    "revision": "3779299837ee0a603198667e3cc59ba0"
  }, {
    "url": "pwa-512x512.png",
    "revision": "bc0143862d62c0e572b955593ba17ba9"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "297a64812f07321f9d51c286a391bcf3"
  }, {
    "url": "rain.mp3",
    "revision": "c64852b8311545e7a2b790c5e19663dc"
  }, {
    "url": "thunder.mp3",
    "revision": "67dc9b2ae9d304542720a2afe6b33444"
  }, {
    "url": "manifest.webmanifest",
    "revision": "1f51f719ff40a843b52a1682c268e1f1"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("/echoes/index.html"), {
    denylist: [/^\/api/]
  }));
  workbox.registerRoute(({
    url
  }) => url.pathname.startsWith("/api/admin"), new workbox.NetworkOnly(), 'GET');
  workbox.registerRoute(({
    url
  }) => url.pathname.startsWith("/api/presence"), new workbox.NetworkOnly(), 'GET');
  workbox.registerRoute(({
    url
  }) => url.pathname.startsWith("/api/"), new workbox.NetworkFirst({
    "cacheName": "api-runtime-cache",
    "networkTimeoutSeconds": 4,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 300
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(({
    url
  }) => url.origin.includes("onrender.com") && url.pathname.startsWith("/api/admin"), new workbox.NetworkOnly(), 'GET');
  workbox.registerRoute(({
    url
  }) => url.origin.includes("onrender.com") && url.pathname.startsWith("/api/presence"), new workbox.NetworkOnly(), 'GET');
  workbox.registerRoute(({
    url
  }) => url.origin.includes("onrender.com") && url.pathname.startsWith("/api/"), new workbox.NetworkFirst({
    "cacheName": "render-runtime-cache",
    "networkTimeoutSeconds": 4,
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 300
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 20,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
