// ==UserScript==
// @name         Unfuck the Internet
// @namespace    Unfuck the Internet
// @version      1.0.13
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
    
    const addCss = (css) => {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        waitFor(() => {
            const head = document.querySelector('head');
            if (head) {
                head.appendChild(style);
            }
            return !!head;
        });
        return style;
    };
  
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
    | | reddit.com | |
    \*--------------*/
  
    else if (domain === 'reddit.com') {
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('[id*="vote-arrows"]').forEach((node) => {
                node.querySelectorAll(':scope > :not(button)').forEach((node) => {
                    const screenReaderNode = node.querySelector('[role="screen-reader"]');
                    console.log(screenReaderNode.parentNode);
                    addCss(`.${screenReaderNode.parentNode.className} > :not([role="screen-reader"]) { display: none !important; }`);
                    addCss(`.${screenReaderNode.parentNode.className} .${node.querySelector('[role="screen-reader"]').className} { display: block !important; position: static !important; width: auto !important; height: auto !important; margin: 0 !important; }`);
                });
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
        });
    }
    
    /*---------------*\
    | | youtube.com | |
    \*---------------*/
    
    else if (domain === 'youtube.com') {
        // Auto-accept "Are you still watching?" toasts.
        setInterval(function() {
            'use strict';
            if (document.getElementsByClassName('line-text style-scope yt-confirm-dialog-renderer').length >= 1) {
                for (let i = 0; i < document.getElementsByClassName('line-text style-scope yt-confirm-dialog-renderer').length; i++) {
                    if (document.getElementsByClassName('line-text style-scope yt-confirm-dialog-renderer')[i].innerText == "Video paused. Continue watching?") {
                        document.getElementsByClassName('line-text style-scope yt-confirm-dialog-renderer')[i].parentNode.parentNode.parentNode.querySelector('#confirm-button').click()
                    }
                }
            }
            (() => {
                const toasts = document.querySelectorAll('.toast-button');
                toasts.forEach((toast) => {
                    if (toast.textContent.includes('Still watching?')) {
                        toast.querySelector('paper-button').click();
                    }
                });
            })();
        }, 10)();
    }
    
})();
