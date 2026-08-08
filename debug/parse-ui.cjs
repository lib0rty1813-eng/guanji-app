// 解析 uiautomator dump：打印可点击元素 / 指定文本元素的 text+bounds
const fs = require('fs');
const file = process.argv[2];
const onlyClickable = process.argv[3] === 'clickable';
const s = fs.readFileSync(file, 'utf8');
const re = /<node[^>]*?text="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*?(?:clickable="(\w+)")?[^>]*?\/?>/g;
let m;
while ((m = re.exec(s))) {
  const text = m[1];
  const clickable = m[6] === 'true';
  if (!text && !clickable) continue;
  if (onlyClickable && !clickable) continue;
  console.log(`${clickable ? '[TAP]' : '     '} "${text}" ${[m[2], m[3], m[4], m[5]].join(',')}`);
}
