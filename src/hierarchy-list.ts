/**
 * 'Context' is for storing inter list items
 * to allow moving item of one list to other.
 */

/**
 * Configuartion options that are optional for user
 * but required internally.
 * Will be populated in the constructor
 */
interface Config {
    listTag?: 'ul' | 'ol' | 'div';
    listSelector?: string;
    itemSelector?: string;
    handleSelector?: string;

    threshold?: number;
    context?: number | string;
    expandBtn?: string;
    collapseBtn?: string;
    extractBtn?: string;

    listClass?: string | string[];
    activeClass?: string | string[];
    dragClass?: string | string[];
}

/**
 * Required version of the `Config`
 */
type InternalConfig = {
    [K in keyof Config]-?: Config[K];
} & {
    listClass: string[];
    activeClass: string[];
    dragClass: string[];
};

/**
 * Return type of serialize function
 *  [
 *      {
 *          data: {},
 *          parent: -1
 *      },
 *      {
 *          data: {},
 *          parent: 0
 *      }
 *  ]
 */
type SerializedFlat = Array<{
    data: DOMStringMap;
    parent: number;
}>;

/**
 * Return type of serializeTree function
 *  [
 *      {
 *          data: {},
 *          children: [{
 *              data: {},
 *              parent: 0
 *          }]
 *      }
 *  ]
 */
type SerializedTree = Array<{
    data: DOMStringMap;
    children: SerializedTree;
}>;

/**
 * Name of the events
 */
type Events =
    | 'change'
    | 'beforemove'
    | 'aftermove'
    | 'start'
    | 'release'
    | 'rightmove'
    | 'leftmove'
    | 'moveout'
    | 'movein'
    | 'extract';

/**
 * Event data that will be passed as an argument is callbacks
 */
interface ListEvent {
    item: Element;
    from?: Element | null;
    to?: Element | null;
}

/**
 * Signature of the event listener functions
 */
type EventCallback = (this: HierarchyList, event: ListEvent) => void;

/**
 * We need a common drag event type to handle both mouse
 * and touch movements
 */

interface DragEvent {
    x: number;
    y: number;
}

/**
 * Default configuartion options
 */
const DEFAULT_CONFIG: InternalConfig = {
    listTag: 'ul',
    listSelector: 'ul',
    itemSelector: 'li',
    handleSelector: '.phl-handle',

    listClass: ['phl-list'],
    activeClass: ['phl-active'],
    dragClass: ['phl-drag'],
    threshold: 20,
    context: 0,
    expandBtn: '.phl-expand',
    collapseBtn: '.phl-collapse',
    extractBtn: '.phl-extract',
};

// The Context cache
const CONTEXTS = new Map<number | string, Context>();

/**
 * The Context class that stores the event handlers
 * and common data
 */

class Context {
    dragEl?: HTMLElement;
    activeEl?: HTMLElement;
    overEl?: HTMLElement;
    from?: Element | null;
    to?: Element | null;

    lastMouseY: number;
    lastStepX: number;
    lastMove: number;

    instances: HierarchyList[] = [];

    movedFrom?: HierarchyList;

    constructor(list: HierarchyList) {
        this.lastMouseY = 0;
        this.lastStepX = 0;
        this.lastMove = 0;
        this.instances.push(list);
    }

    public register(list: HierarchyList) {
        this.instances.push(list);
    }

    public dispatch(event: Events) {
        if (!this.activeEl) {
            return;
        }
        for (let i = 0; i < this.instances.length; i++) {
            const list = this.instances[i];
            if (!list.getElement().contains(this.activeEl)) {
                continue;
            }
            const events = list.events.get(event);
            if (!events) {
                return;
            }
            events.forEach((cb) => {
                cb.call(list, {
                    item: this.activeEl as Element,
                    from: this.from,
                    to: this.to,
                });
            });
            return;
        }
    }
}

export class HierarchyList {
    /**
     * Context of this instance
     */
    private ctx: Context;

    /**
     * Root element of this instance
     */
    private element: HTMLElement;

