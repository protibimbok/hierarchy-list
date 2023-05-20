import './style.css';

/**
 * 'Context' is for storing inter list items
 * to allow moving item of one list to other.
 */

interface Context {
    dragEl?: HTMLElement;
    activeEl?: HTMLElement;
    overEl?: HTMLElement;
    lastMouseY: number;
    lastStepX: number;
    lastMove: number;
}

/**
 * Listeners for various events
 */
interface EventListeners {
    beforeMove?: (
        this: HierarchyList,
        item: HTMLElement,
        oldParent: HTMLElement
    ) => void;
    afterMove?: (
        this: HierarchyList,
        item: HTMLElement,
        newParent: HTMLElement
    ) => void;
    onStart?: (this: HierarchyList, item: HTMLElement) => void;
    onRelease?: (this: HierarchyList, item: HTMLElement) => void;
    onLeftMove?: (
        this: HierarchyList,
        item: HTMLElement,
        newParent: HTMLElement
    ) => void;
    onRightMove?: (
        this: HierarchyList,
        item: HTMLElement,
        newParent: HTMLElement
    ) => void;
}

/**
 * Configuartion options that are optional for user
 * but required internally.
 * Will be populated in the constructor
 */
interface BaseConfig {
    listTag?: 'ul' | 'ol' | 'div';
    listSelector?: string;
    itemSelector?: string;
    handleSelector?: string;

    threshold?: number;
    context?: Context;
    expandBtn?: string;
    collapseBtn?: string;
    extractBtn?: string;

    listClass?: string | string[];
    activeClass?: string | string[];
    dragClass?: string | string[];
}

/**
 * Merged BaseConfig & EventListeners
 */
type Config = BaseConfig & EventListeners;

/**
 * Required version of the `Config`
 */
