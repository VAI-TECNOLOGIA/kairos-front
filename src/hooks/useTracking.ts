import { useEffect, useRef } from 'react';
import api from '@/lib/api';

export type TrackingEvent =
  | 'ViewContent'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase';

interface TrackingPixel {
  id       : string;
  provider : string;
  pixelId  : string;
  events   : string[];
  name     : string;
}

interface PurchaseData {
  value   ?: number;
  currency?: string;
  orderId ?: string;
}

// ── Per-provider script injectors ────────────────────────────────

function injectFacebook(pixelId: string): void {
  if ((window as any).fbq) return; // already loaded

  /* eslint-disable */
  (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
    if (f.fbq) return;
    n = f.fbq = function() {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push    = n;
    n.loaded  = !0;
    n.version = '2.0';
    n.queue   = [];
    t = b.createElement(e);
    t.async = !0;
    t.src   = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  (window as any).fbq('init', pixelId);
}

function injectGA4(measurementId: string): void {
  if (document.getElementById(`ga4-${measurementId}`)) return;

  const script = document.createElement('script');
  script.id    = `ga4-${measurementId}`;
  script.async = true;
  script.src   = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag = function() {
    (window as any).dataLayer.push(arguments);
  };
  (window as any).gtag('js', new Date());
  (window as any).gtag('config', measurementId);
}

function injectGoogleAds(conversionId: string): void {
  if (document.getElementById(`gads-${conversionId}`)) return;

  const script = document.createElement('script');
  script.id    = `gads-${conversionId}`;
  script.async = true;
  script.src   = `https://www.googletagmanager.com/gtag/js?id=AW-${conversionId}`;
  document.head.appendChild(script);

  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag = (window as any).gtag || function() {
    (window as any).dataLayer.push(arguments);
  };
  (window as any).gtag('js', new Date());
  (window as any).gtag('config', `AW-${conversionId}`);
}

function injectTikTok(pixelId: string): void {
  if ((window as any).ttq) return;

  /* eslint-disable */
  (function(w: any, d: any, t: any) {
    w.TiktokAnalyticsObject = t;
    const ttq = w[t] = w[t] || [];
    ttq.methods = ['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'];
    ttq.setAndDefer = function(t: any, e: any) { t[e] = function() { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function(t: any) {
      const e = ttq._i[t] || [];
      for (let n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
      return e;
    };
    ttq.load = function(e: any, n: any) {
      const i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._i[e]._u = i;
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[e] = n || {};
      const o = document.createElement('script');
      o.type = 'text/javascript';
      o.async = !0;
      o.src = i + '?sdkid=' + e + '&lib=' + t;
      const s = document.getElementsByTagName('script')[0];
      s.parentNode!.insertBefore(o, s);
    };
    ttq.load(pixelId);
    ttq.page();
  })(window, document, 'ttq');
  /* eslint-enable */
}

function injectKwai(pixelId: string): void {
  if (document.getElementById(`kwai-${pixelId}`)) return;

  const script = document.createElement('script');
  script.id    = `kwai-${pixelId}`;
  script.async = true;
  script.innerHTML = `
    !function(a,b,c,d,e,f,g){
      a['KwaiPixelObject']=e;
      a[e]=a[e]||function(){(a[e].q=a[e].q||[]).push(arguments)};
      f=b.createElement(c);f.async=!0;
      f.src=d;g=b.getElementsByTagName(c)[0];
      g.parentNode.insertBefore(f,g);
    }(window,document,'script','https://s.kwai.com/pixel.js','kwaiPixel');
    kwaiPixel('init', '${pixelId}');
    kwaiPixel('pageView');
  `;
  document.head.appendChild(script);
}

// ── Event firers ─────────────────────────────────────────────────

function fireFacebook(event: TrackingEvent, data?: PurchaseData): void {
  const fbq = (window as any).fbq;
  if (!fbq) return;

  if (event === 'Purchase' && data) {
    fbq('track', 'Purchase', {
      value   : (data.value || 0) / 100,
      currency: data.currency || 'BRL',
    });
  } else {
    fbq('track', event);
  }
}

function fireGA4(measurementId: string, event: TrackingEvent, data?: PurchaseData): void {
  const gtag = (window as any).gtag;
  if (!gtag) return;

  if (event === 'Purchase' && data) {
    gtag('event', 'purchase', {
      transaction_id: data.orderId,
      value         : (data.value || 0) / 100,
      currency      : data.currency || 'BRL',
      send_to       : measurementId,
    });
  } else {
    const gaEvent: Record<TrackingEvent, string> = {
      ViewContent      : 'page_view',
      InitiateCheckout : 'begin_checkout',
      AddPaymentInfo   : 'add_payment_info',
      Purchase         : 'purchase',
    };
    gtag('event', gaEvent[event], { send_to: measurementId });
  }
}

function fireGoogleAds(conversionId: string, event: TrackingEvent, data?: PurchaseData): void {
  const gtag = (window as any).gtag;
  if (!gtag || event !== 'Purchase') return;

  gtag('event', 'conversion', {
    send_to       : `AW-${conversionId}`,
    value         : (data?.value || 0) / 100,
    currency      : data?.currency || 'BRL',
    transaction_id: data?.orderId,
  });
}

function fireTikTok(event: TrackingEvent, data?: PurchaseData): void {
  const ttq = (window as any).ttq;
  if (!ttq) return;

  if (event === 'Purchase' && data) {
    ttq.track('CompletePayment', {
      value   : (data.value || 0) / 100,
      currency: data.currency || 'BRL',
    });
  } else {
    const ttMap: Record<TrackingEvent, string> = {
      ViewContent      : 'ViewContent',
      InitiateCheckout : 'InitiateCheckout',
      AddPaymentInfo   : 'AddPaymentInfo',
      Purchase         : 'CompletePayment',
    };
    ttq.track(ttMap[event]);
  }
}

function fireKwai(event: TrackingEvent, data?: PurchaseData): void {
  const kp = (window as any).kwaiPixel;
  if (!kp) return;

  if (event === 'Purchase' && data) {
    kp('track', 'purchase', { value: (data.value || 0) / 100, currency: data.currency || 'BRL' });
  } else {
    kp('track', event);
  }
}

// ── Hook ─────────────────────────────────────────────────────────

export function useTracking(slug: string | undefined) {
  const pixelsRef = useRef<TrackingPixel[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!slug || loadedRef.current) return;
    loadedRef.current = true;

    api.get(`/tracking/checkout/${slug}`)
      .then(({ data }) => {
        const pixels: TrackingPixel[] = data.pixels || [];
        pixelsRef.current = pixels;

        for (const px of pixels) {
          // Backend already filters isActive: true — all pixels here are active
          switch (px.provider) {
            case 'FACEBOOK':    injectFacebook(px.pixelId);   break;
            case 'GA4':         injectGA4(px.pixelId);        break;
            case 'GOOGLE_ADS':  injectGoogleAds(px.pixelId);  break;
            case 'TIKTOK':      injectTikTok(px.pixelId);     break;
            case 'KWAI':        injectKwai(px.pixelId);       break;
          }
        }
      })
      .catch(() => {
        // Silent — tracking must never break checkout
      });
  }, [slug]);

  function fire(event: TrackingEvent, data?: PurchaseData) {
    for (const px of pixelsRef.current) {
      if (!px.events.includes(event)) continue;

      switch (px.provider) {
        case 'FACEBOOK':   fireFacebook(event, data);              break;
        case 'GA4':        fireGA4(px.pixelId, event, data);       break;
        case 'GOOGLE_ADS': fireGoogleAds(px.pixelId, event, data); break;
        case 'TIKTOK':     fireTikTok(event, data);                break;
        case 'KWAI':       fireKwai(event, data);                  break;
      }
    }
  }

  return { fire };
}
