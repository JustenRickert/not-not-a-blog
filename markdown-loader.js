"use strict";

const marked = require("marked");

module.exports = function(markdown) {
  this.cacheable();

  marked.setOptions({
    pedantic: true,
    smartypants: true
  });

  const options = {};
  let code = marked(markdown)
    .replace(/[\n]*/g, "")
    .replace(/{{\w*}}/g, optionKey => {
      optionKey = optionKey.slice(2, -2);
      options[optionKey] = true;
      return `\` + innerOptions.${optionKey} + \``;
    });

  if (Object.keys(options).length) {
    return `
module.exports = innerOptions => {
  const possibleOptions = [${Object.keys(options)
    .map(o => `'${o}'`)
    .join(",")}];
  if (!possibleOptions.every(po => Object.keys(innerOptions).some(io => po === io)))
    throw new Error(
      'Missing option, need '
        + possibleOptions.map(po => "'" + po + "'").join(',')
        + ', received '
        + Object.keys(innerOptions).map(io => "'" + io + "'").join(',')
    );
  return \`${code}\`;
}
`;
  }

  return `module.exports = \`${code}\`;`;
};