type InternalConfig = {
    [K in keyof BaseConfig]-?: BaseConfig[K];
} & EventListeners & {
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
 * Default instance for context
 * all instances that does not provide
 * a context will have this one
 */
const DEFAULT_CTX: Context = {
    lastMouseY: 0,
    lastStepX: 0,
    lastMove: 0,
};

/**
 * Default configuartion options
 */
const DEFAULT_CONFIG: InternalConfig = {
    listTag: 'ul',
    listSelector: 'ul',
    itemSelector: 'li',
    handleSelector: '[data-phl="handle"]',

    listClass: ['phl-list'],
    activeClass: ['phl-active'],
    dragClass: ['phl-drag'],
    threshold: 20,
    context: DEFAULT_CTX,
    expandBtn: '[data-phl="expand"]',
    collapseBtn: '[data-phl="collapse"]',
    extractBtn: '[data-phl="extract"]',
};

export default class HierarchyList {
    /**
     * Context of this instance
     */
    ctx: Context;

    /**
     * Root element of this instance
     */
    element: HTMLElement;

    /**
     * Configuartions for this instance
     */
    opts: InternalConfig;

    /**
     * A helper function for initialization
     */

    public static make(
        element: HTMLElement | string,
        options: Config
    ): HierarchyList {
        return new HierarchyList(element, options);
    }

    constructor(element: HTMLElement | string, options: Config) {
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

        // Merge provided options with the default one
        // @ts-ignore
        this.opts = { ...DEFAULT_CONFIG, ...options };

        // Validate & re-assign the context in case it was invalid
        this.ctx = this.opts.context || DEFAULT_CTX;

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
        const onDragFn = (evt: MouseEvent) => {
            this.onDrag(evt);
        };

        /**
         * Same as `onDragFn` but this one is used to cleanup the
         * registered events and context to improve the performance
         * for other activities in the browser
         */
        const cleanUpEvt = () => {
            // Remove the drag element from dom tree
            this.ctx.dragEl?.remove();

            if (this.ctx.activeEl) {
                // Remove the active class from moved element
                rmClass(this.ctx.activeEl, this.opts.activeClass);

                //* Dispatch events
                if (this.opts.onRelease) {
                    this.opts.onRelease.call(this, this.ctx.activeEl);
                }
            }

            // Clear the context
            this.ctx.dragEl = undefined;
            this.ctx.activeEl = undefined;
            this.ctx.overEl = undefined;

            // Remove the event listeners added in the document
            document.removeEventListener('mousemove', onDragFn);
            document.removeEventListener('mouseup', cleanUpEvt);
        };

        // Register all items in the given container
        findAll(this.opts.handleSelector, this.element).forEach((handle) => {
            this.initItem(handle, {
                onDragFn,
                cleanUpEvt,
            });
        });

        /**
         * Sometimes the given element might not be an listItem
         * and sometimes it will be.
         * When it is not a list element, we need to add currently dragged
         * element in the first list element.
         * If it is a list element then add normal event listeners as all lists.
         */

        if (this.element.matches(this.opts.listSelector)) {
            this.listEvts(this.element as HTMLElement);
        } else {
            this.element.addEventListener('mouseenter', () => {
                if (!this.ctx.activeEl) {
                    return;
                }
                const list = find(this.opts.listSelector, this.element);
                if (list) {
                    this.moveTo(list);
                }
            });
        }

        // Add event listeners to all list element
        findAll(this.opts.listSelector, this.element).forEach(this.listEvts);
    }

    /**
     * Register events on the items that can be moved
     */
    private initItem(handle: HTMLElement, { onDragFn, cleanUpEvt }: any) {
        /**
         * Handle might be any element inside of item
         * in that case find the closest item and use that as the element
         */
        const el = handle.closest(this.opts.itemSelector) as HTMLElement;
        if (!el) {
            return;
        }

        handle.addEventListener('mousedown', (evt) => {
            /**
             * Prevent default behavior of the browser when clicked
             */
            evt.preventDefault();
            evt.stopPropagation();

            /**
             * We need to track mouse movements to detect if nest/unnest
             * the element
             */
            this.ctx.lastMouseY = evt.y;

            // Last position after any nesting/unnesting
            this.ctx.lastStepX = evt.x;

            /**
             * Set the activeEl that will be moved
             * and the the activeClass provided in the options
             */
            this.ctx.activeEl = el;
            addClass(this.ctx.activeEl, this.opts.activeClass);

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
            this.ctx.dragEl.style.position = 'absolute';
            this.ctx.dragEl.style.pointerEvents = 'none';

            // Set initial position
            this.ctx.dragEl.style.left = evt.x + 'px';
            this.ctx.dragEl.style.top = evt.y + 'px';

            /**
             * Add event listeners to the document so that
             * we can track it's movement all over the window
             */
            document.addEventListener('mousemove', onDragFn);
            document.addEventListener('mouseup', cleanUpEvt);

            //* Dispatch events
            if (this.opts.onStart) {
                this.opts.onStart.call(this, el);
            }
        });

        /**
         * Add event listeners for when an element is dragged over
         * this and dragged out of this
         */
        el.addEventListener('mouseenter', () => this.onOver(el));
        el.addEventListener('mouseleave', () => this.onLeave(el));

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
                this.expand(expand.closest(this.opts.itemSelector) as HTMLElement);
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
                this.collapse(collapse.closest(this.opts.itemSelector) as HTMLElement);
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
                this.extract(extract.closest(this.opts.itemSelector) as HTMLElement);
            });
        }
    }

    /**
     * Add event listeners on the list elements
     * For now it's just inserting items on dragover.
     */
    private listEvts(el: HTMLElement | HTMLElement) {
        el.addEventListener('mouseenter', () => {
            // An item might get dragged over itself, filter that out
            if (!this.ctx.activeEl || this.ctx.activeEl.contains(el)) {
                return;
            }
            this.moveTo(el);
        });
    }

    private onDrag(evt: MouseEvent) {
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
     * Set the target element when dragged over this
     */
    private onOver(el: HTMLElement) {
        if (!this.ctx.dragEl) {
            return;
        }

        if (this.ctx.activeEl?.contains(el)) {
            this.ctx.overEl = undefined;
            return;
        }
        this.ctx.overEl = el;
    }

    /**
     * Unset the target element when mouse is left
     */
    private onLeave(_el: HTMLElement) {
        if (!this.ctx.dragEl) {
            return;
        }
        this.ctx.overEl = undefined;
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
            this.listEvts(list);
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

        //* Dispatch events
        if (this.opts.onRightMove) {
            this.opts.onRightMove.call(this, active, list);
        }
    }

    /**
     * Move the item one step left (unnest)
     */
    private toLeft() {
        const parentList = this.ctx.activeEl?.closest(this.opts.listSelector);
        const after = parentList?.closest(this.opts.itemSelector);
        /**
         * Do nothing if it's already in the outermost list
         */
        if (!after) {
            return;
        }
        this.moveTo(
            after.parentElement as HTMLElement,
            after.nextElementSibling
        );

        //* Dispatch events
        if (this.opts.onLeftMove) {
            this.opts.onLeftMove.call(
                this,
                this.ctx.activeEl as HTMLElement,
                after.parentElement as HTMLElement
            );
        }
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

        //* Dispatch beforeMove event
        if (this.opts.beforeMove) {
            this.opts.beforeMove.call(this, this.ctx.activeEl, list);
        }

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

        //* Dispatch afterMove event
        if (this.opts.afterMove) {
            this.opts.afterMove.call(this, this.ctx.activeEl, to);
        }
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
            console.log('Here', el);

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
        if (!subList || !parent) {
            return;
        }

        const beforeOf = el.nextElementSibling;
        /**
         * Move all immediate children of the inner list to the parent list
         * and place them after the old owner
         */
        while (subList.children.length) {
            el.parentElement?.insertBefore(subList.children[0], beforeOf);
        }

        //  Remove the inner list
        subList.remove();

        // As there is no innerlist, hide the buttons
        this.hideAllActions(el);
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

    public serialize(): SerializedFlat {
        return HierarchyList.serialize(this.element, this.opts.listSelector);
    }

    public serializeTree(): SerializedTree {
        return HierarchyList.serializeTree(this.element, this.opts.listSelector);
    }

    public static serialize(element: HTMLElement, listSelector: string= 'ul,ol'): SerializedFlat {
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
                this._serializeFlat(inner as HTMLElement, arr.length - 1, arr, listSelector);
            }
        }
    }

    public static serializeTree(element: HTMLElement, listSelector: string = 'ol,ul'): SerializedTree {
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

    private static _serializeTree(list: HTMLElement, arr: SerializedTree, listSelector: string) {
        for (let i = 0; i < list.children.length; i++) {
            const child = list.children[i] as HTMLLIElement;
            const children: SerializedTree = [];
            const inner = find('ul,li', child);
            if (inner) {
                this._serializeTree(inner as HTMLElement, children, listSelector);
            }
            arr.push({
                data: child.dataset,
                children,
            });
        }
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
