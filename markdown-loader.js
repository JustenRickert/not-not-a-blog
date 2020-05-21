"use strict";

const marked = require("marked");
const loaderUtils = require("loader-utils");

const markdownRenderer = new class MarkdownRenderer extends marked.Renderer {
  paragraph(text) {
    // Object.entries(CustomString).forEach(([name, symbol]) => {
    //   text = text.replace(new RegExp(`{${name}} *`, "g"), symbol);
    // });
    text = text.replace(/---/g, "—"); // emdash
    text = text.replace(/--/g, "–"); // endash
    return "<p>" + text + "<p>\n";
  }
}();

module.exports = function(markdown) {
  this.cacheable();

  marked.setOptions({
    pedantic: true,
    renderer: markdownRenderer
  });

  const options = {};
  let code = marked(markdown)
    .replace(/[\n]*/g, "")
    .replace(/{{.*}}/g, optionKey => {
      optionKey = optionKey.slice(2, -2);
      options[optionKey] = true;
      return `\` + innerOptions.${optionKey} + \``;
    });

  if (Object.keys(options).length) {
    return `
module.exports = innerOptions => {
  const possibleOptions = [${Object.keys(options)
    .map(o => `'${o}'`)
    .join(",")}]
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
