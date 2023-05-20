# hierarchy-list

HierarchyList is a lightweight JavaScript library that enables users to create and edit nested lists with ease. It provides a user-friendly interface for managing hierarchical data, allowing items to be nested and unnested within a list.

## Installation

To start using HierarchyList, follow these steps:

1. Download the HierarchyList library from the official repository or include it via a package manager like npm or yarn.

    ```bash
    npm install hierarchy-list
    ```

    or add it directly from cdn:

    ```html
    <script src="https://cdn.jsdelivr.net/npm/hierarchy-list/dist/hierarchy-list.js"></script>
    ```

2. Make sure to have an HTML container element (e.g., a &lt;div&gt;) where you want the HierarchyList list to appear.
3. Optionally, include the HierarchyList CSS file (style.css) for default styling,
    ```javascript
    import 'hierarchy-list/dist/style.css';
    ```
    ```html
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/hierarchy-list/dist/style.css" />
    ```
    or style it according to your project's design.

## Features

HierarchyList offers the following key features:

-   **Drag-and-Drop**: Easily reorder items within the list by dragging and dropping them.
-   **Nested Lists**: Create hierarchical structures by nesting items under parent items.
-   **Expand/Collapse**: Collapse or expand nested lists for improved organization and readability.
-   **Event Hooks**: Implement custom functionality by listening to events such as item movement, nesting, and unnesting.
-   **Shared context**: You can easily move item from one list to another.
-   **Export**: You can export the list as tree or flat structure

## User Guide

To use HierarchyList, follow these steps:

-   Initialize HierarchyList: In your JavaScript file, initialize HierarchyList on your container element using the HierarchyList() constructor. For example:

    ```javascript
    const list = HierarchyList.make('#list-id', {
        // options
    });
    ```

-   Structure your list: Create an unordered list (&lt;ul&gt;) inside the container element. Each list item (&lt;li&gt;) represents an item in your list. You can nest items by adding child &lt;ul&gt; elements inside list items. For example:

    ```html
    <div id="list-id">
        <ul>
            <li data-phl="handle">Item 1</li>
            <li data-phl="handle">
                Item 2
                <ul>
                    <li data-phl="handle">Subitem 1</li>
                    <li data-phl="handle">Subitem 2</li>
                </ul>
            </li>
            <li data-phl="handle">Item 3</li>
        </ul>
    </div>
    ```

    Here `data-phl="handle"` tells the library that the item will be dragged by clicking in this element.

    > You can customize this selector however you want to.

-   Customize the appearance: You can apply custom CSS styles to the HierarchyList list to match your project's design. Use the provided CSS classes and selectors to target specific elements.

-   Handle events: HierarchyList provides event hooks that allow you to execute custom code when certain actions occur. Register event listeners on the HierarchyList instance to listen for these events. For example:

    ```javascript
    const list = HierarchyList.make('#list-id', {
        // other options
        onRelease: function () {
            // This will be called when user realeases mouse click after drag
        },
    });
    ```

An example with all functionalities:

```html
<ul class="shadow-lg rounded-md min-w-[300px] phl-list border" id="app1">
    <li class="p-4" data-index="0">
        <div class="phl-display">
            <button data-phl="handle">
                <div class="sr-only">Item Handle</div>
            </button>
            <div class="phl-label">Item 1</div>
            <button data-phl="extract">
                <div class="sr-only">Extract inner list</div>
            </button>
            <button data-phl="collapse">
                <div class="sr-only">Collapse inner list</div>
            </button>
            <button data-phl="expand">
                <div class="sr-only">Expand inner list</div>
            </button>
        </div>
    </li>
    <li class="p-4" data-index="1">
        <div class="phl-display">
            <button data-phl="handle">
                <div class="sr-only">Item Handle</div>
            </button>
            <div class="phl-label">Item 2</div>
            <button data-phl="extract">
                <div class="sr-only">Extract inner list</div>
            </button>
            <button data-phl="collapse">
                <div class="sr-only">Collapse inner list</div>
            </button>
            <button data-phl="expand">
                <div class="sr-only">Expand inner list</div>
            </button>
        </div>
    </li>
</ul>
```

## Serializaton

The HierarchyList library provides two methods, `list.serialize()` and `list.serializeTree()`, which allow users to retrieve serialized data representing the nested list structure. The library defines two return types, SerializedFlat and SerializedTree, to represent the serialized data in different formats.

### SerializedFlat Type

The SerializedFlat type represents the serialized data in a flat format. It is an array of objects, where each object contains the following properties:

-   **data**: An object representing the data associated with the list item. It contains key-value pairs using the DOMStringMap interface. It's actually `item.dataset`. All `data-*` attributes will be available here.
-   **parent**: The index of the parent item in the flat serialized array. The root items have a parent value of -1.

Here's an example of the serialized data structure returned by list.serialize() in the SerializedFlat format:

```typescript
[
    {
        data: {
            /* Item data */
        },
        parent: -1,
    },
    {
        data: {
            /* Item data */
        },
        parent: 0,
    },
    // Additional items...
];
```

### SerializedTree Type

The SerializedTree type represents the serialized data in a hierarchical tree structure. It is an array of objects, where each object represents a tree node and contains the following properties:

