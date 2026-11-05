import assert from 'node:assert/strict';
import test from 'node:test';
import {
  foundationTopicSidebarItemTone,
  foundationTopicSidebarListSpacing,
} from '../utils/foundationTopicSidebarStyle.ts';

test('unselected foundation topics have a soft surface and visible boundary', () => {
  const classes = foundationTopicSidebarItemTone(false).split(' ');
  assert.ok(classes.includes('bg-slate-50'));
  assert.ok(classes.includes('border-slate-200'));
  assert.ok(classes.includes('hover:bg-slate-100'));
});

test('selected foundation topics keep the existing indigo emphasis', () => {
  const classes = foundationTopicSidebarItemTone(true).split(' ');
  assert.ok(classes.includes('bg-indigo-50'));
  assert.ok(classes.includes('border-indigo-100'));
  assert.ok(!classes.includes('bg-slate-50'));
});

test('foundation topics have a clear gap between adjacent items', () => {
  assert.equal(foundationTopicSidebarListSpacing, 'space-y-2');
});
