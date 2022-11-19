// ==UserScript==
// @name         Unfuck the Internet
// @namespace    Unfuck the Internet
// @version      1.0.50
// @description  Fixes annoying things about various websites on the internet
// @author       Giwayume
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
  
    // Websites sometimes mess with these, save them.
    const setInterval = window.setInterval;
    const setTimeout = window.setTimeout;
    const clearInterval = window.clearInterval;
    
    const domain = window.location.hostname.split('.').slice(-2).join('.');
  
    const kebabToCamelCase = (str) => {
        let arr = str.split('-');
        let capital = arr.map((item, index) => index ? item.charAt(0).toUpperCase() + item.slice(1).toLowerCase() : item.toLowerCase());
        return capital.join("");
    }
    
    const createdStyles = [];
    const addCss = (css) => {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        createdStyles.push(style);
        if (document.head != null) {
            document.head.appendChild(style);
        } else {
            waitFor(() => {
                const head = document.querySelector('head');
                if (head) {
                    head.appendChild(style);
                }
                return !!head;
            });
        }
        return style;
    };
  
    const getCssSelectorByStyles = (searchStylesString) => {
        let matchedSelector = '';
        const searchStylesSplit = searchStylesString.split(';');
        let searchRules = {};
        for (let searchStyleRule of searchStylesSplit) {
            const ruleSplit = searchStyleRule.split(':');
            const ruleName = ruleSplit[0].trim().toLowerCase();
            if (!ruleName) continue;
            const ruleValue = (ruleSplit[1] + '').trim();
            searchRules[ruleName] = ruleValue;
            searchRules[kebabToCamelCase(ruleName)] = ruleValue;
            
        }
        for (let stylesheet of [...document.styleSheets]) {
            try {
                for (let rule of stylesheet.cssRules) {
                    if (!rule.style) continue;
                    console.log(rule.selectorText);
                    let isMatchingRule = true;
                    for (let searchRule in searchRules) {
                        if (rule.style[searchRule] !== searchRules[searchRule]) {
                            isMatchingRule = false;
                            break;
                        }
                    }
                    if (isMatchingRule) {
                        matchedSelector = rule.selectorText;
                        break;
                    }
                }
            } catch (error) {
                // Could be cross origin error, ignore.
            }
        }
        return matchedSelector;
    };
  
    const parseQuery = (queryString) => {
        var query = {};
        var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split('=');
            query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
        }
        return query;
    }
  
    const onHistoryChange = (callback) => {
        var originalPushState = History.prototype.pushState;
        var originalReplaceState = History.prototype.replaceState;
        History.prototype.pushState = function() {
            callback('push', { ...arguments });
            return originalPushState.apply(this, arguments);
        };
        History.prototype.replaceState = function() {
            callback('replace', { ...arguments });
            return originalReplaceState.apply(this, arguments);
        };
        window.addEventListener('popstate', (event) => {
            callback('pop', event);
        });
    }
    
    const waitIntervals = [];
    const waitFor = (conditionCheck, timeout) => {
        return new Promise((resolve, reject) => {
            let intervalIndex;
            waitIntervals.push(
                setInterval(() => {
                    if (conditionCheck()) {
                        clearInterval(waitIntervals[intervalIndex]);
                        resolve();
                    }
                }, 10)
            );
            intervalIndex = waitIntervals.length - 1;
            setTimeout(() => {
                clearInterval(waitIntervals[intervalIndex]);
                resolve();
            }, timeout || 5000);
        });
    };
  
    const disablePageviewAPI = () => {
        document.addEventListener("visibilitychange", function(e) {
            e.stopImmediatePropagation();
        }, true);
        Object.defineProperty(Document.prototype, "hidden", {
            get: function hidden() {
                return false;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Document.prototype, "visibilityState", {
            get: function visibilityState() {
                return "visible";
            },
            enumerable: true,
            configurable: true
        });
    };
  
    const blockAllPopups = () => {
        Object.defineProperty(HTMLAnchorElement.prototype, 'target', { configurable: false, writable: false, value: '_self' });
        const setAttribute = Element.prototype.setAttribute;
        function strictSetAttribute(name, value) {
            if ((name || '').toLowerCase() === 'target') return;
            return setAttribute.apply(this, arguments);
        };
        Object.defineProperty(Element.prototype, 'setAttribute', { configurable: false, writable: false, value: strictSetAttribute });
        const getAttribute = Element.prototype.getAttribute;
        function strictGetAttribute(name) {
            if ((name || '').toLowerCase() === 'target') return null;
            return getAttribute.apply(this, arguments);
        }
        Object.defineProperty(Element.prototype, 'getAttribute', { configurable: false, writable: false, value: strictGetAttribute });
        window.open = function(url) {
            console.log('Blocked open attempt', url);
        };
    };
  
    let entireTreeMutationObserver = null;
    const entireTreeMutationObserverCallbacks = [];
    const blockInjectedNodes = (blockDefinition = {}) => {
        if (entireTreeMutationObserver == null) {
            entireTreeMutationObserver = new MutationObserver((mutationList, observer) => {
                for (callback of entireTreeMutationObserverCallbacks) {
                    callback(mutationList, observer);
                }
            });
            entireTreeMutationObserver.observe(document.documentElement, { attributes: false, childList: true, subtree: true });
        }
        if (blockDefinition.blockContent) {
            let blockContent = blockDefinition.blockContent;
            if (Object.prototype.toString.call(blockContent) !== '[object Array]') {
                blockContent = [blockContent];
            }
            entireTreeMutationObserverCallbacks.push((mutationList) => {
                for (mutation of mutationList) {
                    if (mutation.addedNodes) {
                        for (node of mutation.addedNodes) {
                            for (blockContentString of blockContent) {
                                if ((node.textContent || '').includes(blockContentString)) {
                                    node.remove();
                                }
                            }
                        }
                    }
                }
            });
        }
    };
  
    const disableConsoleManipulation = () => {
        const console = window.console;
        const noop = function() {};
        window.console = {
          assert: noop, clear: noop, count: noop, countReset: noop, debug: noop, dir: noop, dirXml: noop, error: noop, exception: noop, group: noop, groupCollapsed: noop,
          groupEnd: noop, info: noop, log: noop, profile: noop, profileEnd: noop, table: noop, time: noop, timeEnd: noop, timeLog: noop, timeStamp: noop, trace: noop, warn: noop
        };
        return console;
    };
  
    const disableAddCssRemoval = () => {
        const _removeChild = Node.prototype.removeChild;
        Node.prototype.removeChild = function removeChild(child) {
            if (createdStyles.includes(child)) {
                return;
            }
            return _removeChild.call(this, child);
        };
        const _replaceChild = Node.prototype.replaceChild;
        Node.prototype.replaceChild = function replaceChild(newChild, oldChild) {
            if (createdStyles.includes(oldChild)) {
                return;
            }
            return _replaceChild.call(this, newChild, oldChild);
        };
        const _remove = Element.prototype.remove;
        Element.prototype.remove = function remove(child) {
            if (createdStyles.includes(self)) {
                return document.createElement('style');
            }
            return _remove.call(this);
        };
    };
  
    const eventPropertyNames = ['onanimationcancel', 'onanimationend', 'onanimationiteration', 'onanimationstart', 'onauxclick', 'onbeforeinput', 'onblur', 'oncanplay', 'oncanplaythrough', 'onchange', 'onclick', 'onclose', 'oncontextmenu', 'oncopy', 'oncuechange', 'oncut', 'ondblclick', 'ondrag', 'ondragend', 'ondragenter', 'ondragexit', 'ondragleave', 'ondragover', 'ondragstart', 'ondrop', 'ondurationchange', 'onemptied', 'onended', 'onerror', 'onfocus', 'onformdata', 'ongotpointercapture', 'oninput', 'oninvalid', 'onkeydown', 'onkeypress', 'onkeyup', 'onload', 'onloadeddata', 'onloadedmetadata', 'onloadend', 'onloadstart', 'onlostpointercapture', 'onmousedown', 'onmouseenter', 'onmouseleave', 'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'onmozfullscreenchange', 'onmozfullscreenerror', 'onpaste', 'onpause', 'onplay', 'onplaying', 'onpointercancel', 'onpointerdown', 'onpointerenter', 'onpointerleave', 'onpointermove', 'onpointerout', 'onpointerover', 'onpointerup', 'onprogress', 'onratechange', 'onreset', 'onresize', 'onscroll', 'onseeking', 'onselect', 'onselectstart', 'onstalled', 'onsubmit', 'onsuspend', 'ontimeupdate', 'ontoggle', 'ontransitioncancel', 'ontransitionend', 'ontransitionrun', 'ontransitionstart', 'onvolumechange', 'onwaiting', 'onwebkitanimationend', 'onwebkitanimationiteration' ,'onwebkitanimationstart', 'onwebkittransitionend', 'onwheel'];
    const purgeEventListeners = (purgeCallback) => {
        const modifiedListenerMap = new WeakMap();
        const _addEventListener = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function addEventListener(type, listener, useCapture) {
            const self = this;
            const originalListenerCode = listener && listener.toString();
            const callbackResult = purgeCallback(this, type.toLowerCase(), originalListenerCode);
            if (callbackResult && callbackResult.halt) {
                return;
            }
            const modifiedListener = function(e) {
                const callbackResult = purgeCallback(this, type.toLowerCase(), originalListenerCode);
                if (callbackResult) {
                    if (callbackResult.preventDefault) {
                        e.preventDefault();
                    }
                    if (callbackResult.stopPropagation) {
                        e.stopPropagation();
                    }
                }
                if (listener) {
                    return listener.call(self, e);
                }
            }
            modifiedListenerMap.set(listener, modifiedListener);
            return _addEventListener.call(this, type, modifiedListener, useCapture);
        };
        const _removeEventListener = EventTarget.prototype.removeEventListener;
        EventTarget.prototype.removeEventListener = function removeEventListener(type, listener, useCapture) {
            if (modifiedListenerMap.has(listener)) {
                listener = modifiedListenerMap.get(listener);
            }
            return _removeEventListener.call(this, type, listener, useCapture);
        };
        // let accessModifiers = {};
        // const eventPropertyMap = new WeakMap();
        // for (let propertyName of eventPropertyNames) {
        //     accessModifiers[propertyName] = {
        //         configurable: true,
        //         enumerable: true,
        //         get() {
        //             return eventPropertyMap.get(this, callback);
        //         },
        //         set(callback) {
        //             eventPropertyMap.set(this, callback);
        //         }
        //     };
        // }
        // Object.defineProperties(HTMLElement.prototype, accessModifiers);
    };
  
    addCss(`
    body.tp-modal-open { overflow: auto !important }
    `);
    
    if (false) {}
    
    /*----------------*\
    | | facebook.com | |
    \*----------------*/
  
    else if (domain === 'facebook.com') {
        if (window !== window.top) {
            return;
        }
        if (/^[\/]?$/g.test(location.pathname)) {
            location = '/messages/t/';
        }
        document.documentElement.style.setProperty('--notification-badge', 'transparent');
        document.addEventListener('DOMContentLoaded', () => {
            document.documentElement.style.setProperty('--notification-badge', 'transparent');
        });
    }
  
    /*----------------------*\
    | | factschronicle.com | |
    \*----------------------*/
  
    else if (domain === 'factschronicle.com') {
        addCss('* { user-select: auto !important; } h1,h2,h3,h4,h5,h6,p { cursor: initial !important; }');
        const setAttribute = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function(name) {
            if (name === 'unselectable') return;
            return setAttribute.apply(this, arguments);
        };
        Object.defineProperty(window, 'ai_front', { configurable: false, value: null, writable: false });
        Object.defineProperty(window, 'ai_run_scripts', { configurable: false, value: null, writable: false });
        Object.defineProperty(window, 'disableSelection', { configurable: false, value: null, writable: false });
        Object.defineProperty(document, 'oncontextmenu', { configurable: false, value: null, writable: false });
        Object.defineProperty(document, 'ondragstart', { configurable: false, value: null, writable: false });
        Object.defineProperty(document, 'onload', { configurable: false, value: null, writable: false });
        Object.defineProperty(document, 'onmousedown', { configurable: false, value: null, writable: false });
        Object.defineProperty(document, 'onkeydown', { configurable: false, value: null, writable: false });
        Object.defineProperty(document, 'onselectstart', { configurable: false, value: null, writable: false });
    }
  
    /*----------------*\
    | | gogoanime.vc | |
    \*----------------*/
  
    else if (domain.startsWith('gogoanime')) {
        const console = disableConsoleManipulation();
        addCss('html > body ~ div { display: none !important; pointer-events: none !important; }');
        blockAllPopups();
        document.addEventListener('DOMContentLoaded', () => {
            const cdnList = document.querySelector('.anime_muti_link');
            cdnList?.querySelectorAll('a[data-video]').forEach(link => {
                link.addEventListener('click', () => {
                    const videoLink = link.getAttribute('data-video');
                    console.log(videoLink);
                    document.querySelector('.play-video > iframe').src = videoLink;
                }, true);
            });
        });
    }
  
    else if (['fembed-hd.com', 'sbplay2.xyz', 'dood.ws'].includes(domain) || /(goload\.|gogoplay[0-9]{1,4}\.com)/.test(domain)) {
        const console = disableConsoleManipulation();
        purgeEventListeners((target, event, handler) => {
            if ((target === window || target === document) && ['mousedown', 'mouseup', 'click'].includes(event)) {
                return { halt: true };
            }
        });
        addCss('html > body ~ div { display: none !important; pointer-events: none !important; }');
        blockAllPopups();
    }
  
    /*--------------*\
    | | google.com | |
    \*--------------*/
    
    else if (domain === 'google.com') {
        if (location.pathname.startsWith('/search')) {
          document.addEventListener('DOMContentLoaded', () => {
              document.querySelectorAll('a[href]').forEach((link) => {
                  link.removeAttribute('onmousedown');
              });
          });
        }
    }
  
    /*-----------------*\
    | | instagram.com | |
    \*-----------------*/
    
    else if (domain === 'instagram.com') {
        sessionStorage.setItem('loggedOutCTAIsShown', '1');
        // Remove popups prompting user to login, when it's not actually necessary.
        document.addEventListener('DOMContentLoaded', () => {
            document.body.addEventListener('click', (e) => {
                const link = e.target.closest('a');
                if (link && link.hasAttribute('href') && link.getAttribute('href').startsWith('/p/')) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = link.getAttribute('href');
                    const popupCheck = setInterval(() => {
                        const popup = document.querySelector('.RnEpo');
                        if (popup) {
                            setTimeout(() => {
                              document.body.style.overflow = 'auto';
                            }, 50);
                            popup.remove();
                            clearInterval(popupCheck);
                        }
                    }, 1);
                }
            });
        });
    }
  
    /*----------------*\
    | | mangahere.cc | |
    \*----------------*/
    
    else if (domain === 'mangahere.cc') {
        const addEventListenerOriginal = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function(type, listener) {
            if (type === 'contextmenu') {
                setTimeout(() => {
                    jQuery(this).off('contextmenu');
                }, 1);
            }
            else if (type === 'mouseup') {
                setTimeout(() => {
                    if (this.classList.contains('reader-main-img')) {
                        jQuery(this).off('mouseup');
                        jQuery(this).on('mouseup', (e) => {
                            if (e.button === 0) {
                                const nextPageLink = jQuery('.pager-list-left a.active').next();
                                if (nextPageLink.length > 0) {
                                    nextPageLink.click();
                                } else {
                                    window.location = jQuery('.pager-list-left a.chapter:contains(Next)').get(0).href;
                                }
                            }
                        })
                    }
                }, 1);
            }
            return addEventListenerOriginal.apply(this, arguments);
        };
    }
  
    /*-------------------*\
    | | mangakakalot.tv | |
    \*-------------------*/
  
    else if (domain === 'mangakakalot.tv') {
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('[data-src]').forEach((node) => {
                console.log(node);
                node.src = node.getAttribute('data-src');
            });
        });
    }
  
    /*---------------*\
    | | netflix.com | |
    \*---------------*/
    
    else if (domain === 'netflix.com') {
        window.MessageChannel = undefined;
        addCss(`
            .lolomoPreview { display: none !important; }
            .previewModal--container { transform: none !important; }
            .previewModal--player_container > div { opacity: 1 !important; }
            .previewModal--info { transform: none !important; opacity: 1 !important; }
        `);
    }
    
    /*---------------*\
    | | nhentai.com | |
    \*---------------*/
  
    else if (domain === 'nhentai.net') {
        const styles = addCss(`.reader-buttons-right { display: none !important; } html.reader #image-container.fit-both { height: auto !important; } html.reader #image-container.fit-both img { max-height: none; width: 800px; }`);
        document.addEventListener('keydown', (e) => {
           if (!window.n) {
              if (e.key === 'ArrowRight') {
                  document.querySelector('.next').click();
              }
              else if (e.key === 'ArrowLeft') {
                  document.querySelector('.previous').click();
              }
           }
        });
        document.addEventListener('DOMContentLoaded', () => {
            if (window.n) {
                styles.remove();
            }
            document.querySelectorAll('img.lazyload').forEach(image => {
                image.src = image.getAttribute('data-src');
                image.onerror = () => {
                    image.src = image.getAttribute('data-src');
                };
            });
            document.querySelector('#image-container a').addEventListener('click', (e) => {
                const imageRect = e.target.getBoundingClientRect();
                if (e.clientX < imageRect.left + ((imageRect.right - imageRect.left) / 4)) {
                    e.preventDefault();
                    e.stopPropagation();
                    document.querySelector('.previous').click();
                }
            });
        });
    }

    /*--------------*\
    | | piximg.net | |
    \*--------------*/

    else if (domain === 'pximg.net') {
        const download = parseQuery(window.location.search).download;
        if (download) {
            const link = document.createElement('a');
            link.download = download.split('/').pop();
            link.href = download;
            link.click();
        }
    }

    /*-------------*\
    | | pixiv.net | |
    \*-------------*/

    else if (domain === 'pixiv.net') {
        function createDownloadButton() {
            const zoomControls = document.querySelectorAll('.zoom-controls');
            console.log(zoomControls)
            for (let zoomControl of zoomControls) {
                console.log(zoomControl);
                if (!zoomControl.querySelector('.download-button')) {
                    const downloadButton = document.createElement('button');
                    downloadButton.classList.add('download-button');
                    downloadButton.style.border = 'none';
                    downloadButton.style.verticalAlign = 'middle';
                    downloadButton.style.width = downloadButton.style.height = downloadButton.style.lineHeight = '36px';
                    downloadButton.style.borderRadius = '300px';
                    downloadButton.style.backgroundColor = 'rgba(0,0,0,.4)';
                    downloadButton.style.color = 'white';
                    downloadButton.innerHTML = '&#11015;';
                    downloadButton.target = '_blank';
                    downloadButton.onclick = () => {
                        window.open('https://i.pximg.net?download=' + encodeURIComponent(document.querySelector('.zoomable-area .scaled-image').src), '_blank');
                    };
                    zoomControl.appendChild(downloadButton);
                }
            }
        }
        const createDownloadDeferred = (event) => {
            const target = event.touches ? event.touches[0].target : event.target;
            if (target.closest('.manga-pages, .manga-translator-view, .work-main-image')) {
                setTimeout(() => {
                    createDownloadButton();
              }, 50);
            }
        };
        document.addEventListener('mousedown', createDownloadDeferred, true);
        document.addEventListener('touchstart', createDownloadDeferred, true);
        document.addEventListener('DOMContentLoaded', async () => {
            await waitFor(() => {
                const zoomControls = document.querySelector('.zoom-controls');
                return !!zoomControls;
            });
            createDownloadButton();
        });
    }
    
    /*--------------*\
    | | reddit.com | |
    \*--------------*/
  
    else if (domain === 'reddit.com') {
        disableAddCssRemoval();
        document.addEventListener('DOMContentLoaded', () => {
            addCss(`${getCssSelectorByStyles('background-image: linear-gradient(67.9deg,#5349da 11.74%,#b44ac0 88.14%);')} { display: none !important; }`);
            addCss(`${getCssSelectorByStyles('background-color: rgb(255, 69, 0)')} { display: none !important; }`);
            addCss(`._3hna43Sh0DTnoV7v2NNc2r { display: none !important; }`);
            addCss(`#COIN_PURCHASE_DROPDOWN_ID { display: none !important; }`);
            addCss(`${getCssSelectorByStyles('background-color: var(--newCommunityTheme-button); color: var(--newCommunityTheme-body); position: sticky; z-index: 95;')} { display: none !important; }`);
            document.querySelectorAll('[id*="vote-arrows"] > :not(button) [role="screen-reader"], [data-click-id="comments"] [role="screen-reader"]').forEach((screenReaderNode) => {
                addCss(`.${screenReaderNode.parentNode.className} > :not([role="screen-reader"]) { display: none !important; }`);
                addCss(`.${screenReaderNode.parentNode.className} .${node.querySelector('[role="screen-reader"]').className} { display: block !important; position: static !important; width: auto !important; height: auto !important; margin: 0 !important; }`);
            });
            
        });
    }
  
    /*--------------*\
    | | rule34.xxx | |
    \*--------------*/
  
    else if (domain === 'rule34.xxx') {
        addCss(`#image { max-width: 100%; height: auto; } .thumb { width: 200px; height: 200px; }`);
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.thumb a').forEach(link => {
                link.target = '_blank';
            });
            document.querySelectorAll('img').forEach(img => {
                if (img.getAttribute('data-cfsrc')) {
                    img.src = img.getAttribute('data-cfsrc');
                    img.style.display = 'block';
                    img.style.visibility = 'visible';
                }
            });
        });
    }
  
    /*-------------------*\
    | | techlicious.com | |
    \*-------------------*/
  
    else if (domain === 'techlicious.com') {
        Object.defineProperty(window, 'admrlWpJsonP', {
            configurable: false,
            writable: false,
            value: null
        });
    }
  
    /*---------------*\
    | | twitter.com | |
    \*---------------*/
    
    else if (domain === 'twitter.com') {
        disableAddCssRemoval();
        blockInjectedNodes({
            blockContent: ['See more Tweets from']
        });
        document.addEventListener('DOMContentLoaded', () => {
            addCss('[data-testid="BottomBar"] { display: none !important; }');
            addCss('iframe[title*="Sign in with Google Dialog"] { display: none !important; }');
            addCss('html { overflow: unset !important; overscroll-behavior-y: unset !important; font-size: unset !important; margin-right: unset !important; }');
        });
    }
  
    /*-------------*\
    | | vimeo.com | |
    \*-------------*/
    
    else if (domain === 'vimeo.com') {
        disablePageviewAPI();
    }
  
    /*---------------*\
    | | youtube.com | |
    \*---------------*/
    
    else if (domain === 'youtube.com') {
        localStorage.clear();
        sessionStorage.clear();
        disablePageviewAPI();
        const yt = {};
        const config_ = {};
        const EXPERIMENT_FLAGS = {
            botguard_async_snapshot_timeout_ms: Infinity,
            enable_auto_play_param_fix_for_masthead_ad: false,
            fix_ads_tracking_for_swf_config_deprecation_mweb: false,
            html5_check_both_ad_active_and_ad_info: false,
            web_enable_ad_signals_in_it_context: false,
            web_foreground_heartbeat_interval_ms: Infinity
        };
        Object.defineProperty(config_, 'EXPERIMENT_FLAGS', {
            configurable: false,
            get() { return EXPERIMENT_FLAGS; },
            set(flags) {
                for (let flag in flags) {
                    if (EXPERIMENT_FLAGS[flag] == null) {
                        EXPERIMENT_FLAGS[flag] = flags[flag];
                    }
                }
            }
        });
        Object.defineProperty(yt, 'config_', {
            configurable: false,
            get() { return config_ },
            set() {}
        });
        Object.defineProperty(window, 'yt', {
            configurable: false,
            writable: false,
            value: yt
        });
        Object.defineProperties(Object.prototype, {
            adVideoId: {
                configurable: false,
                enumerable: false,
                get() { return ''; },
                set() {}
            },
            adBreakEndSeconds: {
                configurable: false,
                enumerable: false,
                get() { return null; },
                set() {}
            },
            actionCompanionAdRenderer: {
                configurable: false,
                enumerable: false,
                get() { return {}; },
                set() {}
            },
            adBreakServiceRenderer: {
                configurable: false,
                enumerable: false,
                get() { return {}; },
                set() {}
            },
            adPlacementConfig: {
                configurable: false,
                enumerable: false,
                get() { return {}; },
                set() {}
            },
            ad_docid: {
                configurable: false,
                enumerable: false,
                get() { return ''; },
                set() {}
            }
        });
    }
    
})();
