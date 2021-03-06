import { moduleFor, RenderingTestCase, strip, runTask } from 'internal-test-helpers';

import { get, set } from '@ember/-internals/metal';
import { A as emberA, ObjectProxy, removeAt } from '@ember/-internals/runtime';

import { IfUnlessWithSyntaxTest } from '../../utils/shared-conditional-tests';

moduleFor(
  'Syntax test: {{#with}}',
  class extends IfUnlessWithSyntaxTest {
    beforeEach() {
      expectDeprecation(/^`{{#with}}` is deprecated\./);
    }

    templateFor({ cond, truthy, falsy }) {
      return `{{#with ${cond}}}${truthy}{{else}}${falsy}{{/with}}`;
    }
  }
);

moduleFor(
  'Syntax test: {{#with as}}',
  class extends IfUnlessWithSyntaxTest {
    beforeEach() {
      expectDeprecation(/^`{{#with}}` is deprecated\./);
    }

    templateFor({ cond, truthy, falsy }) {
      return `{{#with ${cond} as |test|}}${truthy}{{else}}${falsy}{{/with}}`;
    }

    ['@test keying off of `undefined` does not render']() {
      this.render(
        strip`
      {{#with this.foo.bar.baz as |thing|}}
        {{thing}}
      {{/with}}`,
        { foo: {} }
      );

      this.assertText('');

      runTask(() => this.rerender());

      this.assertText('');

      runTask(() => set(this.context, 'foo', { bar: { baz: 'Here!' } }));

      this.assertText('Here!');

      runTask(() => set(this.context, 'foo', {}));

      this.assertText('');
    }

    ['@test it renders and hides the given block based on the conditional']() {
      this.render(`{{#with this.cond1 as |cond|}}{{cond.greeting}}{{else}}False{{/with}}`, {
        cond1: { greeting: 'Hello' },
      });

      this.assertText('Hello');

      runTask(() => this.rerender());

      this.assertText('Hello');

      runTask(() => set(this.context, 'cond1.greeting', 'Hello world'));

      this.assertText('Hello world');

      runTask(() => set(this.context, 'cond1', false));

      this.assertText('False');

      runTask(() => set(this.context, 'cond1', { greeting: 'Hello' }));

      this.assertText('Hello');
    }

    ['@test can access alias and original scope']() {
      this.render(`{{#with this.person as |tom|}}{{this.title}}: {{tom.name}}{{/with}}`, {
        title: 'Se??or Engineer',
        person: { name: 'Tom Dale' },
      });

      this.assertText('Se??or Engineer: Tom Dale');

      runTask(() => this.rerender());

      this.assertText('Se??or Engineer: Tom Dale');

      runTask(() => {
        set(this.context, 'person.name', 'Yehuda Katz');
        set(this.context, 'title', 'Principal Engineer');
      });

      this.assertText('Principal Engineer: Yehuda Katz');

      runTask(() => {
        set(this.context, 'person', { name: 'Tom Dale' });
        set(this.context, 'title', 'Se??or Engineer');
      });

      this.assertText('Se??or Engineer: Tom Dale');
    }

    ['@test the scoped variable is not available outside the {{#with}} block.']() {
      expectDeprecation(
        /The `[^`]+` property(?: path)? was used in a template for the `[^`]+` component without using `this`. This fallback behavior has been deprecated, all properties must be looked up on `this` when used in the template: {{[^}]+}}/
      );

      this.render(`{{name}}-{{#with this.other as |name|}}{{name}}{{/with}}-{{name}}`, {
        name: 'Stef',
        other: 'Yehuda',
      });

      this.assertText('Stef-Yehuda-Stef');

      runTask(() => this.rerender());

      this.assertText('Stef-Yehuda-Stef');

      runTask(() => set(this.context, 'other', 'Chad'));

      this.assertText('Stef-Chad-Stef');

      runTask(() => set(this.context, 'name', 'Tom'));

      this.assertText('Tom-Chad-Tom');

      runTask(() => {
        set(this.context, 'name', 'Stef');
        set(this.context, 'other', 'Yehuda');
      });

      this.assertText('Stef-Yehuda-Stef');
    }

    ['@test inverse template is displayed with context']() {
      this.render(
        `{{#with this.falsyThing as |thing|}}Has Thing{{else}}No Thing {{this.otherThing}}{{/with}}`,
        {
          falsyThing: null,
          otherThing: 'bar',
        }
      );

      this.assertText('No Thing bar');

      runTask(() => this.rerender());

      this.assertText('No Thing bar');

      runTask(() => set(this.context, 'otherThing', 'biz'));

      this.assertText('No Thing biz');

      runTask(() => set(this.context, 'falsyThing', true));

      this.assertText('Has Thing');

      runTask(() => set(this.context, 'otherThing', 'baz'));

      this.assertText('Has Thing');

      runTask(() => {
        set(this.context, 'otherThing', 'bar');
        set(this.context, 'falsyThing', null);
      });

      this.assertText('No Thing bar');
    }

    ['@test can access alias of a proxy']() {
      this.render(`{{#with this.proxy as |person|}}{{person.name}}{{/with}}`, {
        proxy: ObjectProxy.create({ content: { name: 'Tom Dale' } }),
      });

      this.assertText('Tom Dale');

      runTask(() => this.rerender());

      this.assertText('Tom Dale');

      runTask(() => set(this.context, 'proxy.name', 'Yehuda Katz'));

      this.assertText('Yehuda Katz');

      runTask(() => set(this.context, 'proxy.content', { name: 'Godfrey Chan' }));

      this.assertText('Godfrey Chan');

      runTask(() => set(this.context, 'proxy.content.name', 'Stefan Penner'));

      this.assertText('Stefan Penner');

      runTask(() => set(this.context, 'proxy.content', null));

      this.assertText('');

      runTask(() =>
        set(this.context, 'proxy', ObjectProxy.create({ content: { name: 'Tom Dale' } }))
      );

      this.assertText('Tom Dale');
    }

    ['@test can access alias of an array']() {
      this.render(
        `{{#with this.arrayThing as |words|}}{{#each words as |word|}}{{word}}{{/each}}{{/with}}`,
        {
          arrayThing: emberA(['Hello', ' ', 'world']),
        }
      );

      this.assertText('Hello world');

      runTask(() => this.rerender());

      this.assertText('Hello world');

      runTask(() => {
        let array = get(this.context, 'arrayThing');
        array.replace(0, 1, ['Goodbye']);
        removeAt(array, 1);
        array.insertAt(1, ', ');
        array.pushObject('!');
      });

      this.assertText('Goodbye, world!');

      runTask(() => set(this.context, 'arrayThing', ['Hello', ' ', 'world']));

      this.assertText('Hello world');
    }

    ['@test `attrs` can be used as a block param [GH#14678]']() {
      this.render('{{#with this.hash as |attrs|}}[{{this.hash.foo}}-{{attrs.foo}}]{{/with}}', {
        hash: { foo: 'foo' },
      });

      this.assertText('[foo-foo]');

      runTask(() => this.rerender());

      this.assertText('[foo-foo]');

      runTask(() => this.context.set('hash.foo', 'FOO'));

      this.assertText('[FOO-FOO]');

      runTask(() => this.context.set('hash.foo', 'foo'));

      this.assertText('[foo-foo]');
    }
  }
);