    /**
     * Configuartions for this instance
     */
    private opts: InternalConfig;

    /**
     * A map of registered events
     */
    public events: Map<Events, Array<EventCallback>> = new Map();

    /**
     * Stores if the device supports touch
     */
    private hasTouch: boolean =
        'ontouchstart' in window || (navigator.maxTouchPoints as any);

    //@ts-ignore
    private onMouseMoveFn: (evt: MouseEvent) => void;
    //@ts-ignore
    private onTouchMoveFn: (evt: TouchEvent) => void;
    //@ts-ignore
    private cleanUpEvt: () => void;
    /**
     * A helper function for initialization
     */

    public static make(
        element: HTMLElement | string,
        options?: Config
    ): HierarchyList {
        return new HierarchyList(element, options);
    }

    constructor(element: HTMLElement | string, options?: Config) {
        /**
         * If element is a string then find it using query selector
         * otherwise use the element
         */

        if (typeof element === 'string') {
            //@ts-ignore
            this.element = find(element);
            if (!this.element) {
                throw new Error('Provided element does not exist!');
            }
        } else {
            this.element = element;
        }

        /**
         * Prevent from creating multiple list instances on the same element
         */
        // @ts-expect-error manipulating built-in element
        if (typeof this.element.__hierarchy_list_saad === 'undefined') {
            //@ts-ignore
            this.element.__hierarchy_list_saad = true;
        } else {
            throw new Error(
                'Trying to create multiple HierarchyList in one element!'
            );
        }

        // Merge provided options with the default one
        // @ts-ignore
        this.opts = { ...DEFAULT_CONFIG, ...(options || {}) };

        /**
         * Check if the provided context is a string or number
         * If not then assign it the default value
         */
        if (['string', 'number'].indexOf(typeof this.opts.context) === -1) {
            this.opts.context = '_saad_';
        }

        /**
         * First try to get Context from the CONTEXTS cache,
         * if does not exist then create a new one
         */
        let ctx = CONTEXTS.get(this.opts.context);
        if (!ctx) {
            ctx = new Context(this);
            CONTEXTS.set(this.opts.context, ctx);
        } else {
            // Register current list in the context
            ctx.register(this);
        }
        this.ctx = ctx;

        // Set the listSelector = listTag if selector is not specified
        if (!this.opts.listSelector) {
            this.opts.listSelector = this.opts.listTag;
        }

        ['listClass', 'activeClass', 'dragClass'].forEach((cKey) => {
            // @ts-ignore
            if (typeof this.opts[cKey] === 'string') {
                //@ts-ignore
                this.opts[cKey] = this.opts[cKey].split(' ');
            }
        });

        this.init();
    }

