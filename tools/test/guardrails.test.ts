// Порядок работы (ADR студии 0018, 0019, 0022): APK — только по тегу, проверки PR — на каждом PR,
// имя проверки — то, что ждёт автослияние; CI, подпись и проверки APK — из набора gornitsa-kit;
// во всех заданиях — ubuntu-24.04; плагин подписи встаёт в шаблон Gradle.
import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

const root = join(import.meta.dir, '..', '..');
const read = (f: string) => readFileSync(join(root, f), 'utf8');
const wf = (f: string) => YAML.parse(read(`.github/workflows/${f}`));

describe('workflow', () => {
  test('везде ubuntu-24.04; задания набора выбирают машину сами', () => {
    for (const f of readdirSync(join(root, '.github/workflows'))) {
      for (const [job, def] of Object.entries<{ 'runs-on'?: string; uses?: string }>(wf(f).jobs)) {
        if (def.uses) continue;
        expect({ f, job, runsOn: def['runs-on'] }).toEqual({ f, job, runsOn: 'ubuntu-24.04' });
      }
    }
  });

  test('APK — только по тегу v*, без ручного запуска', () => {
    expect(wf('android.yml').on).toEqual({ push: { tags: ['v*'] } });
  });

  test('проверки PR — на каждом PR, имя проверки — то, что ждёт автослияние', () => {
    const pr = wf('pr.yml');
    expect(pr.on.pull_request['paths-ignore']).toBeUndefined();
    const am = wf('automerge.yml');
    expect(am.jobs.automerge.uses).toBe('Nefeste/gornitsa-kit/.github/workflows/automerge.yml@v1');
    expect(am.jobs.automerge.with.check).toBe(pr.jobs.checks.name);
    expect(am.on.workflow_run.workflows).toEqual([pr.name]);
  });

  test('ключ, подпись и содержимое APK — действия набора; без сети', () => {
    const steps: { uses?: string; with?: Record<string, string> }[] = wf('android.yml').jobs.build.steps;
    const kit = (name: string) => steps.find(s => s.uses === `Nefeste/gornitsa-kit/actions/${name}@v1`);
    expect(kit('android-keystore')?.with?.['gradle-prefix']).toBe('SHELTER');
    expect(kit('android-signature')).toBeDefined();
    expect(kit('android-contents')?.with?.forbid).toContain('INTERNET');
    expect(wf('rustore.yml').jobs.upload.with.package).toBe(JSON.parse(read('app.json')).expo.android.package);
  });
});

describe('плагины сборки', () => {
  test('подпись релиза встаёт в шаблон build.gradle и не встаёт дважды', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { addReleaseSigning } = require('../../plugins/with-release-signing.js') as { addReleaseSigning: (g: string) => string };
    const gradle = 'android {\n    signingConfigs {\n        debug {\n        }\n    }\n    buildTypes {\n        release {\n            signingConfig signingConfigs.debug\n        }\n    }\n}\n';
    const once = addReleaseSigning(gradle);
    expect(once).toContain('SHELTER_UPLOAD_STORE_FILE');
    expect(addReleaseSigning(once)).toBe(once);
  });

  test('идентификатор приложения — навсегда games.gornitsa.shelter (ADR студии 0006)', () => {
    expect(JSON.parse(read('app.json')).expo.android.package).toBe('games.gornitsa.shelter');
  });
});
