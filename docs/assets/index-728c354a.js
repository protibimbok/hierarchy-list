var g = Object.defineProperty;
var S = (n, t, e) =>
    t in n
        ? g(n, t, { enumerable: !0, configurable: !0, writable: !0, value: e })
        : (n[t] = e);
var h = (n, t, e) => (S(n, typeof t != 'symbol' ? t + '' : t, e), e);
(function () {
    const t = document.createElement('link').relList;
    if (t && t.supports && t.supports('modulepreload')) return;
    for (const i of document.querySelectorAll('link[rel="modulepreload"]'))
        s(i);
    new MutationObserver((i) => {
        for (const o of i)
            if (o.type === 'childList')
                for (const r of o.addedNodes)
                    r.tagName === 'LINK' && r.rel === 'modulepreload' && s(r);
    }).observe(document, { childList: !0, subtree: !0 });
    function e(i) {
        const o = {};
        return (
            i.integrity && (o.integrity = i.integrity),
            i.referrerPolicy && (o.referrerPolicy = i.referrerPolicy),
            i.crossOrigin === 'use-credentials'
                ? (o.credentials = 'include')
                : i.crossOrigin === 'anonymous'
                ? (o.credentials = 'omit')
                : (o.credentials = 'same-origin'),
            o
        );
    }
    function s(i) {
        if (i.ep) return;
        i.ep = !0;
        const o = e(i);
        fetch(i.href, o);
    }
})();
const m = { lastMouseY: 0, lastStepX: 0, lastMove: 0 },
    L = {
        listTag: 'ul',
        listSelector: 'ul',
        itemSelector: 'li',
        handleSelector: '[data-phl="handle"]',
        listClass: ['phl-list'],
        activeClass: ['phl-active'],
        dragClass: ['phl-drag'],
        threshold: 20,
        context: m,
        expandBtn: '[data-phl="expand"]',
        collapseBtn: '[data-phl="collapse"]',
        extractBtn: '[data-phl="extract"]',
    };