    private init() {
        /**
         * Event handler for mousemove.
         * We need to declare it here because we'll add the listener on mousedown
         * and remove it when click is released.
         */
        this.onMouseMoveFn = (evt: MouseEvent) => {
            this.onDrag(evt);
        };

        /**
         * Event handler for touchmove.
         * We need to declare it here because we'll add the listener on mousedown
         * and remove it when click is released.
         */
        this.onTouchMoveFn = (evt: TouchEvent) => {
            this.onTouchMove(evt);
        };

        /**
         * Same as `onTouchMoveFn` & `onMouseMoveFn` but this one is used to cleanup the
         * registered events and context to improve the performance
         * for other activities in the browser
         */
        this.cleanUpEvt = () => {
            // Remove the drag element from dom tree
            this.ctx.dragEl?.remove();

            if (this.ctx.activeEl) {
                // Remove the active class from moved element
                rmClass(this.ctx.activeEl, this.opts.activeClass);

                // Dispatch release event
                this.ctx.dispatch('release');
            }

            // Clear the context
            this.ctx.dragEl = undefined;
            this.ctx.activeEl = undefined;
            this.ctx.overEl = undefined;

            this.ctx.from = null;
            this.ctx.to = null;

            // Remove the event listeners added in the document
            document.removeEventListener('mousemove', this.onMouseMoveFn);
            document.removeEventListener('mouseup', this.cleanUpEvt);

            document.removeEventListener('touchmove', this.onTouchMoveFn);
            document.removeEventListener('touchend', this.cleanUpEvt);
        };

        // Register all items in the given container
        findAll(this.opts.handleSelector, this.element).forEach((handle) => {
            this.initHandle(handle);
        });

        /**
         * Sometimes the given element might not be an listItem
         * and sometimes it will be.
         * When it is not a list element, we need to add currently dragged
         * element in the first list element.
         */

        this.element.addEventListener('mouseenter', () => {
            if (!this.ctx.activeEl) {
                return;
            }
            if (this.element.matches(this.opts.listSelector)) {
                this.element.appendChild(this.ctx.activeEl);
            } else {
                const list = find(this.opts.listSelector, this.element);
                if (list) {
                    this.moveTo(list);
                }
            }

            /**
             * Dispatch the movedOut event
             */
            if (this.ctx.movedFrom) {
                const outEvts = this.ctx.movedFrom.events.get('moveout');
                if (outEvts) {
                    outEvts.forEach((cb) => {
                        cb.call(this.ctx.movedFrom as HierarchyList, {
                            item: this.ctx.activeEl as Element,
                        });
                    });
                }
                this.ctx.movedFrom = undefined;
            }

            /**
             * Dispatch the movein event
             */
            const evts = this.events.get('movein');
            if (!evts) {
                return;
            }
            evts.forEach((cb) => {
                cb.call(this, {
                    item: this.ctx.activeEl as Element,
                });
            });
        });

        /**
         * Dispatch element out
         * we need to dispatch it from here because when the item
         * moves outside of this.element, ctx.dispatch will not fire it
         */
        this.element.addEventListener('mouseleave', () => {
            if (!this.ctx.activeEl) {
                return;
            }
            this.ctx.movedFrom = this;
        });
    }

    /**
     * Register events on the items that can be moved
     */
    private initHandle(handle: HTMLElement) {
        const start = (evt: MouseEvent | TouchEvent) => {
            /**
             * Prevent default behavior of the browser when clicked
             * sometimes touchstart is not cancellable (i.e. when scrolling)
             */
            if (evt.cancelable) {
                evt.preventDefault();
            } else {
                return;
            }
            evt.stopPropagation();

            /**
             * Make a clone of the active element to move with mouse
             * and add given css classes.
             */
            this.ctx.dragEl = el.cloneNode(true) as HTMLElement;
            addClass(this.ctx.dragEl, this.opts.dragClass);
            document.body.appendChild(this.ctx.dragEl);

            /**
             * Set the styles that are crucial for it to function
             * * style.position = 'absolute'
             * * style.pointerEvents = 'none' (So that it does not interfere with mouse events)
             */
            this.ctx.dragEl.style.position = 'fixed';
            this.ctx.dragEl.style.pointerEvents = 'none';

            /**
             * Set the activeEl that will be moved
             * and the the activeClass provided in the options
             */
            this.ctx.activeEl = el;
            addClass(this.ctx.activeEl, this.opts.activeClass);

            /**
             * Add event listeners to the document so that
             * we can track it's movement all over the window
             */
            document.addEventListener('mousemove', this.onMouseMoveFn);
            document.addEventListener('mouseup', this.cleanUpEvt);
            if (this.hasTouch) {
                document.addEventListener('touchmove', this.onTouchMoveFn);
                document.addEventListener('touchend', this.cleanUpEvt);
            }

            let posX, posY;

            if ('x' in evt && 'y' in evt) {
                posX = evt.x;
                posY = evt.y;
            } else {
                posX = evt.touches[0].clientX;
                posY = evt.touches[0].clientY;
            }

            /**
             * We need to track mouse movements to detect if nest/unnest
             * the element
             */
            this.ctx.lastMouseY = posY;

            // Last position after any nesting/unnesting
            this.ctx.lastStepX = posX;
            // Set initial position
            this.ctx.dragEl.style.left = posX + 'px';
            this.ctx.dragEl.style.top = posY + 'px';

            // Dispatch start event
            this.ctx.from = this.ctx.activeEl.parentElement;
            this.ctx.to = null;
            this.ctx.dispatch('start');
        };

        /**
         * Handle might be any element inside of item
         * in that case find the closest item and use that as the element
         */
        const el = handle.closest(this.opts.itemSelector) as HTMLElement;
        if (!el) {
            return;
        }

        handle.addEventListener('mousedown', start);

        if (this.hasTouch) {
            handle.addEventListener('touchstart', (evt: TouchEvent) => {
                /**
                 * Only start dragging if there's one touch
                 * two or more are for zoom/pinch or other actions
                 * we don't want to mess with
                 */
                if (evt.touches.length !== 1) {
                    return;
                }
                start(evt);
            });
        }

        /**
         * Add event listeners for when an element is dragged over
         * this and dragged out of this
         */
        el.addEventListener('mouseenter', () => this.onOver(el));

        // Add listeners for button actions (expand, collapse, extract)
        this.btnEvts(el);
    }

