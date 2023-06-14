import './styles.css';
import HierarchyList, { makeListItem } from '../src/hierarchy-list';

const app1 = document.querySelector('#app1') as HTMLElement;
const display1Flat = document.querySelector('#flat-1') as HTMLElement;
const display1Tree = document.querySelector('#tree-1') as HTMLElement;

const app2 = document.querySelector('#app2') as HTMLElement;
const display2Flat = document.querySelector('#flat-2') as HTMLElement;
const display2Tree = document.querySelector('#tree-2') as HTMLElement;


let maxOfOne = 0;

for (let i = 0; i < 10; i++) {
    maxOfOne = i + 1;
    const item = makeListItem(`Item ${maxOfOne}`, {
        index: maxOfOne.toString()
    });
    app1.appendChild(item);
    app2.appendChild(item.cloneNode(true));
}

const list1 = HierarchyList.make(app1).on('change', onChange1);

onChange1.call(list1);

onChange2.call(
    HierarchyList.make(app2).on('change', onChange2)
);

function onChange1(this: HierarchyList) {
    display1Flat.innerHTML = JSON.stringify(this.serialize((el) => {
        const data = {...el.dataset};
        data.label = el.querySelector('.phl-label')?.innerHTML;
        return data;
    }), null, 2);
    display1Tree.innerHTML = JSON.stringify(this.serializeTree(), null, 2);
    console.log("Fired 1");
    
}

function onChange2(this: HierarchyList) {
    display2Flat.innerHTML = JSON.stringify(this.serialize(), null, 2);
    display2Tree.innerHTML = JSON.stringify(this.serializeTree(), null, 2);
    console.log("Fired 2");
}


document.getElementById('add-item')?.addEventListener('click', () => {
    maxOfOne++;
    const item = makeListItem(`Item ${maxOfOne}`, {
        index: maxOfOne.toString()
    });
    list1.addItem(item);
})