moduleFor(
  'Syntax test: Multiple {{#with as}} helpers',
  class extends RenderingTestCase {
    beforeEach() {
      expectDeprecation(/^`{{#with}}` is deprecated\./);
    }

    ['@test re-using the same variable with different {{#with}} blocks does not override each other']() {
      this.render(
        `Admin: {{#with this.admin as |person|}}{{person.name}}{{/with}} User: {{#with this.user as |person|}}{{person.name}}{{/with}}`,
        {
          admin: { name: 'Tom Dale' },
          user: { name: 'Yehuda Katz' },
        }
      );

      this.assertText('Admin: Tom Dale User: Yehuda Katz');

      runTask(() => this.rerender());

      this.assertText('Admin: Tom Dale User: Yehuda Katz');

      runTask(() => {
        set(this.context, 'admin.name', 'Godfrey Chan');
        set(this.context, 'user.name', 'Stefan Penner');
      });

      this.assertText('Admin: Godfrey Chan User: Stefan Penner');

      runTask(() => {
        set(this.context, 'admin', { name: 'Tom Dale' });
        set(this.context, 'user', { name: 'Yehuda Katz' });
      });

      this.assertText('Admin: Tom Dale User: Yehuda Katz');
    }

    ['@test the scoped variable is not available outside the {{#with}} block']() {
      expectDeprecation(
        /The `[^`]+` property(?: path)? was used in a template for the `[^`]+` component without using `this`. This fallback behavior has been deprecated, all properties must be looked up on `this` when used in the template: {{[^}]+}}/
      );

      this.render(
        `{{ring}}-{{#with this.first as |ring|}}{{ring}}-{{#with this.fifth as |ring|}}{{ring}}-{{#with this.ninth as |ring|}}{{ring}}-{{/with}}{{ring}}-{{/with}}{{ring}}-{{/with}}{{ring}}`,
        {
          ring: 'Greed',
          first: 'Limbo',
          fifth: 'Wrath',
          ninth: 'Treachery',
        }
      );

      this.assertText('Greed-Limbo-Wrath-Treachery-Wrath-Limbo-Greed');

      runTask(() => this.rerender());

      this.assertText('Greed-Limbo-Wrath-Treachery-Wrath-Limbo-Greed');

      runTask(() => {
        set(this.context, 'ring', 'O');
        set(this.context, 'fifth', 'D');
      });

      this.assertText('O-Limbo-D-Treachery-D-Limbo-O');

      runTask(() => {
        set(this.context, 'first', 'I');
        set(this.context, 'ninth', 'K');
      });

      this.assertText('O-I-D-K-D-I-O');

      runTask(() => {
        set(this.context, 'ring', 'Greed');
        set(this.context, 'first', 'Limbo');
        set(this.context, 'fifth', 'Wrath');
        set(this.context, 'ninth', 'Treachery');
      });

      this.assertText('Greed-Limbo-Wrath-Treachery-Wrath-Limbo-Greed');
    }

    ['@test it should support {{#with name as |foo|}}, then {{#with foo as |bar|}}']() {
      this.render(`{{#with this.name as |foo|}}{{#with foo as |bar|}}{{bar}}{{/with}}{{/with}}`, {
        name: 'caterpillar',
      });

      this.assertText('caterpillar');

      runTask(() => this.rerender());

      this.assertText('caterpillar');

      runTask(() => set(this.context, 'name', 'butterfly'));

      this.assertText('butterfly');

      runTask(() => set(this.context, 'name', 'caterpillar'));

      this.assertText('caterpillar');
    }

    ['@test updating the context should update the alias']() {
      this.render(`{{#with this as |person|}}{{person.name}}{{/with}}`, {
        name: 'Los Pivots',
      });

      this.assertText('Los Pivots');

      runTask(() => this.rerender());

      this.assertText('Los Pivots');

      runTask(() => set(this.context, 'name', "l'Pivots"));

      this.assertText("l'Pivots");

      runTask(() => set(this.context, 'name', 'Los Pivots'));

      this.assertText('Los Pivots');
    }

    ['@test nested {{#with}} blocks should have access to root context']() {
      expectDeprecation(
        /The `[^`]+` property(?: path)? was used in a template for the `[^`]+` component without using `this`. This fallback behavior has been deprecated, all properties must be looked up on `this` when used in the template: {{[^}]+}}/
      );

      this.render(
        strip`
      {{name}}
      {{#with this.committer1.name as |name|}}
        [{{name}}
        {{#with this.committer2.name as |name|}}
          [{{name}}]
        {{/with}}
        {{name}}]
      {{/with}}
      {{name}}
      {{#with this.committer2.name as |name|}}
        [{{name}}
        {{#with this.committer1.name as |name|}}
          [{{name}}]
        {{/with}}
        {{name}}]
      {{/with}}
      {{name}}
    `,
        {
          name: 'ebryn',
          committer1: { name: 'trek' },
          committer2: { name: 'machty' },
        }
      );

      this.assertText('ebryn[trek[machty]trek]ebryn[machty[trek]machty]ebryn');

      runTask(() => this.rerender());

      this.assertText('ebryn[trek[machty]trek]ebryn[machty[trek]machty]ebryn');

      runTask(() => set(this.context, 'name', 'chancancode'));

      this.assertText('chancancode[trek[machty]trek]chancancode[machty[trek]machty]chancancode');

      runTask(() => set(this.context, 'committer1', { name: 'krisselden' }));

      this.assertText(
        'chancancode[krisselden[machty]krisselden]chancancode[machty[krisselden]machty]chancancode'
      );

      runTask(() => {
        set(this.context, 'committer1.name', 'wycats');
        set(this.context, 'committer2', { name: 'rwjblue' });
      });

      this.assertText(
        'chancancode[wycats[rwjblue]wycats]chancancode[rwjblue[wycats]rwjblue]chancancode'
      );

      runTask(() => {
        set(this.context, 'name', 'ebryn');
        set(this.context, 'committer1', { name: 'trek' });
        set(this.context, 'committer2', { name: 'machty' });
      });

      this.assertText('ebryn[trek[machty]trek]ebryn[machty[trek]machty]ebryn');
    }
  }
);