    private btnEvts(el: HTMLElement) {
        const expand = find(this.opts.expandBtn, el);
        const collapse = find(this.opts.collapseBtn, el);
        const extract = find(this.opts.extractBtn, el);
        const innerList = find(this.opts.listSelector, el);

        const listStyle: any = innerList ? getComputedStyle(innerList) : {};

        if (expand) {
            /**
             * Hide the expand button if the innerList is already expanded
             */
            if (listStyle.display === 'none') {
                expand.style.display = '';
            } else {
                expand.style.display = 'none';
            }
            expand.addEventListener('click', () => {
                this.expand(
                    expand.closest(this.opts.itemSelector) as HTMLElement
                );
            });
        }

        if (collapse) {
            /**
             * Hide the collapse button if the innerList is already collapsed
             */
            if (listStyle.display === 'none' || !innerList) {
                collapse.style.display = 'none';
            } else {
                collapse.style.display = '';
            }
            collapse.addEventListener('click', () => {
                this.collapse(
                    collapse.closest(this.opts.itemSelector) as HTMLElement
                );
            });
        }

        if (extract) {
            /**
             * If the innerlist does not exist and/or is empty then
             * remove the list & hide the extract button.
             * Otherwise show the expand button
             */
            if (!innerList || innerList.children.length === 0) {
                innerList?.remove();
                extract.style.display = 'none';
            } else {
                extract.style.display = '';
            }
            extract.addEventListener('click', () => {
                this.extract(
                    extract.closest(this.opts.itemSelector) as HTMLElement
                );
            });
        }
    }

    /**
     * Set the target element when dragged over this
     */
    private onOver(el: HTMLElement) {
        if (!this.ctx.activeEl) {
            return;
        }

        if (this.ctx.activeEl.contains(el)) {
            this.ctx.overEl = undefined;
            return;
        }
        this.ctx.overEl = el;
    }

    private onTouchMove(evt: TouchEvent) {
        const touch = evt.touches[0];

        const over = document.elementFromPoint(touch.clientX, touch.clientY);
        const li = over?.closest(this.opts.itemSelector);
        if (li && this.element.contains(li)) {
            this.onOver(li as HTMLElement);
        }

        this.onDrag({
            x: touch.clientX,
            y: touch.clientY,
        });
    }

