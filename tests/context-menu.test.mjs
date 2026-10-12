import test from 'node:test';
import assert from 'node:assert/strict';
import '../context-menu.js';

function fixture() {
  const doc = { activeElement: null, documentElement: { clientWidth: 393, clientHeight: 852 }, listeners: new Map(), addEventListener(name, callback) { this.listeners.set(name, callback); }, removeEventListener(name) { this.listeners.delete(name); } };
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.attributes = new Map(); this.listeners = new Map(); this.dataset = {}; this.style = {}; this.hidden = false; }
    append(child) { child.parentNode = this; this.children.push(child); }
    remove() { this.parentNode.children = this.parentNode.children.filter((child) => child !== this); this.parentNode = null; }
    replaceChildren() { this.children.forEach((child) => { child.parentNode = null; }); this.children = []; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name); }
    addEventListener(name, callback) { this.listeners.set(name, callback); }
    contains(target) { return this === target || this.children.some((child) => child.contains(target)); }
    querySelectorAll() { return this.children.flatMap((child) => [child, ...child.querySelectorAll()]).filter((child) => child.tagName === 'button' && !child.disabled); }
    getBoundingClientRect() { return { left: 10, top: 50, right: 250, width: 240, height: 160 }; }
    focus() { doc.activeElement = this; }
    click() { if (!this.disabled) this.listeners.get('click')?.({ target: this }); }
    key(key) { this.listeners.get('keydown')?.({ key, target: doc.activeElement, preventDefault() {}, stopPropagation() {} }); }
  }
  doc.createElement = (tag) => new Element(tag); doc.body = new Element('body');
  const actions = [], closed = [];
  const menu = globalThis.KinmoContextMenu.create({ document: doc, onAction: (id) => actions.push(id), onClose: () => closed.push(true), returnFocus: () => { doc.activeElement = null; } });
  const open = () => menu.open({ x: 370, y: 810, title: '<script>literal title</script>', items: [{ label: 'Väzby', items: [{ id: 'disconnect', label: 'Odpojiť' }, { id: 'delete', label: 'Vymazať' }] }, { id: 'disabled', label: 'Chránené', disabled: true }] });
  return { doc, menu, actions, closed, open };
}
test('Submenus live outside the scroll-clipped main menu and their pointerdown does not close them', () => {
  const { doc, menu, open, actions } = fixture(); open();
  menu.element.querySelectorAll()[0].click();
  const submenu = doc.body.children.find((el) => el.className.includes('context-submenu'));
  assert(submenu); assert.equal(submenu.parentNode, doc.body); assert(!menu.element.contains(submenu));
  const action = submenu.querySelectorAll()[0];
  doc.listeners.get('pointerdown')({ target: action }); assert.equal(menu.element.hidden, false);
  action.click(); assert.deepEqual(actions, ['disconnect']); assert.equal(menu.element.hidden, true);
  assert(!doc.body.children.includes(submenu));
});
test('Keyboard opens submenus, skips disabled entries and returns to the owner', () => {
  const { doc, menu, open } = fixture(); open();
  const owner = doc.activeElement;
  menu.element.key('ArrowRight');
  const submenu = doc.body.children.find((el) => el.className.includes('context-submenu'));
  assert.equal(doc.activeElement, submenu.querySelectorAll()[0]);
  submenu.key('ArrowDown'); assert.equal(doc.activeElement, submenu.querySelectorAll()[1]);
  submenu.key('ArrowLeft'); assert.equal(doc.activeElement, owner); assert(!doc.body.children.includes(submenu));
  menu.element.key('Escape'); assert(menu.element.hidden);
});
test('Outside clicks close both menus; touch hover does not unexpectedly open a submenu', () => {
  const { doc, menu, open } = fixture(); open();
  const owner = doc.activeElement;
  owner.listeners.get('pointerenter')({ pointerType: 'touch' }); assert.equal(doc.body.children.length, 1);
  owner.listeners.get('pointerenter')({ pointerType: 'mouse' }); assert.equal(doc.body.children.length, 2);
  doc.listeners.get('pointerdown')({ target: doc.body }); assert(menu.element.hidden); assert.equal(doc.body.children.length, 1);
  menu.destroy(); assert.equal(doc.body.children.length, 0); assert(!doc.listeners.has('pointerdown'));
});