-   **data**: An object representing the data associated with the tree node. Same as **SerializedFlat**.
-   **children**: An array of nested tree nodes, each represented by another SerializedTree object.

Here's an example of the serialized data structure returned by list.serializeTree() in the SerializedTree format:

```typescript
[
    {
        data: {
            /* Node data */
        },
        children: [
            {
                data: {
                    /* Child node data */
                },
                children: [
                    /* Grandchild nodes... */
                ],
            },
            // Additional child nodes...
        ],
    },
    // Additional root nodes...
];
```

The SerializedTree format represents the nested structure of the list, where each node may have one or more children nodes.

By calling `list.serialize()` or `list.serializeTree()`, you can obtain the serialized data in either the flat or tree format, depending on their specific requirements for further processing or storage.

## Configuration

The HierarchyList library provides several configuration options to customize its behavior. These options allow you to control the HTML structure, styling, and event handling. The Config interface merges the options from both BaseConfig and EventListeners.

### Available Options:

-   **listTag** (optional, default: 'ul'): Specifies the HTML tag used for the main list. It can be either 'ul' (unordered list) or 'ol' (ordered list) or 'div'.

    > This is used for creating nested lists.

-   **listSelector** (optional, `default: listTag`): Allows you to specify a custom CSS selector for the main list element. If not provided, the library will use the listTag.

    > This option is important if you are using anything other than `ul` or `ol` for `listTag` option.

-   **itemSelector** (optional, default: li): Sets a custom CSS selector for the list item elements. This selector is used to identify the draggable items within the list.

    > Same as 'listSelector', this option is important if you are using anything other than 'li' for your draggable items

-   **handleSelector** (optional, default: \[data-phl="handle"\]): Defines a custom CSS selector for the handle element that triggers dragging. The handle element is usually a specific part of the list item that users can click and drag to initiate item movement.

-   **threshold** (optional, default: 20): Specifies the distance (in pixels) that the drag movement must exceed before triggering a right or left shift. This helps prevent accidental nesting/unnesting of items.

-   **context** (optional): An optional context object that is used across instances to move item frfom one list into other. By default all instances share the same context, just pass an empty object `{}` to prevent a list from being able to share items.

    To let two lists share elements:

    ```javascript
    const ctx = {};
    HierarchyList.make('#list1-id', {
        // options
        context: ctx,
    });
    HierarchyList.make('#list2-id', {
        // options
        context: ctx,
    });
    ```

-   **expandBtn** (optional, default:\[data-phl="expand"]\): Sets a CSS selector for the element that expands a collapsed nested list. Clicking on this element will show the nested items.

-   **collapseBtn** (optional, default:\[data-phl="collapse"]\): Defines a CSS selector for the element that collapses an expanded nested list. Clicking on this element will hide the nested items.

-   **extractBtn** (optional, default:\[data-phl="extract"]\): Specifies a CSS selector for the element that extracts a nested item from its parent list. This allows users to move all items of an nested list to a higher level in the hierarchy.

-   **listClass** (optional, default: "phl-list"): Sets a CSS class or an array of CSS classes to be applied to the list elements (When created nested lists). This allows you to customize the appearance of the list.

-   **activeClass** (optional, default: "phl-active"): Sets a CSS class or an array of CSS classes to be applied to the active (dragged) item. Applying a distinct style to the active item can provide visual feedback to the user during the dragging process.

-   **dragClass** (optional, default: "phl-drag"): Specifies a CSS class or an array of CSS classes to be applied to the dragged (overlay) item during the dragging process. This allows you to apply a specific style to the item being dragged.

### EventListeners Options:

The EventListeners interface defines various event listener functions that can be assigned to the corresponding events. These functions allow you to customize the behavior of the HierarchyList library based on specific user interactions.

-   **beforeMove** (optional): A function that is called before an item is moved. It receives the item element and its old parent element as parameters. Use this function to perform any necessary actions or validations before the item is moved.

-   **afterMove** (optional): A function that is called after an item is moved. It receives the item element and its new parent element as parameters. This function can be used to handle any post-movement actions or updates.

-   **onStart** (optional): A function that is called when the user starts dragging an item. It receives the item element as a parameter. Use this function to trigger any necessary actions or visual changes when dragging begins.

-   **onRelease** (optional): A function that is called when the user releases the dragged item. It receives the item element as a parameter.

## Caution:

When configuring the HierarchyList library, it's important to use the configuration options correctly to ensure proper functionality. Please note the following considerations:

-   **listSelector**: This option should only be used to specify a CSS selector for the main list element. Ensure that the selector targets only the list element itself and not any child elements or other elements. Using an incorrect or overly broad selector may lead to unexpected behavior.

-   **itemSelector**: Use this option to set a CSS selector specifically for the list item elements. The selector should target the individual list items within the main list. Avoid using selectors that select elements other than the list items, as it may interfere with the library's functionality.

-   **Nested List Structure**: It's important to adhere to the standard structure of nested lists. Each list item should be contained within a `listSelector` element, and the nested list elements should only appear as children of list items. Mixing other elements within the list structure may result in unexpected behavior or rendering issues.

By following these cautionary guidelines, you can ensure that the configuration options are used appropriately and that the HierarchyList library functions correctly with the expected list structure.