    private onDrag(evt: DragEvent) {
        const el = this.ctx.dragEl as HTMLElement;

        el.style.left = evt.x + 'px';
        el.style.top = evt.y + 'px';

        /**
         * When an item is unnested/nested it might take time to
         * adjust the parent size.
         * If we don't wait for a minimum time, onDrag gets fired again
         * and the left-right movement is undone.
         */
        if (Date.now() - this.ctx.lastMove < 100) {
            return;
        }
        this.ctx.lastMove = Date.now();

        /**
         * Store the last Y position and set the new one
         */
        const lastYPos = this.ctx.lastMouseY;
        this.ctx.lastMouseY = evt.y;

        // Last X position of the mouse when it was last nested/unnested
        const lX = this.ctx.lastStepX;

        /**
         * If the mouse is moved `threshold` amount of pixels in the right direction
         * then nest the item to it's previous sibling
         */
        if (evt.x - lX > this.opts.threshold) {
            this.toRight();
            this.ctx.lastStepX = evt.x;
        } else if (lX - evt.x > this.opts.threshold) {
            /**
             * If the mouse is moved `threshold` amount of pixels in the left direction
             * then unnest the item
             */
            this.toLeft();
            this.ctx.lastStepX = evt.x;

            /**
             * Return so that this unnesting does not get undone
             * in the same cycle.
             */
            return;
        }

        const target = this.ctx.overEl;
        if (!target) {
            return;
        }

        const targetRect = target.getBoundingClientRect();

        /**
         * If the item is dragged from the top then insert after the target element
         * otherwise insert before the target element
         */
        if (lastYPos < evt.y) {
            if (evt.y > targetRect.top) {
                this.moveTo(
                    target.parentElement as HTMLElement,
                    target.nextElementSibling
                );
            }
        } else {
            if (evt.y < targetRect.top + targetRect.height) {
                this.moveTo(target.parentElement as HTMLElement, target);
            }
        }
    }

    /**
     * Move the item one step right (nest)
     */
    private toRight() {
        const active = this.ctx.activeEl;
        const target = this.ctx.activeEl?.previousElementSibling as HTMLElement;
        if (!active || !target) {
            return;
        }

        /**
         * If there is no list in the target element then create a new one
         * otherwise use the exixting one
         */
        let list = find(this.opts.listSelector, target);
        if (!list) {
            list = document.createElement(this.opts.listTag) as HTMLElement;
            addClass(list, this.opts.listClass);
            target.appendChild(list);
        }

        this.moveTo(list);

        // Expand the target
        this.expand(target);

        // Show the extract button
        const extract = find(this.opts.extractBtn, target);
        if (extract) {
            extract.style.display = '';
        }

        // Dispatch rightmove event
        this.ctx.dispatch('rightmove');
    }

    /**
     * Move the item one step left (unnest)
     */
    private toLeft() {
        /**
         * If `after` belongs to an 'itemSelector' then we need to make the move.
         * Otherwise return, cos it is already in the outermost list
         */
        const parentList = this.ctx.activeEl?.parentElement;
        const after = parentList?.closest(this.opts.itemSelector);
        if (!after) {
            return;
        }
        this.moveTo(
            after.parentElement as HTMLElement,
            after.nextElementSibling
        );

        // Dispatch lefttmove event
        this.ctx.dispatch('leftmove');
    }

    /**
     * Move the item to the given parent and cleanup the old parent
     */
    private moveTo(to: HTMLElement, before: Node | null = null) {
        if (!this.ctx.activeEl) {
            return;
        }

        /**
         * The closest list (listSelector) element before making the move
         */
        const list = this.ctx.activeEl?.closest(
            this.opts.listSelector
        ) as HTMLElement;

        /**
         * The itemSelector element which contains the list before moving
         */
        const lastOf = list?.closest(this.opts.itemSelector);

        // Update the context for accurate event data
        this.ctx.from = this.ctx.activeEl.parentElement;
        this.ctx.to = to;

        // Dispatch beforemove event
        this.ctx.dispatch('beforemove');

        to.insertBefore(this.ctx.activeEl, before);

        /**
         * If the old list is empty then remove it
         * frfom the dom tree
         */
        if (list && list.children.length === 0) {
            list.remove();

            /**
             * If the itemSelector element that contained the item has
             * no inner lists, hide the action buttons
             */
            if (lastOf) {
                this.hideAllActions(lastOf as HTMLElement);
            }
        }

        // Dispatch aftermove event
        this.ctx.dispatch('aftermove');
    }

    /**
     * Expand the inner list
     */
    private expand(el: HTMLElement) {
        const expand = find(this.opts.expandBtn, el);
        const collapse = find(this.opts.collapseBtn, el);

        // First hide the expand button as the list will be expanded
        if (expand) {
            expand.style.display = 'none';
        }

        // Show the list if there is any
        const list = find(this.opts.listSelector, el);
        if (!list) {
            return;
        }
        list.style.display = '';

        // Show the collapse button if the list existsed
        if (collapse) {
            collapse.style.display = '';
        }
    }

