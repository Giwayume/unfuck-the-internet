// ==UserScript==
// @name         Unfuck the Internet
// @namespace    Unfuck the Internet
// @version      1.0.3
// @description  Fixes annoying things about various websites on the internet
// @author       Giwayume
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    
    const domain = window.location.hostname.split('.').slice(-2).join('.');
    
    const waitFor = (conditionCheck, timeout) => {
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (conditionCheck()) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 10);
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, timeout || 5000);
        });
    };
    
    if (false) {}
    
    /*----------------*\
    | | facebook.com | |
    \*----------------*/
  
    else if (domain === 'facebook.com') {
        // Remove sponsored feed items.
        const purgeFeedUnit = async (node) => {
            var pageletAttr = node.getAttribute('data-pagelet');
            if (!pageletAttr || !pageletAttr.startsWith('FeedUnit')) {
                return;
            }
            let busyNode;
            await waitFor(() => {
                busyNode = node.querySelector('[aria-busy="true"]');
                return !!busyNode;
            }, 100);
            await waitFor(() => {
                return !busyNode || busyNode.parentNode === null;
            }, Infinity);
            if (/S\-*?p\-*?o\-*?n\-*?s\-*?o\-*?r\-*?e\-*?d/.test(node.textContent || '')) {
                console.log('[unfuck-the-internet] Sponsored content hidden.', node.textContent);
                node.style.display = 'none';
            }
        };
        document.addEventListener('DOMContentLoaded', async () => {
            let feeds;
            await waitFor(() => {
                feeds = document.querySelectorAll('[role="feed"]');
                return feeds.length > 0;
            });
            if (feeds) {
                feeds.forEach((feed) => {
                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach(function(mutation) {
                            for (var i = 0; i < mutation.addedNodes.length; i++) {
                                purgeFeedUnit(mutation.addedNodes[i]);
                            }
                        });
                    })
                    observer.observe(feed, { childList: true });
                    feed.querySelectorAll('[data-pagelet^="FeedUnit"]').forEach(async (node) => {
                        purgeFeedUnit(node);
                    });
                });
            }
        });
    }
  
    /*-----------------*\
    | | instagram.com | |
    \*-----------------*/
    
    else if (domain === 'instagram.com') {
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
                        setTimeout(() => {
                            document.querySelector('paper-toast').remove();
                        }, 10);
                    }
                });
            })();
        }, 10)();
    }
    
})();
