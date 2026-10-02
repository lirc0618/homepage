import { mkdtempSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const run = (command, args, cwd = root) => execFileSync(command, args, { cwd, stdio: 'inherit' });
run('npm', ['run', 'build']);
const directory = mkdtempSync(join(tmpdir(), 'lircos-pages-'));
try {
  cpSync(join(root, 'dist'), directory, { recursive: true });
  writeFileSync(join(directory, '.nojekyll'), '');
  run('git', ['init', '-b', 'gh-pages'], directory);
  run('git', ['config', 'user.name', 'lirc0618'], directory);
  run('git', ['config', 'user.email', '177515118+lirc0618@users.noreply.github.com'], directory);
  run('git', ['remote', 'add', 'origin', 'https://github.com/lirc0618/homepage.git'], directory);
  run('git', ['fetch', 'origin', 'gh-pages'], directory);
  // Keep the previous publication as the parent so publishing never needs force push.
  run('git', ['reset', '--soft', 'FETCH_HEAD'], directory);
  run('git', ['add', '-A'], directory);
  run('git', ['commit', '--allow-empty', '-m', 'Publish homepage'], directory);
  run('git', ['push', 'origin', 'HEAD:gh-pages'], directory);
  console.log('已上传发布文件，请等待 GitHub Pages 部署完成：https://lirc0618.github.io/homepage/');
} finally {
  rmSync(directory, { recursive: true, force: true });
}