    private collapse(el: HTMLElement) {
        const expand = find(this.opts.expandBtn, el);
        const collapse = find(this.opts.collapseBtn, el);

        // First hide the collapse button as the list will be collapsed
        if (collapse) {
            collapse.style.display = 'none';
        }
        // Show the list if there is any
        const list = find(this.opts.listSelector, el);
        if (!list) {
            return;
        }
        list.style.display = 'none';

        // Show the expand button if the list existsed
        if (expand) {
            expand.style.display = '';
        }
    }

    private extract(el: HTMLElement) {
        // Return if there is no inner list
        const subList = find(this.opts.listSelector, el);
        const parent = el.parentElement;
        if (!subList || !parent) {
            return;
        }

        /**
         * Set the from & to for event listener
         */
        this.ctx.from = subList;
        this.ctx.to = parent;

        const beforeOf = el.nextElementSibling;
        /**
         * Move all immediate children of the inner list to the parent list
         * and place them after the old owner
         */
        while (subList.children.length) {
            parent.insertBefore(subList.children[0], beforeOf);
        }

        //  Remove the inner list
        subList.remove();

        // As there is no innerlist, hide the buttons
        this.hideAllActions(el);

        // Dispatch the extract event
        this.ctx.dispatch('extract');

        //Clean the context
        this.ctx.from = null;
        this.ctx.to = null;
    }

    /**
     * Hiding all actions are used in `three` places,
     * I think they deserve a separate function
     */
    private hideAllActions(el: HTMLElement) {
        const extract = find(this.opts.extractBtn, el);
        const expand = find(this.opts.expandBtn, el);
        const collapse = find(this.opts.collapseBtn, el);
        if (expand) {
            expand.style.display = 'none';
        }
        if (collapse) {
            collapse.style.display = 'none';
        }
        if (extract) {
            extract.style.display = 'none';
        }
    }

    /**
     * This function registers event handlers
     * @param event name of the event
     * @param callback function to execute
     */
    public on(
        events: Events | Events[],
        callback: EventCallback
    ): HierarchyList {
        if (typeof events === 'string') {
            events = [events];
        }
        events.forEach((event) => {
            if (event === 'change') {
                this.on(['release', 'moveout', 'extract', 'movein'], callback);
                return;
            }
            let arr = this.events.get(event);
            if (!arr) {
                arr = [];
                this.events.set(event, arr);
            }
            if (arr.indexOf(callback) === -1) {
                arr.push(callback);
            }
        });
        return this;
    }

    public serialize(): SerializedFlat {
        return HierarchyList.serialize(this.element, this.opts.listSelector);
    }

    public serializeTree(): SerializedTree {
        return HierarchyList.serializeTree(
            this.element,
            this.opts.listSelector
        );
    }

    public static serialize(
        element: HTMLElement,
        listSelector: string = 'ul,ol'
    ): SerializedFlat {
        /**
         * If the element is not a listSelector then
         * find the first listSelector element.
         * Throw error if not found
         */
        if (element && !element.matches(listSelector)) {
            element = find(listSelector, element) as HTMLElement;
        }
        if (!element) {
            throw new Error('No element is given to serialize!');
        }

        const arr: SerializedFlat = [];
        this._serializeFlat(element as HTMLElement, -1, arr, listSelector);
        return arr;
    }

    private static _serializeFlat(
        list: HTMLElement,
        parent: number,
        arr: SerializedFlat,
        listSelector: string
    ) {
        for (let i = 0; i < list.children.length; i++) {
            const child = list.children[i] as HTMLLIElement;
            const val = { data: child.dataset, parent };
            arr.push(val);
            const inner = find(listSelector, child);
            if (inner) {
                this._serializeFlat(
                    inner as HTMLElement,
                    arr.length - 1,
                    arr,
                    listSelector
                );
            }
        }
    }

