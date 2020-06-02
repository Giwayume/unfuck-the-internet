// ==UserScript==
// @name         Unfuck the Internet
// @namespace    Unfuck the Internet
// @version      1.0.6
// @description  Fixes annoying things about various websites on the internet
// @author       Giwayume
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    
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
        onHistoryChange((stateName) => {
            if (window === window.top) {
                searchForFeeds();
            }
        });
        addCss(`[data-pagelet^="FeedUnit"]{opacity:0.001!important}[data-pagelet^="FeedUnit"].loaded{opacity:1!important}`);
        let pendingFeedUnits = [];
        let isPurging = false;
        const startPurging = () => {
            if (pendingFeedUnits.length === 0) {
                isPurging = false;
                return;
            }
            else {
                isPurging = true;
                for (let i = pendingFeedUnits.length - 1; i >= 0; i--) {
                    const node = pendingFeedUnits[i];
                    try {
                        var pageletAttr = node.getAttribute('data-pagelet');
                        if (!pageletAttr || !pageletAttr.startsWith('FeedUnit')) {
                            throw 'ignore';
                        }
                        let textSearchNodes = node.querySelectorAll('h4');
                        if (textSearchNodes.length == 0) {
                            textSearchNodes = node.querySelectorAll('span');
                        }
                        if (textSearchNodes.length == 0) throw 'continue';
                        let hasFoundText = false;
                        for (let j = 0; j < textSearchNodes.length; j++) {
                            if (textSearchNodes[j].textContent != '') {
                                hasFoundText = true;
                                break;
                            }
                        }
                        if (!hasFoundText) {
                            throw 'continue';
                        }
                        node.querySelectorAll('[style*="position: absolute"][style*="top: 3em"]').forEach((fakeNode) => {
                            fakeNode.remove();
                        });
                        if (/S\-*?p\-*?o\-*?n\-*?s\-*?o\-*?r\-*?e\-*?d/.test(node.textContent || '')) {
                            console.log('[unfuck-the-internet] Sponsored content hidden.', node.textContent);
                            throw 'remove';
                        }
                        throw 'ignore';
                    } catch (signal) {
                        if (signal == 'remove') {
                            node.style.display = 'none';
                        }
                        else if (signal == 'ignore') {
                            node.classList.add('loaded');
                        }
                        if (signal == 'ignore' || signal == 'remove') {
                            pendingFeedUnits.splice(i, 1);
                        }
                    }
                    window.requestAnimationFrame(startPurging);
                }
            }
        };
        let feedObservers = [];
        const searchForFeeds = async () => {
            for (let observer of feedObservers) {
                observer.disconnect();
            }
            pendingFeedUnits = [];
            feedObservers = [];
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
                                pendingFeedUnits.push(mutation.addedNodes[i]);
                                if (!isPurging) {
                                    startPurging();
                                }
                            }
                        });
                    })
                    observer.observe(feed, { childList: true });
                    feedObservers.push(observer);
                    feed.querySelectorAll('[data-pagelet^="FeedUnit"]').forEach(async (node) => {
                        pendingFeedUnits.push(node);
                        if (!isPurging) {
                            startPurging();
                        }
                    });
                });
            }
        };
        searchForFeeds();
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
                    }
                });
            })();
        }, 10)();
    }
    
})();
