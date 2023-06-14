import './styles.css';
import HierarchyList from '../src/hierarchy-list';

const app = document.querySelector('#list') as HTMLElement;

const template = document.querySelector('template') as HTMLTemplateElement;
const itemMain = template.content.querySelector('.phl-item') as HTMLLIElement;

let maxOfOne = 0;

for (let i = 0; i < 10; i++) {
    const item = itemMain.cloneNode(true) as HTMLLIElement;
    //@ts-ignore
    item.querySelector('.phl-label').innerHTML = `Item ${i}`;

    item.setAttribute('data-index', i.toString());
    item.dataset['index2'] = i.toString();
    item.dataset.index3 = i.toString();

    app.appendChild(item);
    maxOfOne = i;
}

const list1 = HierarchyList.make(app);


document.querySelectorAll('#btns button').forEach((btn: any) => {
    btn.addEventListener('click', () => {
        maxOfOne++;
        const item = itemMain.cloneNode(true) as HTMLLIElement;
        //@ts-ignore
        item.querySelector('.phl-label').innerHTML = `Item ${maxOfOne + 1}`;
    
        item.setAttribute('data-index', maxOfOne.toString());
        list1.addItem(item, btn.dataset);
    });
})