    public static serializeTree(
        element: HTMLElement,
        listSelector: string = 'ol,ul'
    ): SerializedTree {
        /**
         * If the element is not a listSelector then
         * find the first listSelector element.
         * Throw error if not found
         */
        if (element && !element.matches(listSelector)) {
            element = find(listSelector, element) as HTMLElement;
        }
        if (!element) {
            throw new Error('No element is given to serialize!');
        }

        const arr: SerializedTree = [];
        this._serializeTree(element as HTMLElement, arr, listSelector);
        return arr;
    }

    private static _serializeTree(
        list: HTMLElement,
        arr: SerializedTree,
        listSelector: string
    ) {
        for (let i = 0; i < list.children.length; i++) {
            const child = list.children[i] as HTMLLIElement;
            const children: SerializedTree = [];
            const inner = find('ul,li', child);
            if (inner) {
                this._serializeTree(
                    inner as HTMLElement,
                    children,
                    listSelector
                );
            }
            arr.push({
                data: child.dataset,
                children,
            });
        }
    }

    /**
     * Get the main elemnt
     * @returns {HTMLElement}
     */
    public getElement(): HTMLElement {
        return this.element;
    }

    public addItem(
        item: HTMLElement,
        target?: {
            before?: HTMLElement | string;
            after?: HTMLElement | string;
            inside?: HTMLElement | string;
        }
    ) {
        if (!item.matches(this.opts.itemSelector)) {
            console.error(`[HierarchyList] provided item does not match: ${this.opts.itemSelector}`);
            return;
        }
        
        
        let handle: any = item;
        if (!handle.matches(this.opts.handleSelector)) {
            handle = find(this.opts.handleSelector, item);
        }
        
        if (!handle) {
            console.error(`[HierarchyList] provided item does not have any handle: '${this.opts.handleSelector}'`);
            return;
        }

        this.initHandle(handle);
        
        if (!target) {
            // If there is no target then just append it in the list
            let list: any = this.element;
            if (!list.matches(this.opts.listSelector)) {
                list = find(this.opts.listSelector, list);
            }
            if (list) {
                list.appendChild(item);
            }
            return;
        }

        if (typeof target.before === 'string') {
            target.before = find(target.before, this.element) as HTMLElement;
        }
        if (target.before) {
            target.before.parentElement?.insertBefore(item, target.before);
            return;
        }

        if (typeof target.after === 'string') {
            target.after = find(target.after, this.element) as HTMLElement;
        }
        if (target.after) {
            target.after.parentElement?.insertBefore(
                item,
                target.after.nextElementSibling
            );
            return;
        }

        if (typeof target.inside === 'string') {
            target.inside = find(target.inside, this.element) as HTMLElement;
        }
        if (target.inside) {
            if (target.inside.matches(this.opts.listSelector)) {
                target.inside.appendChild(item);
                return;
            }
            let list = find(this.opts.listSelector, target.inside);
            if (!list) {
                list = document.createElement(this.opts.listTag) as HTMLElement;
                addClass(list, this.opts.listClass);
                target.inside.appendChild(list);
            }

            list.appendChild(item);
    
            // Expand the target
            this.expand(list);
    
            // Show the extract button
            const extract = find(this.opts.extractBtn, list);
            if (extract) {
                extract.style.display = '';
            }
        }

        console.warn('[HierarchyList] No target found to insert at: ', target);
    }
}

function find(selector: string, parent?: HTMLElement): HTMLElement | null {
    return (parent || document).querySelector(selector);
}

function findAll(
    selector: string,
    parent?: HTMLElement
): NodeListOf<HTMLElement> {
    return (parent || document).querySelectorAll(selector);
}

function rmClass(el: HTMLElement, classes: string[]) {
    classes.forEach((name) => el.classList.remove(name));
}

function addClass(el: HTMLElement, classes: string[]) {
    classes.forEach((name) => el.classList.add(name));
}

export default HierarchyList;
//@ts-ignore
if (window && typeof window.HierarchyList === 'undefined') {
    //@ts-ignore
    window.HierarchyList = HierarchyList;
}
