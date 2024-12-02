path = require('path');

module.exports = {
  process(sourceText, sourcePath, options) {


    const filename = sourcePath;
    return {
      code: `module.exports = "${filename}";`,
    };
  },
};