class c {
    constructor(t, e) {
        h(this, 'ctx');
        h(this, 'element');
        h(this, 'opts');
        if (typeof t == 'string') {
            if (((this.element = l(t)), !this.element))
                throw new Error('Provided element does not exist!');
        } else this.element = t;
        (this.opts = { ...L, ...e }),
            (this.ctx = this.opts.context || m),
            this.opts.listSelector ||
                (this.opts.listSelector = this.opts.listTag),
            ['listClass', 'activeClass', 'dragClass'].forEach((s) => {
                typeof this.opts[s] == 'string' &&
                    (this.opts[s] = this.opts[s].split(' '));
            }),
            this.init();
    }
    static make(t, e) {
        return new c(t, e);
    }
    init() {
        const t = (s) => {
                this.onDrag(s);
            },
            e = () => {
                var s;
                (s = this.ctx.dragEl) == null || s.remove(),
                    this.ctx.activeEl &&
                        (T(this.ctx.activeEl, this.opts.activeClass),
                        this.opts.onRelease &&
                            this.opts.onRelease.call(this, this.ctx.activeEl)),
                    (this.ctx.dragEl = void 0),
                    (this.ctx.activeEl = void 0),
                    (this.ctx.overEl = void 0),
                    document.removeEventListener('mousemove', t),
                    document.removeEventListener('mouseup', e);
            };
        f(this.opts.handleSelector, this.element).forEach((s) => {
            this.initItem(s, { onDragFn: t, cleanUpEvt: e });
        }),
            this.element.matches(this.opts.listSelector)
                ? this.listEvts(this.element)
                : this.element.addEventListener('mouseenter', () => {
                      if (!this.ctx.activeEl) return;
                      const s = l(this.opts.listSelector, this.element);
                      s && this.moveTo(s);
                  }),
            f(this.opts.listSelector, this.element).forEach(this.listEvts);
    }
    initItem(t, { onDragFn: e, cleanUpEvt: s }) {
        const i = t.closest(this.opts.itemSelector);
        i &&
            (t.addEventListener('mousedown', (o) => {
                o.preventDefault(),
                    o.stopPropagation(),
                    (this.ctx.lastMouseY = o.y),
                    (this.ctx.lastStepX = o.x),
                    (this.ctx.activeEl = i),
                    p(this.ctx.activeEl, this.opts.activeClass),
                    (this.ctx.dragEl = i.cloneNode(!0)),
                    p(this.ctx.dragEl, this.opts.dragClass),
                    document.body.appendChild(this.ctx.dragEl),
                    (this.ctx.dragEl.style.position = 'absolute'),
                    (this.ctx.dragEl.style.pointerEvents = 'none'),
                    (this.ctx.dragEl.style.left = o.x + 'px'),
                    (this.ctx.dragEl.style.top = o.y + 'px'),
                    document.addEventListener('mousemove', e),
                    document.addEventListener('mouseup', s),
                    this.opts.onStart && this.opts.onStart.call(this, i);
            }),
            i.addEventListener('mouseenter', () => this.onOver(i)),
            i.addEventListener('mouseleave', () => this.onLeave(i)),
            this.btnEvts(i));
    }
    btnEvts(t) {
        const e = l(this.opts.expandBtn, t),
            s = l(this.opts.collapseBtn, t),
            i = l(this.opts.extractBtn, t),
            o = l(this.opts.listSelector, t),
            r = o ? getComputedStyle(o) : {};
        e &&
            (r.display === 'none'
                ? (e.style.display = '')
                : (e.style.display = 'none'),
            e.addEventListener('click', () => {
                this.expand(e.closest(this.opts.itemSelector));
            })),
            s &&
                (r.display === 'none' || !o
                    ? (s.style.display = 'none')
                    : (s.style.display = ''),
                s.addEventListener('click', () => {
                    this.collapse(s.closest(this.opts.itemSelector));
                })),
            i &&
                (!o || o.children.length === 0
                    ? (o == null || o.remove(), (i.style.display = 'none'))
                    : (i.style.display = ''),
                i.addEventListener('click', () => {
                    this.extract(i.closest(this.opts.itemSelector));
                }));
    }
    listEvts(t) {
        t.addEventListener('mouseenter', () => {
            !this.ctx.activeEl ||
                this.ctx.activeEl.contains(t) ||
                this.moveTo(t);
        });
    }
    onDrag(t) {
        const e = this.ctx.dragEl;
        if (
            ((e.style.left = t.x + 'px'),
            (e.style.top = t.y + 'px'),
            Date.now() - this.ctx.lastMove < 100)
        )
            return;
        this.ctx.lastMove = Date.now();
        const s = this.ctx.lastMouseY;
        this.ctx.lastMouseY = t.y;
        const i = this.ctx.lastStepX;
        if (t.x - i > this.opts.threshold)
            this.toRight(), (this.ctx.lastStepX = t.x);
        else if (i - t.x > this.opts.threshold) {
            this.toLeft(), (this.ctx.lastStepX = t.x);
            return;
        }
        const o = this.ctx.overEl;
        if (!o) return;
        const r = o.getBoundingClientRect();
        s < t.y
            ? t.y > r.top && this.moveTo(o.parentElement, o.nextElementSibling)
            : t.y < r.top + r.height && this.moveTo(o.parentElement, o);
    }
    onOver(t) {
        var e;
        if (this.ctx.dragEl) {
            if ((e = this.ctx.activeEl) != null && e.contains(t)) {
                this.ctx.overEl = void 0;
                return;
            }
            this.ctx.overEl = t;
        }
    }
    onLeave(t) {
        this.ctx.dragEl && (this.ctx.overEl = void 0);
    }
    toRight() {
        var o;
        const t = this.ctx.activeEl,
            e =
                (o = this.ctx.activeEl) == null
                    ? void 0
                    : o.previousElementSibling;
        if (!t || !e) return;
        let s = l(this.opts.listSelector, e);
        s ||
            ((s = document.createElement(this.opts.listTag)),
            p(s, this.opts.listClass),
            this.listEvts(s),
            e.appendChild(s)),
            this.moveTo(s),
            this.expand(e);
        const i = l(this.opts.extractBtn, e);
        i && (i.style.display = ''),
            this.opts.onRightMove && this.opts.onRightMove.call(this, t, s);
    }
    toLeft() {
        var s;
        const t =
                (s = this.ctx.activeEl) == null
                    ? void 0
                    : s.closest(this.opts.listSelector),
            e = t == null ? void 0 : t.closest(this.opts.itemSelector);
        e &&
            (this.moveTo(e.parentElement, e.nextElementSibling),
            this.opts.onLeftMove &&
                this.opts.onLeftMove.call(
                    this,
                    this.ctx.activeEl,
                    e.parentElement
                ));
    }
    moveTo(t, e = null) {
        var o;
        if (!this.ctx.activeEl) return;
        const s =
                (o = this.ctx.activeEl) == null
                    ? void 0
                    : o.closest(this.opts.listSelector),
            i = s == null ? void 0 : s.closest(this.opts.itemSelector);
        this.opts.beforeMove &&
            this.opts.beforeMove.call(this, this.ctx.activeEl, s),
            t.insertBefore(this.ctx.activeEl, e),
            s &&
                s.children.length === 0 &&
                (s.remove(), i && this.hideAllActions(i)),
            this.opts.afterMove &&
                this.opts.afterMove.call(this, this.ctx.activeEl, t);
    }
    expand(t) {
        const e = l(this.opts.expandBtn, t),
            s = l(this.opts.collapseBtn, t);
        e && (e.style.display = 'none');
        const i = l(this.opts.listSelector, t);
        if (!i) {
            console.log('Here', t);
            return;
        }
        (i.style.display = ''), s && (s.style.display = '');
    }
    collapse(t) {
        const e = l(this.opts.expandBtn, t),
            s = l(this.opts.collapseBtn, t);
        s && (s.style.display = 'none');
        const i = l(this.opts.listSelector, t);
        i && ((i.style.display = 'none'), e && (e.style.display = ''));
    }
    extract(t) {
        var i;
        const e = l(this.opts.listSelector, t);
        if (!e || !parent) return;
        const s = t.nextElementSibling;
        for (; e.children.length; )
            (i = t.parentElement) == null || i.insertBefore(e.children[0], s);
        e.remove(), this.hideAllActions(t);
    }
    hideAllActions(t) {
        const e = l(this.opts.extractBtn, t),
            s = l(this.opts.expandBtn, t),
            i = l(this.opts.collapseBtn, t);
        s && (s.style.display = 'none'),
            i && (i.style.display = 'none'),
            e && (e.style.display = 'none');
    }
    serialize() {
        return c.serialize(this.element, this.opts.listSelector);
    }
    serializeTree() {
        return c.serializeTree(this.element, this.opts.listSelector);
    }
    static serialize(t, e = 'ul,ol') {
        if ((t && !t.matches(e) && (t = l(e, t)), !t))
            throw new Error('No element is given to serialize!');
        const s = [];
        return this._serializeFlat(t, -1, s, e), s;
    }
    static _serializeFlat(t, e, s, i) {
        for (let o = 0; o < t.children.length; o++) {
            const r = t.children[o],
                a = { data: r.dataset, parent: e };
            s.push(a);
            const d = l(i, r);
            d && this._serializeFlat(d, s.length - 1, s, i);
        }
    }
    static serializeTree(t, e = 'ol,ul') {
        if ((t && !t.matches(e) && (t = l(e, t)), !t))
            throw new Error('No element is given to serialize!');
        const s = [];
        return this._serializeTree(t, s, e), s;
    }
    static _serializeTree(t, e, s) {
        for (let i = 0; i < t.children.length; i++) {
            const o = t.children[i],
                r = [],
                a = l('ul,li', o);
            a && this._serializeTree(a, r, s),
                e.push({ data: o.dataset, children: r });
        }
    }
}
function l(n, t) {
    return (t || document).querySelector(n);
}
function f(n, t) {
    return (t || document).querySelectorAll(n);
}
function T(n, t) {
    t.forEach((e) => n.classList.remove(e));
}
function p(n, t) {
    t.forEach((e) => n.classList.add(e));
}
const v = document.querySelector('#app1'),
    M = document.querySelector('#flat-1'),
    C = document.querySelector('#tree-1'),
    y = document.querySelector('#app2'),
    b = document.querySelector('#flat-2'),
    z = document.querySelector('#tree-2'),
    B = document.querySelector('template'),
    E = B.content.querySelector('[data-phl="item"]');
E.removeAttribute('data-phl');
for (let n = 0; n < 10; n++) {
    const t = E.cloneNode(!0);
    (t.querySelector('.phl-label').innerHTML = `Item ${n + 1}`),
        t.setAttribute('data-index', n.toString()),
        (t.dataset.index2 = n.toString()),
        (t.dataset.index3 = n.toString()),
        v.appendChild(t),
        y.appendChild(t.cloneNode(!0));
}
u.call(c.make(v, { onRelease: u }));
x.call(c.make(y, { onRelease: x }));
function u() {
    (M.innerHTML = JSON.stringify(this.serialize(), null, 2)),
        (C.innerHTML = JSON.stringify(this.serializeTree(), null, 2));
}
function x() {
    (b.innerHTML = JSON.stringify(this.serialize(), null, 2)),
        (z.innerHTML = JSON.stringify(this.serializeTree(), null, 2));
}
