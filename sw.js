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
    "revision": "408ae16f3540fa2c1053057119fd3355"
  }, {
    "url": "pwa-512x512.png",
    "revision": "ec236090df1f104ace42ef260c9756d5"
  }, {
    "url": "pwa-192x192.png",
    "revision": "eb6d1223d10b44eed0b4bc4d07d553c6"
  }, {
    "url": "og-banner.png",
    "revision": "af14e78c774d75e837a836386aa8c2fa"
  }, {
    "url": "index.html",
    "revision": "90b2e7729c7b1d70120874d5a38b61f5"
  }, {
    "url": "icons.svg",
    "revision": "3b4fcfcf393eca4d264dca4a4663bc37"
  }, {
    "url": "favicon.svg",
    "revision": "7e840862161341271697daa99a40d76b"
  }, {
    "url": "brand-art.jpg",
    "revision": "2021481a070c10e51df9997af3cc12a9"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "742d10903a4bafa84beaee7f3fe2e7bb"
  }, {
    "url": "assets/ZenCinemaModal-BpfkAQRx.js",
    "revision": null
  }, {
    "url": "assets/zap-DtKBCLJr.js",
    "revision": null
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/users-uDDmaY7f.js",
    "revision": null
  }, {
    "url": "assets/triangle-alert-CYQtqYcE.js",
    "revision": null
  }, {
    "url": "assets/ThanosAshBurn-CWLX-hwk.js",
    "revision": null
  }, {
    "url": "assets/SoundscapeMixerModal-D2jDF_uD.js",
    "revision": null
  }, {
    "url": "assets/shield-check-CkFJBsE3.js",
    "revision": null
  }, {
    "url": "assets/ShareModal-TaRaVmUA.js",
    "revision": null
  }, {
    "url": "assets/send-Bs2v4Ru-.js",
    "revision": null
  }, {
    "url": "assets/ReportModal-B3ArERzD.js",
    "revision": null
  }, {
    "url": "assets/play-EQPpUaS7.js",
    "revision": null
  }, {
    "url": "assets/moon-8XZqGlpK.js",
    "revision": null
  }, {
    "url": "assets/InstallAppModal-DtpdMJaX.js",
    "revision": null
  }, {
    "url": "assets/index-CYVoopCj.js",
    "revision": null
  }, {
    "url": "assets/index-B_q5BS-e.css",
    "revision": null
  }, {
    "url": "assets/eye-BxPfYsRZ.js",
    "revision": null
  }, {
    "url": "assets/EchoComposer-OcHmmyot.js",
    "revision": null
  }, {
    "url": "assets/download-BI_IVxHl.js",
    "revision": null
  }, {
    "url": "assets/confetti.module-75bydEUS.js",
    "revision": null
  }, {
    "url": "assets/CommentsDrawer-_S3kotFx.js",
    "revision": null
  }, {
    "url": "assets/circle-check-CIFavCh9.js",
    "revision": null
  }, {
    "url": "assets/CatharsisRitualModal-DhVdGHvu.js",
    "revision": null
  }, {
    "url": "assets/BeerEasterEggModal-BXKUGXE5.js",
    "revision": null
  }, {
    "url": "assets/AdminDashboardModal-DAWGwYUN.js",
    "revision": null
  }, {
    "url": "assets/AboutModal-DkahCcOJ.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "742d10903a4bafa84beaee7f3fe2e7bb"
  }, {
    "url": "brand-art.jpg",
    "revision": "2021481a070c10e51df9997af3cc12a9"
  }, {
    "url": "favicon.svg",
    "revision": "7e840862161341271697daa99a40d76b"
  }, {
    "url": "icons.svg",
    "revision": "3b4fcfcf393eca4d264dca4a4663bc37"
  }, {
    "url": "og-banner.png",
    "revision": "af14e78c774d75e837a836386aa8c2fa"
  }, {
    "url": "pwa-192x192.png",
    "revision": "eb6d1223d10b44eed0b4bc4d07d553c6"
  }, {
    "url": "pwa-512x512.png",
    "revision": "ec236090df1f104ace42ef260c9756d5"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "408ae16f3540fa2c1053057119fd3355"
  }, {
    "url": "rain.mp3",
    "revision": "c64852b8311545e7a2b790c5e19663dc"
  }, {
    "url": "thunder.mp3",
    "revision": "67dc9b2ae9d304542720a2afe6b33444"
  }, {
    "url": "manifest.webmanifest",
    "revision": "f49d02185ef4363e650763cd22140568"
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
