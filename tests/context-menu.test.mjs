import test from 'node:test';
import assert from 'node:assert/strict';
import '../context-menu.js';

function fixture(width = 1440) {
  const doc = { activeElement: null, documentElement: { clientWidth: width, clientHeight: 852 }, listeners: new Map(), addEventListener(name, callback) { this.listeners.set(name, callback); }, removeEventListener(name) { this.listeners.delete(name); } };
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.attributes = new Map(); this.listeners = new Map(); this.dataset = {}; this.style = {}; this.hidden = false; }
    append(child) { child.parentNode = this; this.children.push(child); }
    remove() { this.parentNode.children = this.parentNode.children.filter((child) => child !== this); this.parentNode = null; }
    replaceChildren() { this.children.forEach((child) => { child.parentNode = null; }); this.children = []; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name); }
    addEventListener(name, callback) { this.listeners.set(name, callback); }
    contains(target) { return this === target || this.children.some((child) => child.contains(target)); }
    querySelectorAll(selector) { const walk = e => e.children.flatMap(child => [child, ...walk(child)]); return walk(this).filter(child => child.tagName === 'button' && !child.disabled && (selector || child.getAttribute('role') === 'menuitem')); }
    getBoundingClientRect() { return { left: 10, top: 50, right: 250, width: 240, height: 160 }; }
    focus() { doc.activeElement = this; }
    click() { if (!this.disabled) this.listeners.get('click')?.({ target: this }); }
    key(key) { this.listeners.get('keydown')?.({ key, target: doc.activeElement, preventDefault() {}, stopPropagation() {} }); }
  }
  const events = () => ({ listeners: new Map(), addEventListener(name, callback) { this.listeners.set(name, callback); }, removeEventListener(name) { this.listeners.delete(name); } });
  doc.defaultView = events(); doc.defaultView.visualViewport = events();
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
  action.listeners.get('pointerenter')?.({ pointerType: 'mouse' });
  assert(doc.body.children.includes(submenu), 'hovering a submenu action must keep it open');
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

test('Narrow screens navigate submenus within one popup, with Back and explicit Close', () => {
  const { doc, menu, open, actions } = fixture(393); open();
  const owner = doc.activeElement;
  owner.listeners.get('pointerenter')({ pointerType: 'mouse' }); assert.equal(doc.body.children.length, 1);
  owner.click(); assert.equal(doc.body.children.length, 1);
  assert.equal(doc.activeElement.dataset.contextAction, 'disconnect');
  const back = menu.element.querySelectorAll('button').find(b => b.getAttribute('aria-label') === 'Späť do predchádzajúcej ponuky');
  assert(back); back.click(); assert.equal(doc.activeElement.getAttribute('aria-haspopup'), 'menu');
  doc.activeElement.click(); menu.element.key('ArrowLeft'); assert.equal(doc.activeElement.getAttribute('aria-haspopup'), 'menu');
  doc.activeElement.click(); doc.activeElement.click(); assert.deepEqual(actions, ['disconnect']); assert(menu.element.hidden);
  open(); menu.element.querySelectorAll('button').find(b => b.getAttribute('aria-label') === 'Zavrieť ponuku').click(); assert(menu.element.hidden);
});

test('Resize and visual viewport changes dismiss menus and release listeners on destroy', () => {
  const { doc, menu, open } = fixture(); open(); doc.activeElement.click();
  doc.defaultView.listeners.get('resize')(); assert(menu.element.hidden); assert.equal(doc.body.children.length, 1);
  doc.defaultView.visualViewport.height = 300; open(); assert.equal(menu.element.style.maxHeight, '284px');
  doc.defaultView.visualViewport.listeners.get('scroll')(); assert(menu.element.hidden);
  open(); doc.defaultView.visualViewport.listeners.get('resize')(); assert(menu.element.hidden);
  menu.destroy(); assert.equal(doc.defaultView.listeners.size, 0); assert.equal(doc.defaultView.visualViewport.listeners.size, 0);
});
