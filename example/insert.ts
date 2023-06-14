import './styles.css';
import HierarchyList, { makeListItem } from '../src/hierarchy-list';

const app = document.querySelector('#list') as HTMLElement;

let maxOfOne = 0;

for (let i = 0; i < 10; i++) {
    app.appendChild(
        makeListItem(`Item ${i}`, {
            index: i.toString(),
        })
    );
    maxOfOne = i;
}

const list1 = HierarchyList.make(app);

document.querySelectorAll('#btns button').forEach((btn: any) => {
    btn.addEventListener('click', () => {
        maxOfOne++;
        list1.addItem(
            makeListItem(`Item ${maxOfOne}`, {
                index: maxOfOne.toString(),
            }),
            btn.dataset
        );
    });
});
