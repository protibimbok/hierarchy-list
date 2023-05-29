import './styles.css';
import HierarchyList from '../src/hierarchy-list';

const app1 = document.querySelector('#app1') as HTMLElement;
const display1Flat = document.querySelector('#flat-1') as HTMLElement;
const display1Tree = document.querySelector('#tree-1') as HTMLElement;

const app2 = document.querySelector('#app2') as HTMLElement;
const display2Flat = document.querySelector('#flat-2') as HTMLElement;
const display2Tree = document.querySelector('#tree-2') as HTMLElement;

const template = document.querySelector('template') as HTMLTemplateElement;
const itemMain = template.content.querySelector('.phl-item') as HTMLLIElement;

for (let i = 0; i < 10; i++) {
    const item = itemMain.cloneNode(true) as HTMLLIElement;
    //@ts-ignore
    item.querySelector('.phl-label').innerHTML = `Item ${i + 1}`;

    item.setAttribute('data-index', i.toString());
    item.dataset['index2'] = i.toString();
    item.dataset.index3 = i.toString();

    app1.appendChild(item);
    app2.appendChild(item.cloneNode(true));
}

onChange1.call(
    HierarchyList.make(app1).on('change', onChange1)
);
onChange2.call(
    HierarchyList.make(app2).on('change', onChange2)
);

function onChange1(this: HierarchyList) {
    display1Flat.innerHTML = JSON.stringify(this.serialize(), null, 2);
    display1Tree.innerHTML = JSON.stringify(this.serializeTree(), null, 2);
    console.log("Fired 1");
    
}

function onChange2(this: HierarchyList) {
    display2Flat.innerHTML = JSON.stringify(this.serialize(), null, 2);
    display2Tree.innerHTML = JSON.stringify(this.serializeTree(), null, 2);
    console.log("Fired 2");
}
